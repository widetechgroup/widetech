import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CYBER_STATUS, CYBER_STEPS } from "@/lib/cyber";
import { cn } from "@/lib/utils";
import type { TablesUpdate } from "@/integrations/supabase/types";

const sel = "min-h-[40px] rounded-lg border border-border bg-background/60 px-2 text-sm text-foreground";

function Timeline({ id }: { id: string }) {
  const q = useQuery({
    queryKey: ["cyber-events", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("cyber_request_events").select("id,from_status,to_status,note,created_at").eq("request_id", id).order("created_at");
      if (error) throw error;
      return data;
    },
  });
  return (
    <ol className="mt-3 space-y-1 border-l border-border pl-3 text-xs">
      {q.data?.map((e) => (
        <li key={e.id}>
          <span className="font-semibold">{CYBER_STATUS[e.to_status] ?? e.to_status}</span>
          {e.note && <span className="text-muted-foreground"> — {e.note}</span>}
          <span className="text-muted-foreground"> · {new Date(e.created_at).toLocaleString()}</span>
        </li>
      ))}
    </ol>
  );
}

function Steps({ status }: { status: string }) {
  if (status === "cancelled") return <p className="mt-3 text-xs font-semibold text-destructive">Cancelled</p>;
  const idx = Math.max(0, CYBER_STEPS.indexOf(status));
  return (
    <div className="mt-3 flex gap-0.5">
      {CYBER_STEPS.map((s, i) => <div key={s} title={CYBER_STATUS[s]} className={cn("h-1.5 flex-1 rounded-full", i <= idx ? "bg-primary" : "bg-border")} />)}
    </div>
  );
}

/** Customer view: own cyber requests with progress and history. Internal notes are never selected. */
export function MyCyberRequests() {
  const { user } = useAuth();
  const [open, setOpen] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ["my-cyber", user?.id],
    enabled: !!user,
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await supabase.from("cyber_service_requests")
        .select("id,request_code,item_name,security_concern,status,priority,created_at,updated_at")
        .eq("customer_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  if (!q.data?.length) return null;
  return (
    <section className="mt-10">
      <h2 className="text-xl font-extrabold">Cyber security requests</h2>
      <div className="mt-4 space-y-3">
        {q.data.map((r) => (
          <article key={r.id} className="glass rounded-2xl p-5">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
              <div className="min-w-0">
                <h3 className="truncate font-bold">{r.item_name}</h3>
                <p className="text-xs text-muted-foreground">{r.request_code} · {r.security_concern}</p>
              </div>
              <span className="h-fit rounded-full border border-border px-3 py-1 text-xs font-semibold text-accent">{CYBER_STATUS[r.status] ?? r.status}</span>
            </div>
            <Steps status={r.status} />
            <button onClick={() => setOpen(open === r.id ? null : r.id)} className="mt-3 text-xs font-semibold text-primary">{open === r.id ? "Hide history" : "Show history"}</button>
            {open === r.id && <Timeline id={r.id} />}
          </article>
        ))}
      </div>
    </section>
  );
}

/** Staff board: change workflow step, priority, analyst and internal notes. */
export function CyberRequestsBoard() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("open");
  const [open, setOpen] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ["cyber-requests-admin"],
    refetchInterval: 30000,
    queryFn: async () => {
      const [r, p] = await Promise.all([
        supabase.from("cyber_service_requests").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id,role,profiles(full_name)").neq("role", "customer"),
      ]);
      if (r.error) throw r.error;
      const staff = new Map<string, string>();
      for (const x of (p.data ?? []) as { user_id: string; profiles: { full_name: string } | null }[]) staff.set(x.user_id, x.profiles?.full_name ?? "Staff");
      return { rows: r.data, staff: [...staff.entries()] };
    },
  });

  async function update(id: string, patch: TablesUpdate<"cyber_service_requests">) {
    const { error } = await supabase.from("cyber_service_requests").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
    qc.invalidateQueries({ queryKey: ["cyber-requests-admin"] });
    qc.invalidateQueries({ queryKey: ["cyber-events", id] });
  }

  const rows = (q.data?.rows ?? []).filter((r) => filter === "all" ? true : filter === "open" ? !["completed", "closed", "cancelled"].includes(r.status) : r.status === filter);

  return (
    <div className="space-y-3">
      <select value={filter} onChange={(e) => setFilter(e.target.value)} className={sel}>
        <option value="open">Open requests</option><option value="all">All</option>
        {Object.entries(CYBER_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      {q.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {q.error && <p className="text-sm text-destructive">{(q.error as Error).message}</p>}
      {q.data && rows.length === 0 && <p className="glass rounded-2xl p-5 text-sm text-muted-foreground">No requests here.</p>}
      {rows.map((r) => (
        <article key={r.id} className="glass rounded-2xl p-4">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
            <div className="min-w-0">
              <h3 className="truncate font-bold">{r.request_code} · {r.item_name}</h3>
              <p className="text-xs text-muted-foreground">{r.customer_name}{r.organization ? ` · ${r.organization}` : ""} · {r.email}{r.phone ? ` · ${r.phone}` : ""}</p>
            </div>
            <span className="h-fit text-xs capitalize text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <select value={r.status} onChange={(e) => update(r.id, { status: e.target.value })} className={sel}>
              {Object.entries(CYBER_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={r.priority} onChange={(e) => update(r.id, { priority: e.target.value })} className={cn(sel, "capitalize")}>
              {["low", "medium", "high", "critical"].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={r.assigned_to ?? ""} onChange={(e) => update(r.id, { assigned_to: e.target.value || null })} className={sel}>
              <option value="">No analyst</option>
              {q.data!.staff.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          </div>
          <button onClick={() => setOpen(open === r.id ? null : r.id)} className="mt-3 text-xs font-semibold text-primary">{open === r.id ? "Hide details" : "Details & history"}</button>
          {open === r.id && (
            <div className="mt-3 space-y-2 text-sm">
              <p><b>Concern:</b> {r.security_concern}</p>
              <p className="whitespace-pre-wrap text-muted-foreground">{r.description}</p>
              <p className="text-xs text-muted-foreground">
                {r.organization_type} · {r.preferred_method} · preferred {r.preferred_date ?? "—"}
                {r.asset_count != null && ` · ${r.asset_count} systems`}
                {r.website_url && ` · ${r.website_url}`}{r.domain_name && ` · ${r.domain_name}`}{r.application_name && ` · ${r.application_name}`}
              </p>
              {r.additional_info && <p className="text-xs text-muted-foreground">{r.additional_info}</p>}
              <form onSubmit={(e) => { e.preventDefault(); update(r.id, { internal_notes: String(new FormData(e.currentTarget).get("n") ?? "").slice(0, 4000) }); }}>
                <Textarea name="n" defaultValue={r.internal_notes ?? ""} rows={2} placeholder="Internal notes (staff only)" />
                <Button size="sm" className="mt-2" type="submit">Save notes</Button>
              </form>
              <Timeline id={r.id} />
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
