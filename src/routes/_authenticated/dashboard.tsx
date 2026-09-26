import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRoles, type AppRole } from "@/hooks/useRoles";
import { cn } from "@/lib/utils";
import { companyQuery } from "@/lib/company";
import { ServicesManager } from "@/components/ServicesManager";
import { Overview } from "@/components/Overview";
import { UsersManager } from "@/components/UsersManager";
import { MediaManager } from "@/components/MediaManager";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Operations dashboard — WideTech Group" },
      { name: "description", content: "Dispatch requests, schedule consultations and manage the WideTech team." },
      { property: "og:title", content: "Operations dashboard — WideTech Group" },
      { property: "og:description", content: "WideTech staff and technician workspace." },
    ],
  }),
  component: DashboardPage,
});

const STATUSES = ["pending", "reviewing", "quoted", "in_progress", "completed", "cancelled"] as const;
type Status = (typeof STATUSES)[number];
const CONSULT_STATUSES = ["requested", "confirmed", "completed", "cancelled"];
const ROLES: AppRole[] = ["super_admin", "admin", "operator", "technician", "customer"];

const selectCls =
  "min-h-[40px] rounded-lg border border-border bg-background/60 px-2 text-sm text-foreground";

function DashboardPage() {
  const { isStaff, isSuperAdmin, isTechnician, loading } = useRoles();
  const [tab, setTab] = useState<"overview" | "dispatch" | "consult" | "projects" | "activity" | "settings" | "team" | "jobs" | "services" | "media">("overview");

  if (loading) return <p className="p-8 text-sm text-muted-foreground">Loading…</p>;
  if (!isStaff && !isTechnician)
    return (
      <div className="mx-auto max-w-xl p-8">
        <div className="glass rounded-2xl p-6 text-sm text-muted-foreground">
          This area is for WideTech staff. Your requests live under “Requests”.
        </div>
      </div>
    );

  const tabs = [
    ...(isStaff ? [{ id: "overview", label: "Overview" }, { id: "dispatch", label: "Dispatch" }, { id: "consult", label: "Consultations" }, { id: "projects", label: "Projects" }, { id: "activity", label: "Activity" }] : []),
    ...(isTechnician ? [{ id: "jobs", label: "My jobs" }] : []),
    ...(isSuperAdmin ? [{ id: "services", label: "Services & prices" }, { id: "team", label: "Users" }, { id: "media", label: "Media" }, { id: "settings", label: "Company settings" }] : []),
  ] as { id: typeof tab; label: string }[];
  const active = tabs.some((t) => t.id === tab) ? tab : tabs[0]!.id;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <h1 className="text-2xl font-extrabold md:text-3xl">Operations</h1>
      <div className="mt-4 flex gap-2 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "min-h-[40px] shrink-0 rounded-full border border-border px-4 text-sm font-semibold",
              active === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mt-6">
        {active === "overview" && <Overview />}
        {active === "dispatch" && <Dispatch />}
        {active === "consult" && <Consultations />}
        {active === "projects" && <Projects />}
        {active === "jobs" && <Dispatch technicianOnly />}
        {active === "team" && <UsersManager />}
        {active === "activity" && <Activity />}
        {active === "settings" && <Settings />}
        {active === "services" && <ServicesManager />}
        {active === "media" && <MediaManager />}
      </div>
    </div>
  );
}

function useProfiles(enabled: boolean) {
  return useQuery({
    queryKey: ["staff-profiles"],
    enabled,
    queryFn: async () => {
      const [p, r] = await Promise.all([
        supabase.from("profiles").select("id,full_name,email,phone,company_name"),
        supabase.from("user_roles").select("user_id,role"),
      ]);
      if (p.error) throw p.error;
      if (r.error) throw r.error;
      return (p.data ?? []).map((prof) => ({
        ...prof,
        roles: (r.data ?? []).filter((x) => x.user_id === prof.id).map((x) => x.role as AppRole),
      }));
    },
  });
}

function Dispatch({ technicianOnly = false }: { technicianOnly?: boolean }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const profiles = useProfiles(!technicianOnly);
  const [filter, setFilter] = useState<Status | "all">("all");

  const requests = useQuery({
    queryKey: ["dispatch", technicianOnly, user?.id],
    queryFn: async () => {
      let q = supabase
        .from("service_requests")
        .select("id,tracking_code,title,description,urgency,status,customer_id,assigned_technician_id,created_at,services(title)")
        .order("created_at", { ascending: false });
      if (technicianOnly) q = q.eq("assigned_technician_id", user!.id);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const technicians = (profiles.data ?? []).filter((p) => p.roles.includes("technician"));
  const nameOf = (id: string | null) => profiles.data?.find((p) => p.id === id)?.full_name ?? "—";

  const update = async (id: string, patch: { status?: Status; assigned_technician_id?: string | null }) => {
    const { error } = await supabase
      .from("service_requests")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Updated");
    qc.invalidateQueries({ queryKey: ["dispatch"] });
  };

  const rows = (requests.data ?? []).filter((r) => filter === "all" || r.status === filter);
  const counts = STATUSES.map((s) => ({ s, n: (requests.data ?? []).filter((r) => r.status === s).length }));

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
        {counts.map(({ s, n }) => (
          <button
            key={s}
            onClick={() => setFilter(filter === s ? "all" : s)}
            className={cn("glass rounded-xl p-3 text-left", filter === s && "ring-2 ring-primary")}
          >
            <p className="text-xl font-extrabold">{n}</p>
            <p className="text-[11px] capitalize text-muted-foreground">{s.replace("_", " ")}</p>
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        {requests.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!requests.isLoading && rows.length === 0 && (
          <div className="glass rounded-2xl p-6 text-sm text-muted-foreground">Nothing here yet.</div>
        )}
        {rows.map((r) => (
          <article key={r.id} className="glass rounded-2xl p-5">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
              <div className="min-w-0">
                <h3 className="truncate font-bold">{r.title}</h3>
                <p className="text-xs text-muted-foreground">
                  {r.tracking_code} · {(r.services as { title: string } | null)?.title ?? "General"} ·{" "}
                  <span className="capitalize">{r.urgency}</span>
                  {!technicianOnly && ` · ${nameOf(r.customer_id)}`}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">
                {r.created_at ? new Date(r.created_at).toLocaleDateString() : ""}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{r.description}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                Status
                <select
                  className={selectCls}
                  value={r.status}
                  onChange={(e) => update(r.id, { status: e.target.value as Status })}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s.replace("_", " ")}</option>
                  ))}
                </select>
              </label>
              {!technicianOnly && (
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  Technician
                  <select
                    className={selectCls}
                    value={r.assigned_technician_id ?? ""}
                    onChange={(e) =>
                      update(r.id, {
                        assigned_technician_id: e.target.value || null,
                        ...(e.target.value && r.status === "pending" ? { status: "reviewing" as Status } : {}),
                      })
                    }
                  >
                    <option value="">Unassigned</option>
                    {technicians.map((t) => (
                      <option key={t.id} value={t.id}>{t.full_name}</option>
                    ))}
                  </select>
                </label>
              )}
              {!technicianOnly && r.customer_id && (
                <form
                  className="flex flex-wrap items-center gap-2"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    const amount = Number(f.get("amount"));
                    if (!amount || amount <= 0) { toast.error("Enter an amount"); return; }
                    const { error } = await supabase.from("quotations").insert({
                      request_id: r.id,
                      customer_id: r.customer_id!,
                      amount_usd: amount,
                      notes: String(f.get("notes") || "") || null,
                      created_by: user?.id ?? null,
                    });
                    if (error) { toast.error(error.message); return; }
                    toast.success("Quote sent");
                    e.currentTarget.reset();
                    qc.invalidateQueries({ queryKey: ["dispatch"] });
                  }}
                >
                  <input name="amount" type="number" min="1" placeholder="Quote USD" className={cn(selectCls, "w-28 px-3")} />
                  <input name="notes" placeholder="Scope / notes" className={cn(selectCls, "w-44 px-3")} />
                  <button className="min-h-[40px] rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground">Send quote</button>
                </form>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function Consultations() {
  const qc = useQueryClient();
  const profiles = useProfiles(true);
  const list = useQuery({
    queryKey: ["staff-consultations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consultations")
        .select("id,topic,preferred_date,preferred_time,status,meeting_link,customer_id")
        .order("preferred_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const update = async (id: string, patch: { status?: string; meeting_link?: string }) => {
    const { error } = await supabase.from("consultations").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Updated");
    qc.invalidateQueries({ queryKey: ["staff-consultations"] });
  };

  return (
    <div className="space-y-3">
      {list.data?.length === 0 && (
        <div className="glass rounded-2xl p-6 text-sm text-muted-foreground">No consultations yet.</div>
      )}
      {list.data?.map((c) => (
        <article key={c.id} className="glass rounded-2xl p-5">
          <h3 className="font-bold">{c.topic}</h3>
          <p className="text-xs text-muted-foreground">
            {c.preferred_date} at {c.preferred_time} EAT ·{" "}
            {profiles.data?.find((p) => p.id === c.customer_id)?.full_name ?? "Customer"}
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <select className={selectCls} value={c.status} onChange={(e) => update(c.id, { status: e.target.value })}>
              {CONSULT_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <input
              defaultValue={c.meeting_link ?? ""}
              placeholder="Meeting link (press Enter)"
              className={cn(selectCls, "min-w-0 flex-1 px-3")}
              onKeyDown={(e) => {
                if (e.key === "Enter") update(c.id, { meeting_link: e.currentTarget.value });
              }}
            />
          </div>
        </article>
      ))}
    </div>
  );
}

function Projects() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["staff-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id,title,status,progress")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const update = async (id: string, patch: { status?: string; progress?: number }) => {
    const { error } = await supabase.from("projects").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Updated");
    qc.invalidateQueries({ queryKey: ["staff-projects"] });
  };
  return (
    <div className="space-y-3">
      {list.data?.length === 0 && (
        <div className="glass rounded-2xl p-6 text-sm text-muted-foreground">No projects yet. Accepted quotes appear here.</div>
      )}
      {list.data?.map((p) => (
        <article key={p.id} className="glass rounded-2xl p-5">
          <h3 className="truncate font-bold">{p.title}</h3>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <select className={selectCls} value={p.status} onChange={(e) => update(p.id, { status: e.target.value })}>
              {["active", "on_hold", "completed"].map((s) => (
                <option key={s} value={s}>{s.replace("_", " ")}</option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              Progress
              <input
                type="range" min={0} max={100} step={10} defaultValue={p.progress}
                onMouseUp={(e) => update(p.id, { progress: Number(e.currentTarget.value) })}
                onTouchEnd={(e) => update(p.id, { progress: Number(e.currentTarget.value) })}
              />
              {p.progress}%
            </label>
          </div>
        </article>
      ))}
    </div>
  );
}

function Activity() {
  const profiles = useProfiles(true);
  const logs = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id,actor_id,action,table_name,details,created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
  const who = (id: string | null) => (id ? profiles.data?.find((p) => p.id === id)?.full_name ?? "Someone" : "System");
  const label: Record<string, string> = {
    service_requests: "request", quotations: "quote", projects: "project", user_roles: "role", company_settings: "company settings",
  };
  return (
    <div className="glass divide-y divide-border rounded-2xl">
      {logs.data?.length === 0 && <p className="p-5 text-sm text-muted-foreground">No activity yet.</p>}
      {logs.data?.map((l) => {
        const d = (l.details ?? {}) as { role?: string; status?: string; old_status?: string };
        const extra = d.role ? ` (${d.role})` : d.old_status && d.status && d.old_status !== d.status ? `: ${d.old_status} → ${d.status}` : "";
        return (
          <div key={l.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 p-4 text-sm">
            <p className="min-w-0">
              <span className="font-semibold">{who(l.actor_id)}</span>{" "}
              <span className="text-muted-foreground">{l.action}d {label[l.table_name] ?? l.table_name}{extra}</span>
            </p>
            <span className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString()}</span>
          </div>
        );
      })}
    </div>
  );
}

function Settings() {
  const qc = useQueryClient();
  const q = useQuery(companyQuery);
  if (!q.data) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const s = q.data;
  const fields = [
    ["company_name", "Company name"], ["legal_name", "Legal company name"], ["tagline", "Tagline"],
    ["short_description", "Short description"], ["phone", "Phone"], ["whatsapp", "WhatsApp"],
    ["email", "Email"], ["website", "Website"], ["address", "Address"], ["business_hours", "Business hours"],
    ["tax_number", "TIN / VAT number"], ["facebook_url", "Facebook link"], ["instagram_url", "Instagram link"],
    ["linkedin_url", "LinkedIn link"], ["usd_tzs_rate", "1 USD → TZS"], ["usd_eur_rate", "1 USD → EUR"],
  ] as const;
  return (
    <form
      className="glass grid gap-4 rounded-2xl p-5 md:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const v = (k: string) => String(f.get(k) ?? "").trim();
        const o = (k: string) => v(k) || null;
        const { error } = await supabase.from("company_settings").update({
          company_name: v("company_name") || s.company_name,
          tagline: v("tagline") || s.tagline,
          legal_name: o("legal_name"), short_description: o("short_description"),
          phone: o("phone"), whatsapp: o("whatsapp"), email: o("email"), address: o("address"),
          website: o("website"), business_hours: o("business_hours"), tax_number: o("tax_number"),
          facebook_url: o("facebook_url"), instagram_url: o("instagram_url"), linkedin_url: o("linkedin_url"),
          usd_tzs_rate: Number(v("usd_tzs_rate")) || s.usd_tzs_rate,
          usd_eur_rate: Number(v("usd_eur_rate")) || s.usd_eur_rate,
          updated_at: new Date().toISOString(),
        }).eq("id", 1);
        if (error) { toast.error(error.message); return; }
        toast.success("Settings saved");
        qc.invalidateQueries({ queryKey: ["company-settings"] });
      }}
    >
      {fields.map(([k, lbl]) => (
        <label key={k} className="grid gap-1 text-xs text-muted-foreground">
          {lbl}
          <input name={k} defaultValue={String(s[k] ?? "")} className={cn(selectCls, "px-3")} />
        </label>
      ))}
      <button className="min-h-[44px] rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground md:col-span-2">Save settings</button>
    </form>
  );
}
