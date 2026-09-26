import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Plus, KeyRound, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { AppRole } from "@/hooks/useRoles";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AccessPreview, SCOPE_LABEL } from "@/components/RolesManager";
import { listAuthMeta, createUserAccount, setAccountStatus, sendPasswordReset, editUserProfile } from "@/lib/admin-users.functions";

export const ALL_ROLES: AppRole[] = ["super_admin", "admin", "operations_manager", "operator", "technician", "sales", "consultant", "support", "finance", "content_manager", "customer"];
export const STATUSES = ["active", "pending", "suspended", "disabled", "locked"] as const;
type AccountStatus = (typeof STATUSES)[number];
const STATUS_LABEL: Record<AccountStatus, string> = { active: "Active", pending: "Pending verification", suspended: "Suspended", disabled: "Disabled", locked: "Locked" };
const STATUS_CLS: Record<AccountStatus, string> = {
  active: "bg-primary/15 text-primary", pending: "bg-accent/15 text-accent", suspended: "bg-destructive/15 text-destructive",
  disabled: "bg-muted text-muted-foreground", locked: "bg-destructive/15 text-destructive",
};
const inputCls = "min-h-[40px] w-full rounded-lg border border-border bg-background/60 px-3 text-sm text-foreground";
const roleLabel = (r: string) => r.replace(/_/g, " ");

type UserRow = {
  id: string; full_name: string; email: string; phone: string | null; company_name: string | null; username: string | null;
  job_title: string | null; country: string | null; city: string | null; address: string | null; avatar_url: string | null;
  created_at: string | null; account_status: AccountStatus; is_verified: boolean; roles: AppRole[];
};

function Avatar({ u, size = 36 }: { u: Pick<UserRow, "avatar_url" | "full_name">; size?: number }) {
  return u.avatar_url
    ? <img src={u.avatar_url} alt="" style={{ width: size, height: size }} className="shrink-0 rounded-full object-cover" />
    : <span style={{ width: size, height: size }} className="flex shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">{u.full_name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() || <UserRound className="h-4 w-4" />}</span>;
}

const ago = (iso: string | null | undefined) => {
  if (!iso) return "Never";
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `${Math.max(1, m)} min ago`;
  if (m < 1440) return `${Math.round(m / 60)} h ago`;
  return new Date(iso).toLocaleDateString();
};

export function UsersManager({ startCreate = false }: { startCreate?: boolean }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [role, setRole] = useState<AppRole | "all">("all");
  const [state, setState] = useState<AccountStatus | "all">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [openTab, setOpenTab] = useState<DetailTab>("overview");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [bulk, setBulk] = useState<null | "role" | "status">(null);
  const [bulkRole, setBulkRole] = useState<AppRole>("technician");
  const [bulkStatus, setBulkStatus] = useState<AccountStatus>("active");
  const [bulkBusy, setBulkBusy] = useState(false);
  const bulkStatusFn = useServerFn(setAccountStatus);
  const togglePick = (id: string) => setPicked((c) => { const n = new Set(c); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const openUser = (id: string, t: DetailTab = "overview") => { setOpenTab(t); setOpenId(id); };
  const [creating, setCreating] = useState(startCreate);
  const authMetaFn = useServerFn(listAuthMeta);

  const list = useQuery({
    queryKey: ["admin-users"],
    queryFn: async (): Promise<UserRow[]> => {
      const [p, r] = await Promise.all([
        supabase.from("profiles").select("id,full_name,email,phone,company_name,username,job_title,country,city,address,avatar_url,created_at,account_status,is_verified").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id,role"),
      ]);
      if (p.error) throw p.error;
      if (r.error) throw r.error;
      return (p.data ?? []).map((x) => ({ ...x, account_status: x.account_status as AccountStatus, roles: (r.data ?? []).filter((y) => y.user_id === x.id).map((y) => y.role as AppRole) }));
    },
  });
  const meta = useQuery({ queryKey: ["admin-auth-meta"], queryFn: () => authMetaFn() });

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (list.data ?? []).filter((u) =>
      (!s || [u.full_name, u.email, u.phone, u.company_name, u.username].some((v) => v?.toLowerCase().includes(s))) &&
      (role === "all" || u.roles.includes(role)) &&
      (state === "all" || u.account_status === state),
    );
  }, [list.data, q, role, state]);

  const open = list.data?.find((u) => u.id === openId) ?? null;
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-users"] });
    qc.invalidateQueries({ queryKey: ["admin-auth-meta"] });
    qc.invalidateQueries({ queryKey: ["staff-profiles"] });
    qc.invalidateQueries({ queryKey: ["control-center"] });
  };

  const targets = () => [...picked].filter((id) => id !== user?.id);
  const runBulk = async () => {
    const ids = targets();
    if (!ids.length) { toast.error("Select other users (you can't change your own account)"); return; }
    setBulkBusy(true);
    let ok = 0; const failed: string[] = [];
    for (const id of ids) {
      try {
        if (bulk === "role") {
          const { error } = await supabase.from("user_roles").upsert({ user_id: id, role: bulkRole }, { onConflict: "user_id,role", ignoreDuplicates: true });
          if (error) throw error;
        } else {
          await bulkStatusFn({ data: { userId: id, status: bulkStatus, reason: "Bulk action" } });
        }
        ok++;
      } catch { failed.push(list.data?.find((u) => u.id === id)?.full_name ?? id); }
    }
    setBulkBusy(false);
    if (ok) toast.success(`Updated ${ok} user${ok === 1 ? "" : "s"}`);
    if (failed.length) toast.error(`Failed for: ${failed.join(", ")}`);
    setBulk(null); setPicked(new Set()); refresh();
  };
  const exportCsv = () => {
    const sel = (list.data ?? []).filter((u) => picked.has(u.id));
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [["Name", "Email", "Phone", "Company", "Roles", "Status", "Verified", "Created"].join(","),
      ...sel.map((u) => [u.full_name, u.email, u.phone, u.company_name, u.roles.map(roleLabel).join("; "), STATUS_LABEL[u.account_status], u.is_verified ? "yes" : "no", u.created_at?.slice(0, 10)].map(esc).join(","))];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    a.download = `widetech-users-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  };

  const counts = STATUSES.map((s) => [STATUS_LABEL[s], list.data?.filter((u) => u.account_status === s).length ?? 0] as const);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <span className="glass rounded-xl px-3 py-2 text-sm"><b>{list.data?.length ?? 0}</b> <span className="text-muted-foreground">users</span></span>
          {counts.filter(([, n]) => n > 0).map(([l, n]) => <span key={l} className="glass rounded-xl px-3 py-2 text-sm"><b>{n}</b> <span className="text-muted-foreground">{l.toLowerCase()}</span></span>)}
        </div>
        <button onClick={() => setCreating(true)} className="flex min-h-[44px] items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" /> Create user</button>
      </div>

      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
        <input className={inputCls} placeholder="Search name, email, phone, username, company…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search users" />
        <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value as AppRole | "all")} aria-label="Filter by role">
          <option value="all">All roles</option>
          {ALL_ROLES.map((r) => <option key={r} value={r} className="capitalize">{roleLabel(r)}</option>)}
        </select>
        <select className={inputCls} value={state} onChange={(e) => setState(e.target.value as AccountStatus | "all")} aria-label="Filter by status">
          <option value="all">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
      </div>

      {picked.size > 0 && (
        <div className="glass sticky top-16 z-10 flex flex-wrap items-center gap-2 rounded-2xl p-3 text-sm">
          <b>{picked.size} selected</b>
          <button onClick={() => setBulk("role")} className="min-h-[36px] rounded-lg border border-border px-3 text-xs font-semibold">Assign role</button>
          <button onClick={() => setBulk("status")} className="min-h-[36px] rounded-lg border border-border px-3 text-xs font-semibold">Change status</button>
          <button onClick={exportCsv} className="min-h-[36px] rounded-lg border border-border px-3 text-xs font-semibold">Export</button>
          <button onClick={() => setPicked(new Set())} className="ml-auto text-xs text-muted-foreground underline">Clear</button>
        </div>
      )}

      {list.isLoading && <p className="text-sm text-muted-foreground">Loading users…</p>}
      {!list.isLoading && rows.length === 0 && <div className="glass rounded-2xl p-6 text-sm text-muted-foreground">No users match.</div>}

      {/* Computer: table */}
      {rows.length > 0 && (
        <div className="glass hidden overflow-x-auto rounded-2xl md:block">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr className="border-b border-border"><th className="w-10 px-3"><input type="checkbox" aria-label="Select all shown" checked={rows.length > 0 && rows.every((u) => picked.has(u.id))} onChange={(e) => setPicked(e.target.checked ? new Set(rows.map((u) => u.id)) : new Set())} /></th>{["User", "Phone", "Roles", "Status", "Last login", "Created", ""].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className="border-b border-border/50 last:border-0 hover:bg-background/30">
                  <td className="px-3"><input type="checkbox" aria-label={`Select ${u.full_name}`} checked={picked.has(u.id)} onChange={() => togglePick(u.id)} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar u={u} />
                      <div className="min-w-0">
                        <p className="flex items-center gap-1 font-semibold"><span className="truncate">{u.full_name}</span><VerifiedBadge verified={u.is_verified} /></p>
                        <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.phone || "—"}</td>
                  <td className="px-4 py-3"><div className="flex flex-wrap gap-1">{u.roles.map((r) => <span key={r} className="rounded-full border border-border px-2 py-0.5 text-[11px] capitalize">{roleLabel(r)}</span>)}</div></td>
                  <td className="px-4 py-3"><span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", STATUS_CLS[u.account_status])}>{STATUS_LABEL[u.account_status]}</span></td>
                  <td className="px-4 py-3 text-muted-foreground">{meta.isLoading ? "…" : ago(meta.data?.[u.id]?.last_sign_in_at)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap"><button onClick={() => openUser(u.id, "roles")} className="mr-1 min-h-[36px] rounded-lg border border-border px-3 text-xs font-semibold">Assign role</button><button onClick={() => openUser(u.id)} className="min-h-[36px] rounded-lg border border-border px-3 text-xs font-semibold">Manage</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Phone: cards */}
      <div className="space-y-2 md:hidden">
        {rows.map((u) => (
          <button key={u.id} onClick={() => openUser(u.id)} className="glass flex w-full items-center gap-3 rounded-2xl p-4 text-left">
            <Avatar u={u} size={40} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1 font-bold"><span className="truncate">{u.full_name}</span><VerifiedBadge verified={u.is_verified} /></span>
              <span className="block truncate text-xs text-muted-foreground">{u.email}</span>
              <span className="mt-1 flex flex-wrap gap-1">
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", STATUS_CLS[u.account_status])}>{STATUS_LABEL[u.account_status]}</span>
                {u.roles.map((r) => <span key={r} className="rounded-full border border-border px-2 py-0.5 text-[10px] capitalize text-muted-foreground">{roleLabel(r)}</span>)}
              </span>
            </span>
          </button>
        ))}
      </div>

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {open && <UserDetail key={open.id + openTab} startTab={openTab} u={open} isSelf={open.id === user?.id} lastSignIn={meta.data?.[open.id]?.last_sign_in_at ?? null} onChanged={refresh} />}
        </SheetContent>
      </Sheet>

      <Dialog open={!!bulk} onOpenChange={(o) => !o && setBulk(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{bulk === "role" ? "Assign role to several users" : "Change status of several users"}</DialogTitle></DialogHeader>
          {bulk === "role"
            ? <select className={inputCls} value={bulkRole} onChange={(e) => setBulkRole(e.target.value as AppRole)} aria-label="Role">{ALL_ROLES.filter((r) => r !== "super_admin").map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}</select>
            : <select className={inputCls} value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value as AccountStatus)} aria-label="Status">{STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select>}
          <p className="rounded-lg bg-muted p-3 text-sm">
            You are about to {bulk === "role" ? <>give the <b>{roleLabel(bulkRole)}</b> role to</> : <>set <b>{STATUS_LABEL[bulkStatus]}</b> on</>} <b>{targets().length}</b> user{targets().length === 1 ? "" : "s"}.
            {picked.has(user?.id ?? "") && " Your own account is skipped."} Each change is recorded separately in the activity log.
          </p>
          <div className="flex gap-2">
            <button onClick={() => setBulk(null)} className="min-h-[44px] flex-1 rounded-lg border border-border text-sm font-semibold">Cancel</button>
            <button disabled={bulkBusy} onClick={runBulk} className="min-h-[44px] flex-1 rounded-lg bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50">{bulkBusy ? "Working…" : "Confirm"}</button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>Create user</DialogTitle></DialogHeader>
          <CreateUserForm onDone={() => { setCreating(false); refresh(); }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateUserForm({ onDone }: { onDone: () => void }) {
  const createFn = useServerFn(createUserAccount);
  const [mode, setMode] = useState<"password" | "invite">("invite");
  const [roles, setRoles] = useState<AppRole[]>(["customer"]);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    setBusy(true);
    try {
      await createFn({ data: { ...f, mode, roles, account_status: f["account_status"] as AccountStatus } as never });
      toast.success(mode === "invite" ? "User created — invitation email sent" : "User created");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message.replace(/^\[.*?\]\s*/, "") : "Could not create user");
    } finally { setBusy(false); }
  };

  const field = (name: string, label: string, props: Record<string, unknown> = {}) => (
    <label className="grid gap-1 text-xs text-muted-foreground">{label}<input name={name} className={inputCls} {...props} /></label>
  );

  return (
    <form onSubmit={submit} className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {field("first_name", "First name *", { required: true, maxLength: 60 })}
        {field("last_name", "Last name *", { required: true, maxLength: 60 })}
        {field("email", "Email *", { required: true, type: "email", maxLength: 255 })}
        {field("phone", "Phone", { type: "tel", maxLength: 30 })}
        {field("username", "Username", { maxLength: 40, pattern: "[A-Za-z0-9_.\\-]*" })}
        {field("company_name", "Company", { maxLength: 120 })}
        {field("job_title", "Job title", { maxLength: 120 })}
        {field("country", "Country", { maxLength: 80, defaultValue: "Tanzania" })}
        {field("city", "City", { maxLength: 80 })}
        {field("address", "Address", { maxLength: 250 })}
      </div>
      <fieldset className="grid gap-2">
        <legend className="text-xs font-semibold text-muted-foreground">How will they sign in?</legend>
        <div className="flex gap-2">
          {(["invite", "password"] as const).map((m) => (
            <button type="button" key={m} onClick={() => setMode(m)} className={cn("min-h-[40px] flex-1 rounded-lg border border-border text-sm font-semibold", mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
              {m === "invite" ? "Email them an invitation" : "Set a password now"}
            </button>
          ))}
        </div>
        {mode === "password" && field("password", "Password (min 8 characters) *", { required: true, type: "password", minLength: 8, maxLength: 72, autoComplete: "new-password" })}
      </fieldset>
      <label className="grid gap-1 text-xs text-muted-foreground">Account status
        <select name="account_status" className={inputCls} defaultValue="active">{STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select>
      </label>
      <div>
        <p className="text-xs font-semibold text-muted-foreground">Roles (first chosen is the main role)</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {ALL_ROLES.map((r) => (
            <button type="button" key={r} onClick={() => setRoles((cur) => cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r])}
              className={cn("min-h-[36px] rounded-full border border-border px-3 text-xs font-semibold capitalize", roles.includes(r) ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
              {roleLabel(r)}
            </button>
          ))}
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">Permissions come from the chosen roles.</p>
      </div>
      <button disabled={busy || roles.length === 0} className="min-h-[44px] rounded-lg bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60">{busy ? "Creating…" : "Create user"}</button>
    </form>
  );
}

type DetailTab = "overview" | "profile" | "roles" | "access" | "activity" | "requests" | "security";

function UserDetail({ u, isSelf, lastSignIn, onChanged, startTab = "overview" }: { u: UserRow; isSelf: boolean; lastSignIn: string | null; onChanged: () => void; startTab?: DetailTab }) {
  const [tab, setTab] = useState<DetailTab>(startTab);
  const statusFn = useServerFn(setAccountStatus);
  const resetFn = useServerFn(sendPasswordReset);
  const editFn = useServerFn(editUserProfile);
  const [busy, setBusy] = useState(false);

  const activity = useQuery({
    queryKey: ["user-activity", u.id],
    enabled: tab === "activity",
    queryFn: async () => {
      const { data, error } = await supabase.from("audit_logs").select("id,action,table_name,created_at,actor_id,record_id,details")
        .or(`actor_id.eq.${u.id},record_id.eq.${u.id}`).order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
  });
  const requests = useQuery({
    queryKey: ["user-requests", u.id],
    enabled: tab === "requests" || tab === "overview",
    queryFn: async () => {
      const [r, p] = await Promise.all([
        supabase.from("service_requests").select("id,tracking_code,title,status,created_at").or(`customer_id.eq.${u.id},assigned_technician_id.eq.${u.id}`).order("created_at", { ascending: false }).limit(50),
        supabase.from("projects").select("id,title,status,progress").eq("customer_id", u.id),
      ]);
      if (r.error) throw r.error;
      return { requests: r.data, projects: p.data ?? [] };
    },
  });

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try { await fn(); toast.success(ok); onChanged(); }
    catch (err) { toast.error(err instanceof Error ? err.message.replace(/^\[.*?\]\s*/, "") : "Failed"); }
    finally { setBusy(false); }
  };

  const toggleRole = async (r: AppRole) => {
    const has = u.roles.includes(r);
    if (has && u.roles.length === 1) { toast.error("A user needs at least one role"); return; }
    const res = has
      ? await supabase.from("user_roles").delete().eq("user_id", u.id).eq("role", r)
      : await supabase.from("user_roles").insert({ user_id: u.id, role: r });
    if (res.error) { toast.error(res.error.message); return; }
    toast.success(has ? `Removed ${roleLabel(r)}` : `Added ${roleLabel(r)}`);
    onChanged();
  };

  const toggleVerify = () => run(async () => {
    const { error } = await supabase.from("profiles").update({ is_verified: !u.is_verified }).eq("id", u.id);
    if (error) throw error;
  }, u.is_verified ? "Blue tick removed" : "Account verified");

  const saveProfile = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    run(() => editFn({ data: { userId: u.id, ...f } as never }), "Profile saved");
  };

  const tabs: DetailTab[] = ["overview", "profile", "roles", "access", "activity", "requests", "security"];

  return (
    <>
      <SheetHeader>
        <div className="flex items-center gap-3">
          <Avatar u={u} size={52} />
          <div className="min-w-0">
            <SheetTitle className="flex items-center gap-1.5 text-left">{u.full_name}<VerifiedBadge verified={u.is_verified} className="h-5 w-5" /></SheetTitle>
            <p className="truncate text-xs text-muted-foreground">{u.email}</p>
            <span className={cn("mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold", STATUS_CLS[u.account_status])}>{STATUS_LABEL[u.account_status]}</span>
          </div>
        </div>
      </SheetHeader>
      <div className="mt-3 flex gap-1 overflow-x-auto px-4">
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn("min-h-[36px] shrink-0 rounded-full px-3 text-xs font-semibold capitalize", tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>{t}</button>
        ))}
      </div>
      <div className="px-4 pb-8 pt-4 text-sm">
        {tab === "overview" && (
          <dl className="space-y-2">
            {[["Username", u.username], ["Phone", u.phone], ["Company", u.company_name], ["Job title", u.job_title], ["Location", [u.city, u.country].filter(Boolean).join(", ")],
              ["Roles", u.roles.map(roleLabel).join(", ")], ["Last login", ago(lastSignIn)], ["Joined", u.created_at ? new Date(u.created_at).toLocaleDateString() : null],
              ["Requests", requests.data ? String(requests.data.requests.length) : "…"], ["Projects", requests.data ? String(requests.data.projects.length) : "…"]].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 border-b border-border/40 pb-2"><dt className="text-muted-foreground">{k}</dt><dd className="truncate text-right capitalize-first">{v || "—"}</dd></div>
            ))}
          </dl>
        )}

        {tab === "profile" && (
          <form onSubmit={saveProfile} className="grid gap-3">
            {([["full_name", "Full name", u.full_name], ["phone", "Phone", u.phone], ["username", "Username", u.username], ["company_name", "Company", u.company_name],
              ["job_title", "Job title", u.job_title], ["country", "Country", u.country], ["city", "City", u.city], ["address", "Address", u.address]] as const).map(([n, l, v]) => (
              <label key={n} className="grid gap-1 text-xs text-muted-foreground">{l}<input name={n} defaultValue={v ?? ""} className={inputCls} required={n === "full_name"} maxLength={250} /></label>
            ))}
            <button disabled={busy} className="min-h-[44px] rounded-lg bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60">Save profile</button>
          </form>
        )}

        {tab === "access" && <UserAccess u={u} isSelf={isSelf} />}
        {tab === "roles" && (
          <AssignRoles u={u} isSelf={isSelf} onToggleSystem={toggleRole} onChanged={onChanged} />

        )}

        {tab === "activity" && (
          <ul className="space-y-2">
            {activity.isLoading && <li className="text-muted-foreground">Loading…</li>}
            {activity.data?.length === 0 && <li className="text-muted-foreground">No recorded activity yet.</li>}
            {activity.data?.map((a) => (
              <li key={a.id} className="rounded-lg border border-border/50 p-2">
                <p className="font-medium capitalize">{a.action.replace(/_/g, " ")} · <span className="text-muted-foreground">{a.table_name.replace(/_/g, " ")}</span></p>
                <p className="text-[11px] text-muted-foreground">{a.actor_id === u.id ? "By this user" : "Done to this user"} · {new Date(a.created_at).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        )}

        {tab === "requests" && (
          <div className="space-y-4">
            <ul className="space-y-2">
              {requests.data?.requests.length === 0 && <li className="text-muted-foreground">No service requests.</li>}
              {requests.data?.requests.map((r) => (
                <li key={r.id} className="flex justify-between gap-2 rounded-lg border border-border/50 p-2"><span className="min-w-0 truncate">{r.tracking_code} · {r.title}</span><span className="shrink-0 text-xs capitalize text-muted-foreground">{r.status.replace("_", " ")}</span></li>
              ))}
            </ul>
            {!!requests.data?.projects.length && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Projects</p>
                <ul className="mt-2 space-y-2">{requests.data.projects.map((p) => <li key={p.id} className="flex justify-between rounded-lg border border-border/50 p-2"><span className="truncate">{p.title}</span><span className="text-xs text-muted-foreground">{p.progress}%</span></li>)}</ul>
              </div>
            )}
          </div>
        )}

        {tab === "security" && (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Account status</p>
              {isSelf ? <p className="mt-2 text-xs text-muted-foreground">You can't change your own status.</p> : (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {STATUSES.map((s) => (
                    <button key={s} disabled={busy || u.account_status === s}
                      onClick={() => {
                        const blocked = s === "suspended" || s === "disabled" || s === "locked";
                        const reason = blocked ? window.prompt(`Reason for ${STATUS_LABEL[s].toLowerCase()} (optional)`) : "";
                        if (reason === null) return;
                        run(() => statusFn({ data: { userId: u.id, status: s, reason: reason ?? "" } }), `Status set to ${STATUS_LABEL[s]}`);
                      }}
                      className={cn("min-h-[40px] rounded-lg border border-border text-xs font-semibold disabled:opacity-50", u.account_status === s && "bg-primary text-primary-foreground")}>
                      {s === "active" && u.account_status === "locked" ? "Unlock" : s === "active" ? "Activate" : STATUS_LABEL[s]}
                    </button>
                  ))}
                </div>
              )}
              <p className="mt-2 text-[11px] text-muted-foreground">Suspended, disabled or locked people are signed out and can't sign back in until activated.</p>
            </div>
            <button disabled={busy} onClick={() => run(() => resetFn({ data: { userId: u.id, redirectTo: `${window.location.origin}/reset-password` } }), "Password reset email sent")}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-border text-sm font-semibold disabled:opacity-50"><KeyRound className="h-4 w-4" /> Send password reset email</button>
            <button disabled={busy} onClick={toggleVerify} className={cn("min-h-[44px] w-full rounded-lg border border-border text-sm font-semibold", !u.is_verified && "text-verified")}>
              {u.is_verified ? "Remove blue tick" : "Verify account (blue tick)"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function AssignRoles({ u, isSelf, onToggleSystem, onChanged }: { u: UserRow; isSelf: boolean; onToggleSystem: (r: AppRole) => void; onChanged: () => void }) {
  const qc = useQueryClient();
  const data = useQuery({
    queryKey: ["assign-roles", u.id],
    queryFn: async () => {
      const [roles, mine, prof] = await Promise.all([
        supabase.from("roles").select("key,name,role_type,is_active").order("name"),
        supabase.from("user_custom_roles").select("role_key").eq("user_id", u.id),
        supabase.from("profiles").select("primary_role").eq("id", u.id).maybeSingle(),
      ]);
      if (roles.error) throw roles.error;
      return { roles: roles.data ?? [], custom: new Set((mine.data ?? []).map((x) => x.role_key)), primary: prof.data?.primary_role ?? null };
    },
  });
  const reload = () => { qc.invalidateQueries({ queryKey: ["assign-roles", u.id] }); qc.invalidateQueries({ queryKey: ["rbac"] }); onChanged(); };
  const nameOf = (k: string) => data.data?.roles.find((r) => r.key === k)?.name ?? roleLabel(k);
  const held: string[] = [...u.roles, ...(data.data ? [...data.data.custom] : [])];

  const setPrimary = async (k: string) => {
    if (k && !held.includes(k)) {
      const isSystem = (ALL_ROLES as string[]).includes(k);
      const res = isSystem ? await supabase.from("user_roles").insert({ user_id: u.id, role: k as AppRole }) : await supabase.from("user_custom_roles").insert({ user_id: u.id, role_key: k });
      if (res.error) { toast.error(res.error.message); return; }
    }
    const { error } = await supabase.from("profiles").update({ primary_role: k || null }).eq("id", u.id);
    if (error) { toast.error(error.message); return; }
    toast.success(k ? `Primary role: ${nameOf(k)}` : "Primary role cleared"); reload();
  };
  const toggleCustom = async (k: string, has: boolean) => {
    const res = has ? await supabase.from("user_custom_roles").delete().eq("user_id", u.id).eq("role_key", k) : await supabase.from("user_custom_roles").insert({ user_id: u.id, role_key: k });
    if (res.error) { toast.error(res.error.message); return; }
    toast.success(has ? `Removed ${nameOf(k)}` : `Added ${nameOf(k)}`); reload();
  };

  if (isSelf) return <p className="text-xs text-muted-foreground">You can't change your own roles. Current: {held.map(nameOf).join(", ")}</p>;
  const custom = data.data?.roles.filter((r) => r.role_type === "custom") ?? [];
  return (
    <div className="space-y-5">
      <label className="grid gap-1 text-xs font-semibold text-muted-foreground">Primary role
        <select className={inputCls} value={data.data?.primary ?? ""} onChange={(e) => setPrimary(e.target.value)}>
          <option value="">— Not set —</option>
          {data.data?.roles.filter((r) => r.is_active).map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
        </select>
      </label>
      <div>
        <p className="text-xs font-semibold text-muted-foreground">System roles</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {ALL_ROLES.map((r) => (
            <button key={r} onClick={() => onToggleSystem(r)} className={cn("min-h-[36px] rounded-full border border-border px-3 text-xs font-semibold", u.roles.includes(r) ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>{nameOf(r)}</button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-muted-foreground">Custom roles</p>
        {custom.length === 0 ? <p className="mt-2 text-xs text-muted-foreground">No custom roles yet — create them under Roles & permissions.</p> : (
          <div className="mt-2 flex flex-wrap gap-2">
            {custom.map((r) => { const has = !!data.data?.custom.has(r.key); return (
              <button key={r.key} onClick={() => toggleCustom(r.key, has)} className={cn("min-h-[36px] rounded-full border border-border px-3 text-xs font-semibold", has ? "bg-accent text-accent-foreground" : "text-muted-foreground", !r.is_active && "line-through opacity-60")}>{r.name}</button>
            ); })}
          </div>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">Their access is the combination of every active role they hold.</p>
    </div>
  );
}

/** Effective access preview + temporary permissions for one person. */
function UserAccess({ u, isSelf }: { u: UserRow; isSelf: boolean }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const data = useQuery({
    queryKey: ["user-access", u.id],
    queryFn: async () => {
      const [eff, mods, perms, gr] = await Promise.all([
        supabase.rpc("preview_user_permissions", { _user_id: u.id }),
        supabase.from("app_modules").select("key,name,is_enabled").order("display_order"),
        supabase.from("permissions").select("key,description").order("key"),
        supabase.from("user_permission_grants").select("*").eq("user_id", u.id).order("created_at", { ascending: false }),
      ]);
      if (eff.error) throw eff.error;
      return { eff: eff.data ?? [], modules: mods.data ?? [], perms: perms.data ?? [], grants: gr.data ?? [] };
    },
  });
  const today = new Date().toISOString().slice(0, 10);
  const [perm, setPerm] = useState("");
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const reload = () => qc.invalidateQueries({ queryKey: ["user-access", u.id] });

  const grant = async (e: FormEvent) => {
    e.preventDefault();
    if (!perm || !end || !reason.trim()) { toast.error("Pick a permission, an end date and a reason"); return; }
    const s = new Date(`${start}T00:00:00`), en = new Date(`${end}T23:59:59`);
    if (en <= s) { toast.error("End date must be after the start date"); return; }
    setBusy(true);
    const { error } = await supabase.from("user_permission_grants").insert({ user_id: u.id, permission_key: perm, starts_at: s.toISOString(), ends_at: en.toISOString(), reason: reason.trim(), granted_by: user!.id });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Temporary permission granted"); setPerm(""); setEnd(""); setReason(""); reload();
  };
  const revoke = async (id: string) => {
    const { error } = await supabase.from("user_permission_grants").update({ revoked_at: new Date().toISOString(), revoked_by: user!.id }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Revoked"); reload();
  };

  if (data.isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (data.error || !data.data) return <p className="text-sm text-destructive">Couldn't load access.</p>;
  const now = Date.now();
  const stateOf = (g: { revoked_at: string | null; starts_at: string; ends_at: string }) =>
    g.revoked_at ? "Revoked" : now < +new Date(g.starts_at) ? "Scheduled" : now >= +new Date(g.ends_at) ? "Expired" : "Active";

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-2 text-sm font-bold">What {u.full_name} can reach right now</h3>
        <AccessPreview modules={data.data.modules} perms={data.data.eff as { permission_key: string; scope: string }[]} />
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-bold">Temporary permissions</h3>
        {isSelf ? <p className="text-xs text-muted-foreground">You can't grant permissions to yourself.</p> : (
          <form onSubmit={grant} className="space-y-2 rounded-xl border border-border p-3">
            <select className={inputCls} value={perm} onChange={(e) => setPerm(e.target.value)} aria-label="Permission">
              <option value="">Choose a permission…</option>
              {data.data.perms.map((p) => <option key={p.key} value={p.key}>{p.key}{p.description ? ` — ${p.description}` : ""}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-muted-foreground">Start<input type="date" className={inputCls} value={start} min={today} onChange={(e) => setStart(e.target.value)} /></label>
              <label className="text-xs text-muted-foreground">End<input type="date" className={inputCls} value={end} min={start} onChange={(e) => setEnd(e.target.value)} /></label>
            </div>
            <input className={inputCls} placeholder="Reason (required)" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />
            <button disabled={busy} className="min-h-[44px] w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50">Grant temporarily</button>
            <p className="text-[11px] text-muted-foreground">It switches off by itself after the end date.</p>
          </form>
        )}
        <ul className="space-y-2">
          {data.data.grants.map((g) => { const st = stateOf(g); return (
            <li key={g.id} className="rounded-xl border border-border/60 p-3 text-xs">
              <div className="flex items-center justify-between gap-2"><b className="text-sm">{g.permission_key}</b><span className="rounded-full border border-border px-2 py-0.5">{st}</span></div>
              <p className="mt-1 text-muted-foreground">{new Date(g.starts_at).toLocaleDateString()} → {new Date(g.ends_at).toLocaleDateString()} · {SCOPE_LABEL[g.scope] ?? g.scope}</p>
              <p className="text-muted-foreground">Reason: {g.reason}</p>
              {(st === "Active" || st === "Scheduled") && <button onClick={() => revoke(g.id)} className="mt-2 text-destructive underline">Revoke now</button>}
            </li>); })}
          {data.data.grants.length === 0 && <li className="text-xs text-muted-foreground">None yet.</li>}
        </ul>
      </section>
    </div>
  );
}
