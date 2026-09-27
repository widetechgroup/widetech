import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { describeDevice } from "@/lib/devices";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { LogOut, RefreshCw, Search } from "lucide-react";

type Log = { id: string; actor_id: string | null; action: string; table_name: string; record_id: string | null; details: Record<string, unknown> | null; created_at: string };
type Prof = { id: string; full_name: string; email: string };
type Session = { id: string; user_id: string; created_at: string; updated_at: string | null; refreshed_at: string | null; user_agent: string | null; ip: string | null; not_after: string | null };

const MODULES: Record<string, string> = {
  service_requests: "Requests", quotations: "Quotes", projects: "Projects", user_roles: "Roles", user_custom_roles: "Roles",
  roles: "Roles", role_permissions: "Permissions", user_permission_grants: "Permissions", app_modules: "Modules",
  profiles: "Users", company_settings: "Settings", services: "Services", consultations: "Consultations",
  support_tickets: "Customer service", media_assets: "Media", request_files: "Files", auth_sessions: "Security",
};
const ACTION_LABEL: Record<string, string> = { insert: "Added", update: "Updated", delete: "Removed", revoke_sessions: "Signed out" };
const SECURITY_TABLES = ["user_roles", "user_custom_roles", "roles", "role_permissions", "user_permission_grants", "app_modules", "auth_sessions", "profiles"];
const PERIODS = [["today", "Today"], ["yesterday", "Yesterday"], ["7", "7 days"], ["30", "30 days"], ["custom", "Custom"]] as const;
const sel = "min-h-[40px] rounded-lg border border-border bg-background/60 px-2 text-sm text-foreground";

function range(period: string, from: string, to: string): [Date, Date] {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(); end.setHours(23, 59, 59, 999);
  if (period === "yesterday") { start.setDate(start.getDate() - 1); end.setDate(end.getDate() - 1); }
  else if (period === "7" || period === "30") start.setDate(start.getDate() - Number(period) + 1);
  else if (period === "custom") return [from ? new Date(from) : new Date(0), to ? new Date(to + "T23:59:59") : end];
  return [start, end];
}

function fmt(v: unknown) {
  if (v === null || v === undefined) return "—";
  return typeof v === "object" ? JSON.stringify(v) : String(v);
}

export function SecurityCenter({ view }: { view: "activity" | "security" | "sessions" }) {
  if (view === "sessions") return <Sessions />;
  return <AuditLog securityOnly={view === "security"} />;
}

function useProfiles() {
  const [map, setMap] = useState<Record<string, Prof>>({});
  useEffect(() => {
    supabase.from("profiles").select("id,full_name,email").then(({ data }) =>
      setMap(Object.fromEntries((data ?? []).map((p) => [p.id, p as Prof]))));
  }, []);
  return map;
}

function AuditLog({ securityOnly }: { securityOnly: boolean }) {
  const people = useProfiles();
  const [logs, setLogs] = useState<Log[]>([]);
  const [period, setPeriod] = useState("7");
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const [mod, setMod] = useState(""); const [action, setAction] = useState(""); const [actor, setActor] = useState("");
  const [q, setQ] = useState(""); const [open, setOpen] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const [s, e] = range(period, from, to);
    let query = supabase.from("audit_logs").select("*").gte("created_at", s.toISOString()).lte("created_at", e.toISOString())
      .order("created_at", { ascending: false }).limit(500);
    if (securityOnly) query = query.in("table_name", SECURITY_TABLES);
    if (action) query = query.eq("action", action);
    if (actor) query = query.eq("actor_id", actor);
    const { data, error } = await query;
    setLoading(false);
    if (error) return void toast.error(error.message);
    setLogs((data ?? []) as Log[]);
  };

  useEffect(() => { load(); }, [period, from, to, action, actor, securityOnly]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const ch = supabase.channel(`audit-${securityOnly}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "audit_logs" }, () => load()).subscribe();
    const t = setInterval(load, 60000);
    return () => { supabase.removeChannel(ch); clearInterval(t); };
  }, [period, from, to, action, actor, securityOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  const name = (id: string | null | undefined) => (id ? people[id]?.full_name || people[id]?.email || "Unknown user" : "System");
  const rows = useMemo(() => logs.filter((l) => {
    if (mod && (MODULES[l.table_name] ?? l.table_name) !== mod) return false;
    if (!q) return true;
    const hay = `${name(l.actor_id)} ${l.action} ${l.table_name} ${JSON.stringify(l.details)} ${name(l.details?.user_id as string)}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  }), [logs, mod, q, people]); // eslint-disable-line react-hooks/exhaustive-deps

  const actors = Array.from(new Set(logs.map((l) => l.actor_id).filter(Boolean))) as string[];
  const modules = Array.from(new Set(Object.values(MODULES)));

  const exportCsv = () => {
    const lines = [["Time", "User", "Action", "Module", "Record", "Target user", "Details"].join(",")].concat(rows.map((l) =>
      [l.created_at, name(l.actor_id), l.action, MODULES[l.table_name] ?? l.table_name, l.record_id ?? "", l.details?.user_id ? name(l.details.user_id as string) : "", JSON.stringify(l.details ?? {})]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    a.download = `widetech-${securityOnly ? "security" : "activity"}-log.csv`; a.click();
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">{securityOnly ? "Security log" : "Activity center"}</h2>
        <p className="text-sm text-muted-foreground">
          {securityOnly ? "Role, permission, account and sign-in changes. Records can't be edited or deleted." : "Every change across the system, updating live."}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {PERIODS.map(([k, l]) => (
          <Button key={k} size="sm" variant={period === k ? "default" : "outline"} onClick={() => setPeriod(k)}>{l}</Button>
        ))}
        {period === "custom" && (<>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-auto" />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-auto" />
        </>)}
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search activity…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" />
        </div>
        <select className={sel} value={actor} onChange={(e) => setActor(e.target.value)}>
          <option value="">All users</option>
          {actors.map((a) => <option key={a} value={a}>{name(a)}</option>)}
        </select>
        <select className={sel} value={mod} onChange={(e) => setMod(e.target.value)}>
          <option value="">All sections</option>
          {modules.map((m) => <option key={m}>{m}</option>)}
        </select>
        <select className={sel} value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="">All actions</option>
          {Object.entries(ACTION_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{loading ? "Loading…" : `${rows.length} events`}</span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={load}><RefreshCw className="mr-1 h-4 w-4" />Refresh</Button>
          <Button size="sm" variant="outline" onClick={exportCsv} disabled={!rows.length}>Export</Button>
        </div>
      </div>
      <div className="space-y-2">
        {rows.map((l) => {
          const d = l.details ?? {};
          const prev = d.previous as Record<string, unknown> | undefined;
          const next = d.new as Record<string, unknown> | undefined;
          const isRole = ["user_roles", "user_custom_roles"].includes(l.table_name);
          const summary = isRole
            ? `${l.action === "delete" ? "Removed" : "Assigned"} ${String(d.role ?? "role").replace(/_/g, " ")} ${l.action === "delete" ? "from" : "to"} ${name(d.user_id as string)}`
            : l.action === "revoke_sessions" ? `Signed ${name(d.user_id as string)} out of ${fmt(d.count)} session(s)`
            : `${ACTION_LABEL[l.action] ?? l.action} ${MODULES[l.table_name] ?? l.table_name}${d.old_status && d.status && d.old_status !== d.status ? `: ${d.old_status} → ${d.status}` : ""}`;
          return (
            <button key={l.id} onClick={() => setOpen(open === l.id ? null : l.id)} className="glass block w-full rounded-xl p-3 text-left">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{summary}</p>
                  <p className="text-xs text-muted-foreground">by {name(l.actor_id)} · {MODULES[l.table_name] ?? l.table_name}</p>
                </div>
                <span className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString()}</span>
              </div>
              {open === l.id && (
                <div className="mt-3 space-y-1 border-t border-border pt-2 text-xs">
                  <p><span className="text-muted-foreground">Record:</span> {l.record_id ?? "—"}</p>
                  {prev && next && Object.keys(next).length > 0 ? (
                    <table className="w-full"><thead><tr className="text-muted-foreground"><th className="text-left">Field</th><th className="text-left">Previous</th><th className="text-left">New</th></tr></thead>
                      <tbody>{Object.keys(next).map((k) => (
                        <tr key={k}><td className="pr-2">{k.replace(/_/g, " ")}</td><td className="pr-2 break-all">{fmt(prev[k])}</td><td className="break-all">{fmt(next[k])}</td></tr>
                      ))}</tbody></table>
                  ) : <p className="break-all text-muted-foreground">{JSON.stringify(d)}</p>}
                </div>
              )}
            </button>
          );
        })}
        {!loading && !rows.length && <p className="py-8 text-center text-sm text-muted-foreground">No events in this period.</p>}
      </div>
    </div>
  );
}

function Sessions() {
  const people = useProfiles();
  const [rows, setRows] = useState<Session[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_list_sessions");
    setLoading(false);
    if (error) return void toast.error(error.message);
    setRows((data ?? []) as Session[]);
  };
  useEffect(() => { load(); }, []);
  const revoke = async (args: { _user_id?: string; _session_id?: string }, label: string) => {
    if (!confirm(label)) return;
    const { data, error } = await supabase.rpc("admin_revoke_sessions", args);
    if (error) return void toast.error(error.message);
    toast.success(`Signed out ${data} session(s)`);
    load();
  };
  const person = (id: string) => people[id]?.full_name || people[id]?.email || "Unknown user";
  const shown = rows.filter((s) => !q || `${person(s.user_id)} ${people[s.user_id]?.email ?? ""}`.toLowerCase().includes(q.toLowerCase()));
  const last = (s: Session) => s.refreshed_at ?? s.updated_at ?? s.created_at;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Active sessions</h2>
        <p className="text-sm text-muted-foreground">Every signed-in device. Signing someone out takes effect within about an hour, when their app next checks in.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Input placeholder="Search by person…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <Button size="sm" variant="outline" onClick={load}><RefreshCw className="mr-1 h-4 w-4" />Refresh</Button>
        <span className="self-center text-sm text-muted-foreground">{loading ? "Loading…" : `${shown.length} sessions`}</span>
      </div>
      <div className="space-y-2">
        {shown.map((s) => {
          const expired = s.not_after && new Date(s.not_after) < new Date();
          const idle = Date.now() - new Date(last(s)).getTime() > 7 * 864e5;
          return (
            <div key={s.id} className="glass flex flex-wrap items-center justify-between gap-3 rounded-xl p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{person(s.user_id)} <span className="text-xs text-muted-foreground">{people[s.user_id]?.email}</span></p>
                <p className="text-xs text-muted-foreground">
                  {describeDevice(s.user_agent ?? "")} · IP {s.ip ?? "—"} · signed in {new Date(s.created_at).toLocaleString()} · last active {new Date(last(s)).toLocaleString()}
                </p>
                <span className="text-xs font-medium text-primary">{expired ? "Expired" : idle ? "Idle" : "Active"}</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => revoke({ _session_id: s.id }, "Sign out this device?")}><LogOut className="mr-1 h-4 w-4" />Revoke</Button>
                <Button size="sm" variant="destructive" onClick={() => revoke({ _user_id: s.user_id }, `Sign ${person(s.user_id)} out of every device?`)}>All devices</Button>
              </div>
            </div>
          );
        })}
        {!loading && !shown.length && <p className="py-8 text-center text-sm text-muted-foreground">No sessions.</p>}
      </div>
    </div>
  );
}
