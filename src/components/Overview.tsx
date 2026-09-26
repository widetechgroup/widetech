import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  ArrowDownRight, ArrowUpRight, CalendarClock, ClipboardList, DollarSign, FolderKanban,
  Image as ImageIcon, LifeBuoy, Plus, Users as UsersIcon, Activity as ActivityIcon, Minus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/lib/company";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRoles";
import { cn } from "@/lib/utils";

type RangeId = "today" | "yesterday" | "7" | "30" | "90" | "year" | "custom";
const RANGES: { id: RangeId; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "7", label: "7 days" },
  { id: "30", label: "30 days" },
  { id: "90", label: "90 days" },
  { id: "year", label: "This year" },
  { id: "custom", label: "Custom" },
];

const DAY = 86400000;
function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }

function rangeBounds(id: RangeId, from: string, to: string): [Date, Date] {
  const now = new Date();
  const today = startOfDay(now);
  switch (id) {
    case "today": return [today, now];
    case "yesterday": return [new Date(today.getTime() - DAY), today];
    case "year": return [new Date(now.getFullYear(), 0, 1), now];
    case "custom": {
      const s = from ? new Date(from) : new Date(today.getTime() - 29 * DAY);
      const e = to ? new Date(new Date(to).getTime() + DAY) : now;
      return [s, e];
    }
    default: return [new Date(today.getTime() - (Number(id) - 1) * DAY), now];
  }
}

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-warning/15 text-warning",
  reviewing: "bg-accent/15 text-accent",
  quoted: "bg-primary/15 text-primary",
  in_progress: "bg-accent/15 text-accent",
  completed: "bg-success/15 text-success",
  cancelled: "bg-destructive/15 text-destructive",
};
const CHART_COLORS = ["var(--primary)", "var(--accent)", "var(--success)", "var(--warning)", "var(--destructive)", "var(--muted-foreground)"];

const TABLE_LABEL: Record<string, string> = {
  service_requests: "Service request", quotations: "Quote", projects: "Project", user_roles: "Role",
  company_settings: "Company settings", services: "Service", profiles: "Profile", role_permissions: "Permission", app_modules: "Module",
};

function ago(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}
function pct(cur: number, prev: number) {
  if (prev === 0) return cur === 0 ? 0 : null;
  return Math.round(((cur - prev) / prev) * 1000) / 10;
}

export function Overview({ onNavigate }: { onNavigate?: (tab: "dispatch" | "consult" | "projects" | "services" | "team" | "media" | "activity") => void }) {
  const [range, setRange] = useState<RangeId>("30");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const company = useCompany();
  const { user } = useAuth();
  const { isSuperAdmin } = useRoles();
  const qc = useQueryClient();
  const [start, end] = rangeBounds(range, from, to);
  const span = end.getTime() - start.getTime();
  const prevStart = new Date(start.getTime() - span);

  const { data, isLoading, error } = useQuery({
    queryKey: ["overview", range, from, to],
    queryFn: async () => {
      const s = prevStart.toISOString();
      const [req, quotes, tickets, consults, profiles, services, logs, upcoming, projects] = await Promise.all([
        supabase.from("service_requests").select("id, tracking_code, title, status, created_at, customer_id, assigned_technician_id, service_id").gte("created_at", s).order("created_at", { ascending: false }),
        supabase.from("quotations").select("id, request_id, status, amount_usd, created_at").gte("created_at", s),
        supabase.from("support_tickets").select("id, status, created_at"),
        supabase.from("consultations").select("id, created_at").gte("created_at", s),
        supabase.from("profiles").select("id, full_name, company_name, avatar_url, created_at, is_suspended"),
        supabase.from("services").select("id, title"),
        supabase.from("audit_logs").select("id, action, table_name, details, created_at").order("created_at", { ascending: false }).limit(10),
        supabase.from("consultations").select("id, topic, preferred_date, preferred_time, status, customer_id").gte("preferred_date", new Date().toISOString().slice(0, 10)).neq("status", "cancelled").order("preferred_date").limit(5),
        supabase.from("projects").select("id, status"),
      ]);
      const firstError = [req, quotes, tickets, consults, profiles, services, logs, upcoming, projects].find((r) => r.error)?.error;
      if (firstError) throw firstError;
      return {
        requests: req.data ?? [], quotes: quotes.data ?? [], tickets: tickets.data ?? [], consults: consults.data ?? [],
        profiles: profiles.data ?? [], services: services.data ?? [], logs: logs.data ?? [], upcoming: upcoming.data ?? [], projects: projects.data ?? [],
      };
    },
  });

  // Live activity: refresh when requests, quotes or chats change.
  useEffect(() => {
    const ch = supabase
      .channel("overview-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "service_requests" }, () => qc.invalidateQueries({ queryKey: ["overview"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "quotations" }, () => qc.invalidateQueries({ queryKey: ["overview"] }))
      .subscribe();
    const t = setInterval(() => qc.invalidateQueries({ queryKey: ["overview"] }), 60000);
    return () => { supabase.removeChannel(ch); clearInterval(t); };
  }, [qc]);

  if (error) return <div className="glass rounded-2xl p-6 text-sm text-destructive">Couldn't load the figures: {error.message}</div>;
  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => <div key={i} className="glass h-24 animate-pulse rounded-2xl" />)}
      </div>
    );
  }

  const inCur = (iso: string | null) => !!iso && new Date(iso) >= start && new Date(iso) < end;
  const inPrev = (iso: string | null) => !!iso && new Date(iso) >= prevStart && new Date(iso) < start;
  const profileById = new Map(data.profiles.map((p) => [p.id, p]));
  const serviceById = new Map(data.services.map((s) => [s.id, s.title]));
  const reqById = new Map(data.requests.map((r) => [r.id, r]));

  const reqCur = data.requests.filter((r) => inCur(r.created_at));
  const reqPrev = data.requests.filter((r) => inPrev(r.created_at));
  const acceptedCur = data.quotes.filter((q) => q.status === "accepted" && inCur(q.created_at));
  const acceptedPrev = data.quotes.filter((q) => q.status === "accepted" && inPrev(q.created_at));
  const revCur = acceptedCur.reduce((s, q) => s + Number(q.amount_usd), 0);
  const revPrev = acceptedPrev.reduce((s, q) => s + Number(q.amount_usd), 0);
  const custCur = data.profiles.filter((p) => inCur(p.created_at)).length;
  const custPrev = data.profiles.filter((p) => inPrev(p.created_at)).length;
  const openStatus = (s: string) => !["completed", "cancelled"].includes(s);

  const kpis = [
    { label: "New customers", icon: UsersIcon, value: custCur.toLocaleString(), change: pct(custCur, custPrev), sub: `${data.profiles.length.toLocaleString()} total` },
    { label: "New requests", icon: ClipboardList, value: reqCur.length.toLocaleString(), change: pct(reqCur.length, reqPrev.length), sub: `${data.requests.filter((r) => openStatus(r.status)).length} open` },
    { label: "Accepted revenue", icon: DollarSign, value: `$${revCur.toLocaleString()}`, change: pct(revCur, revPrev), sub: company.toTzs(revCur) != null ? `TZS ${company.toTzs(revCur)!.toLocaleString()}` : "" },
    { label: "Open support chats", icon: LifeBuoy, value: data.tickets.filter((t) => t.status === "open").length.toLocaleString(), change: undefined, sub: `${data.projects.filter((p) => p.status === "active").length} active projects` },
  ];

  // Requests per day chart (max 31 bars, otherwise per week).
  const days = Math.max(1, Math.ceil(span / DAY));
  const step = days > 31 ? 7 : 1;
  const bars = Array.from({ length: Math.ceil(days / step) }, (_, i) => {
    const bs = new Date(startOfDay(start).getTime() + i * step * DAY);
    const be = new Date(bs.getTime() + step * DAY);
    const n = reqCur.filter((r) => { const d = new Date(r.created_at!); return d >= bs && d < be; }).length;
    return { label: bs.toLocaleDateString(undefined, { day: "numeric", month: "short" }), n };
  });
  const maxBar = Math.max(1, ...bars.map((b) => b.n));

  // Service distribution + top services.
  const perService = new Map<string, { title: string; requests: number; revenue: number }>();
  for (const r of reqCur) {
    const key = r.service_id ?? "other";
    const e = perService.get(key) ?? { title: r.service_id ? serviceById.get(r.service_id) ?? "Unknown" : "Other", requests: 0, revenue: 0 };
    e.requests++;
    perService.set(key, e);
  }
  for (const q of acceptedCur) {
    const r = reqById.get(q.request_id);
    const key = r?.service_id ?? "other";
    const e = perService.get(key) ?? { title: r?.service_id ? serviceById.get(r.service_id) ?? "Unknown" : "Other", requests: 0, revenue: 0 };
    e.revenue += Number(q.amount_usd);
    perService.set(key, e);
  }
  const top = [...perService.values()].sort((a, b) => b.requests - a.requests || b.revenue - a.revenue);
  const donut = top.slice(0, 5);
  if (top.length > 5) donut.push({ title: "Others", requests: top.slice(5).reduce((s, t) => s + t.requests, 0), revenue: 0 });
  const donutTotal = donut.reduce((s, d) => s + d.requests, 0);

  // Recent customers: latest request per customer.
  const lastByCustomer = new Map<string, (typeof data.requests)[number]>();
  for (const r of data.requests) if (!lastByCustomer.has(r.customer_id)) lastByCustomer.set(r.customer_id, r);
  const recentCustomers = [...lastByCustomer.values()].slice(0, 5);

  const actions = [
    { label: "Assign technician", tab: "dispatch" as const, show: true, icon: ClipboardList },
    { label: "Create quote", tab: "dispatch" as const, show: true, icon: DollarSign },
    { label: "Consultations", tab: "consult" as const, show: true, icon: CalendarClock },
    { label: "Projects", tab: "projects" as const, show: true, icon: FolderKanban },
    { label: "New service", tab: "services" as const, show: isSuperAdmin, icon: Plus },
    { label: "Manage users", tab: "team" as const, show: isSuperAdmin, icon: UsersIcon },
    { label: "Upload media", tab: "media" as const, show: isSuperAdmin, icon: ImageIcon },
  ].filter((a) => a.show);

  const myName = user ? profileById.get(user.id)?.full_name?.split(" ")[0] : "";

  return (
    <div className="space-y-5">
      {/* Welcome + range */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-lg font-bold">{myName ? `Welcome back, ${myName}` : "Business overview"}</h2>
          <p className="text-xs text-muted-foreground">
            {start.toLocaleDateString()} – {new Date(end.getTime() - 1).toLocaleDateString()} · compared with the previous period
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {RANGES.map((r) => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className={cn(
                "min-h-[34px] rounded-lg border border-border px-2.5 text-xs font-semibold",
                range === r.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {r.label}
            </button>
          ))}
          {range === "custom" && (
            <div className="flex items-center gap-1.5">
              <input type="date" aria-label="From date" value={from} onChange={(e) => setFrom(e.target.value)} className="min-h-[34px] rounded-lg border border-border bg-background/60 px-2 text-xs" />
              <input type="date" aria-label="To date" value={to} onChange={(e) => setTo(e.target.value)} className="min-h-[34px] rounded-lg border border-border bg-background/60 px-2 text-xs" />
            </div>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="glass rounded-xl p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">{k.label}</p>
              <k.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-2xl font-extrabold tracking-tight">{k.value}</p>
            <div className="mt-1 flex items-center gap-2 text-[11px]">
              {k.change !== undefined && <Trend value={k.change} />}
              <span className="truncate text-muted-foreground">{k.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Analytics */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Requests over time" className="lg:col-span-2">
          <div className="flex h-44 items-end gap-1">
            {bars.map((b, i) => (
              <div key={i} className="group relative flex h-full flex-1 items-end">
                <div className="w-full rounded-t bg-primary/80 transition-colors group-hover:bg-primary" style={{ height: `${Math.max(2, (b.n / maxBar) * 100)}%` }} />
                <span className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-popover px-1.5 py-0.5 text-[10px] text-popover-foreground group-hover:block">
                  {b.label}: {b.n}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
            <span>{bars[0]?.label}</span><span>{bars[bars.length - 1]?.label}</span>
          </div>
        </Panel>
        <Panel title="Service distribution">
          {donutTotal === 0 ? <Empty text="No requests in this period." /> : (
            <div className="flex items-center gap-4">
              <Donut values={donut.map((d) => d.requests)} />
              <ul className="min-w-0 flex-1 space-y-1.5 text-xs">
                {donut.map((d, i) => (
                  <li key={d.title} className="flex items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="truncate">{d.title}</span>
                    <span className="ml-auto font-semibold">{Math.round((d.requests / donutTotal) * 100)}%</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>
      </div>

      {/* Top services + quick actions */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Top services" className="lg:col-span-2">
          {top.length === 0 ? <Empty text="No service activity in this period." /> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="pb-2 font-medium">Service</th>
                  <th className="pb-2 text-right font-medium">Requests</th>
                  <th className="pb-2 text-right font-medium">Accepted value</th>
                </tr>
              </thead>
              <tbody>
                {top.slice(0, 6).map((t) => (
                  <tr key={t.title} className="border-t border-border/60">
                    <td className="py-2">
                      {isSuperAdmin && onNavigate ? (
                        <button onClick={() => onNavigate("services")} className="text-left hover:text-primary">{t.title}</button>
                      ) : t.title}
                    </td>
                    <td className="py-2 text-right font-semibold">{t.requests}</td>
                    <td className="py-2 text-right">${t.revenue.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
        <Panel title="Quick actions">
          <div className="grid grid-cols-2 gap-2">
            {actions.map((a) => (
              <button
                key={a.label}
                onClick={() => onNavigate?.(a.tab)}
                className="glass-interactive flex min-h-[44px] items-center gap-2 rounded-lg px-3 text-left text-xs font-semibold"
              >
                <a.icon className="h-3.5 w-3.5 shrink-0 text-primary" />
                {a.label}
              </button>
            ))}
          </div>
        </Panel>
      </div>

      {/* Recent requests */}
      <Panel title="Recent service requests" action={onNavigate && <button onClick={() => onNavigate("dispatch")} className="text-xs font-semibold text-primary">View all</button>}>
        {data.requests.length === 0 ? <Empty text="No service requests yet." /> : (
          <>
            <div className="hidden md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="pb-2 font-medium">Request</th><th className="pb-2 font-medium">Customer</th>
                    <th className="pb-2 font-medium">Service</th><th className="pb-2 font-medium">Technician</th>
                    <th className="pb-2 font-medium">Status</th><th className="pb-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.requests.slice(0, 8).map((r) => (
                    <tr key={r.id} className="border-t border-border/60">
                      <td className="py-2"><p className="font-medium">{r.title}</p><p className="text-[11px] text-muted-foreground">{r.tracking_code}</p></td>
                      <td className="py-2">{profileById.get(r.customer_id)?.full_name ?? "—"}</td>
                      <td className="py-2 text-muted-foreground">{r.service_id ? serviceById.get(r.service_id) : "—"}</td>
                      <td className="py-2 text-muted-foreground">{r.assigned_technician_id ? profileById.get(r.assigned_technician_id)?.full_name ?? "Assigned" : "Unassigned"}</td>
                      <td className="py-2"><StatusBadge status={r.status} /></td>
                      <td className="py-2 text-xs text-muted-foreground">{new Date(r.created_at!).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="space-y-2 md:hidden">
              {data.requests.slice(0, 6).map((r) => (
                <li key={r.id} className="rounded-lg border border-border/60 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">{r.title}</p>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {profileById.get(r.customer_id)?.full_name ?? "—"} · {r.service_id ? serviceById.get(r.service_id) : "—"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{r.tracking_code} · {new Date(r.created_at!).toLocaleDateString()}</p>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>

      {/* Customers, live activity, consultations */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Recent customers">
          {recentCustomers.length === 0 ? <Empty text="No customer activity yet." /> : (
            <ul className="space-y-3">
              {recentCustomers.map((r) => {
                const p = profileById.get(r.customer_id);
                return (
                  <li key={r.customer_id} className="flex items-center gap-3">
                    <Avatar name={p?.full_name ?? "?"} url={p?.avatar_url ?? null} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p?.full_name ?? "Customer"}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {p?.company_name ?? "Individual"} · {r.service_id ? serviceById.get(r.service_id) : r.title}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={cn("text-[11px] font-semibold", p?.is_suspended ? "text-destructive" : "text-success")}>{p?.is_suspended ? "Suspended" : "Active"}</p>
                      <p className="text-[10px] text-muted-foreground">{ago(r.created_at!)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
        <Panel title="Live activity" action={<span className="flex items-center gap-1 text-[10px] text-success"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />Live</span>}>
          {data.logs.length === 0 ? <Empty text="No activity yet." /> : (
            <ul className="space-y-3">
              {data.logs.slice(0, 6).map((l) => {
                const d = (l.details ?? {}) as { status?: string | null; old_status?: string | null };
                const verb = l.action === "insert" ? "New" : l.action === "delete" ? "Removed" : "Updated";
                return (
                  <li key={l.id} className="flex gap-2.5">
                    <ActivityIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium">{verb} {(TABLE_LABEL[l.table_name] ?? l.table_name).toLowerCase()}</p>
                      {d.status && <p className="truncate text-[11px] text-muted-foreground">{d.old_status && d.old_status !== d.status ? `${d.old_status} → ${d.status}` : d.status}</p>}
                    </div>
                    <span className="shrink-0 text-[10px] text-muted-foreground">{ago(l.created_at)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
        <Panel title="Upcoming consultations" action={onNavigate && <button onClick={() => onNavigate("consult")} className="text-xs font-semibold text-primary">Manage</button>}>
          {data.upcoming.length === 0 ? <Empty text="No upcoming consultations." /> : (
            <ul className="space-y-3">
              {data.upcoming.map((c) => (
                <li key={c.id} className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <span className="text-[9px] font-semibold uppercase">{new Date(c.preferred_date).toLocaleDateString(undefined, { month: "short" })}</span>
                    <span className="text-sm font-bold leading-none">{new Date(c.preferred_date).getDate()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.topic}</p>
                    <p className="text-[11px] text-muted-foreground">{profileById.get(c.customer_id)?.full_name ?? "Customer"} · {c.preferred_time} · <span className="capitalize">{c.status}</span></p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Panel({ title, action, className, children }: { title: string; action?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <section className={cn("glass rounded-xl p-4 md:p-5", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-6 text-center text-xs text-muted-foreground">{text}</p>;
}

function Trend({ value }: { value: number | null }) {
  if (value === null) return <span className="font-semibold text-success">New</span>;
  if (value === 0) return <span className="flex items-center gap-0.5 font-semibold text-muted-foreground"><Minus className="h-3 w-3" />0%</span>;
  const up = value > 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return <span className={cn("flex items-center gap-0.5 font-semibold", up ? "text-success" : "text-destructive")}><Icon className="h-3 w-3" />{Math.abs(value)}%</span>;
}

function StatusBadge({ status }: { status: string }) {
  return <span className={cn("inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize", STATUS_STYLE[status] ?? "bg-muted text-muted-foreground")}>{status.replace("_", " ")}</span>;
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) return <img src={url} alt={name} className="h-9 w-9 shrink-0 rounded-full object-cover" />;
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">{initials}</div>;
}

function Donut({ values }: { values: number[] }) {
  const total = values.reduce((s, v) => s + v, 0) || 1;
  const r = 36, c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg viewBox="0 0 100 100" className="h-28 w-28 shrink-0 -rotate-90" role="img" aria-label="Service distribution chart">
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--muted)" strokeWidth="14" />
      {values.map((v, i) => {
        const len = (v / total) * c;
        const el = <circle key={i} cx="50" cy="50" r={r} fill="none" stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth="14" strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} />;
        offset += len;
        return el;
      })}
    </svg>
  );
}
