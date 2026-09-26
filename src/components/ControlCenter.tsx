import { useQuery } from "@tanstack/react-query";
import { Users, UserCheck, UserRound, Briefcase, Clock, ClipboardList, FolderKanban, LifeBuoy, Receipt, Wallet, MessageSquare, HardDrive,
  UserPlus, ShieldCheck, Tags, ImageUp, History, Settings, type LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/lib/company";
import type { DashTab } from "@/routes/_authenticated/dashboard";

const STAFF = ["super_admin", "admin", "operator", "technician", "operations_manager", "sales", "consultant", "support", "finance", "content_manager"];
const fmtBytes = (n: number) => n > 1073741824 ? `${(n / 1073741824).toFixed(2)} GB` : n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`;

export function ControlCenter({ onNavigate }: { onNavigate: (t: DashTab, extra?: Record<string, string>) => void }) {
  const company = useCompany();
  const stats = useQuery({
    queryKey: ["control-center"],
    queryFn: async () => {
      const head = { count: "exact" as const, head: true };
      const [profiles, roles, reqs, projects, tickets, quotes, media, files] = await Promise.all([
        supabase.from("profiles").select("id,account_status"),
        supabase.from("user_roles").select("user_id,role"),
        supabase.from("service_requests").select("id", head),
        supabase.from("projects").select("id", head).eq("status", "active"),
        supabase.from("support_tickets").select("id", head).neq("status", "closed"),
        supabase.from("quotations").select("amount_usd,status"),
        supabase.from("media_assets").select("size_bytes"),
        supabase.from("request_files").select("size_bytes"),
      ]);
      const p = profiles.data ?? [];
      const r = roles.data ?? [];
      const staffIds = new Set(r.filter((x) => STAFF.includes(x.role)).map((x) => x.user_id));
      const customerIds = new Set(r.filter((x) => x.role === "customer").map((x) => x.user_id));
      const accepted = (quotes.data ?? []).filter((q) => q.status === "accepted");
      const storage = [...(media.data ?? []), ...(files.data ?? [])].reduce((s, x) => s + Number(x.size_bytes ?? 0), 0);
      return {
        total: p.length, active: p.filter((x) => x.account_status === "active").length, pending: p.filter((x) => x.account_status === "pending").length,
        customers: customerIds.size, staff: staffIds.size, requests: reqs.count ?? 0, projects: projects.count ?? 0, tickets: tickets.count ?? 0,
        revenue: accepted.reduce((s, q) => s + Number(q.amount_usd), 0), storage,
      };
    },
    refetchInterval: 60000,
  });

  const s = stats.data;
  const kpis: { label: string; value: string; icon: LucideIcon; note?: string; tab?: DashTab }[] = [
    { label: "Total users", value: String(s?.total ?? "…"), icon: Users, tab: "team" },
    { label: "Active users", value: String(s?.active ?? "…"), icon: UserCheck, tab: "team" },
    { label: "Customers", value: String(s?.customers ?? "…"), icon: UserRound, tab: "team" },
    { label: "Staff", value: String(s?.staff ?? "…"), icon: Briefcase, tab: "team" },
    { label: "Pending users", value: String(s?.pending ?? "…"), icon: Clock, tab: "team" },
    { label: "Service requests", value: String(s?.requests ?? "…"), icon: ClipboardList, tab: "dispatch" },
    { label: "Active projects", value: String(s?.projects ?? "…"), icon: FolderKanban, tab: "projects" },
    { label: "Open tickets", value: String(s?.tickets ?? "…"), icon: LifeBuoy },
    { label: "Invoices", value: "—", icon: Receipt, note: "Invoices not built yet" },
    { label: "Revenue (accepted quotes)", value: s ? `$${s.revenue.toLocaleString()}` : "…", icon: Wallet, note: s ? `TZS ${company.toTzs(s.revenue).toLocaleString()}` : undefined },
    { label: "Unread messages", value: "—", icon: MessageSquare, note: "Read receipts not built yet" },
    { label: "Storage used", value: s ? fmtBytes(s.storage) : "…", icon: HardDrive, tab: "media" },
  ];

  const actions: { label: string; icon: LucideIcon; go: () => void }[] = [
    { label: "Create user", icon: UserPlus, go: () => onNavigate("team", { create: "1" }) },
    { label: "Assign role", icon: ShieldCheck, go: () => onNavigate("team") },
    { label: "Add service", icon: Tags, go: () => onNavigate("services") },
    { label: "Upload media", icon: ImageUp, go: () => onNavigate("media") },
    { label: "View audit logs", icon: History, go: () => onNavigate("activity") },
    { label: "System settings", icon: Settings, go: () => onNavigate("settings") },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Super Admin</p>
        <h2 className="text-xl font-extrabold md:text-2xl">WideTech Control Center</h2>
      </div>
      <section aria-label="Quick actions">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {actions.map((a) => (
            <button key={a.label} onClick={a.go} className="glass flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-2xl p-3 text-xs font-semibold hover:border-primary">
              <a.icon className="h-5 w-5 text-primary" /> + {a.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">Custom roles, permission editor, products, invoices and announcements arrive in the next stages.</p>
      </section>
      <section aria-label="Key numbers" className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {kpis.map((k) => {
          const Inner = (
            <>
              <div className="flex items-center justify-between"><p className="text-xs text-muted-foreground">{k.label}</p><k.icon className="h-4 w-4 text-accent" /></div>
              <p className="mt-1 text-2xl font-extrabold">{k.value}</p>
              {k.note && <p className="text-[11px] text-muted-foreground">{k.note}</p>}
            </>
          );
          return k.tab
            ? <button key={k.label} onClick={() => onNavigate(k.tab!)} className="glass rounded-2xl p-4 text-left hover:border-primary">{Inner}</button>
            : <div key={k.label} className="glass rounded-2xl p-4">{Inner}</div>;
        })}
      </section>
      {stats.isError && <p className="text-sm text-destructive">Couldn't load some numbers. Try refreshing.</p>}
    </div>
  );
}
