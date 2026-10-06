import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Tables } from "@/integrations/supabase/types";
import { levelTone } from "@/components/CyberAssessments";

type Incident = Tables<"cyber_incidents">;
const sel = "min-h-[40px] w-full rounded-lg border border-border bg-background/60 px-2 text-sm text-foreground";
const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim().slice(0, 6000) || null;

export const INCIDENT_TYPES: Record<string, string> = {
  malware: "Malware", phishing: "Phishing", unauthorized_access: "Unauthorized access", data_exposure: "Data exposure",
  account_compromise: "Account compromise", ransomware: "Ransomware", website_compromise: "Website compromise",
  dos: "Denial of service", suspicious_activity: "Suspicious activity", other: "Other",
};
export const SEVERITY: Record<string, string> = { low: "Low", medium: "Medium", high: "High", critical: "Critical" };
export const INCIDENT_STATUS: Record<string, string> = {
  reported: "Reported", investigating: "Investigating", contained: "Contained", eradication: "Eradication", recovery: "Recovery", closed: "Closed",
};
const opts = (o: Record<string, string>) => Object.entries(o).map(([k, v]) => <option key={k} value={k}>{v}</option>);

function Timeline({ id }: { id: string }) {
  const q = useQuery({
    queryKey: ["incident-events", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("cyber_incident_events").select("*").eq("incident_id", id).order("created_at");
      if (error) throw error; return data;
    },
  });
  return (
    <ol className="mt-2 space-y-1 border-l border-border pl-3">
      {(q.data ?? []).map((e) => (
        <li key={e.id} className="text-xs text-muted-foreground">
          <span className="text-foreground">{new Date(e.created_at).toLocaleString()}</span> · {e.from_status ? `${INCIDENT_STATUS[e.from_status]} → ` : ""}{INCIDENT_STATUS[e.to_status]}{e.note ? ` · ${e.note}` : ""}
        </li>
      ))}
    </ol>
  );
}

/** Staff incident board. */
export function CyberIncidentsBoard() {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<Partial<Incident> | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [st, setSt] = useState("");
  const list = useQuery({
    queryKey: ["cyber-incidents"],
    refetchInterval: 30000,
    queryFn: async () => {
      const [i, p, r] = await Promise.all([
        supabase.from("cyber_incidents").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("id,full_name"),
        supabase.from("user_roles").select("user_id,role"),
      ]);
      if (i.error) throw i.error;
      const names = new Map((p.data ?? []).map((x) => [x.id, x.full_name]));
      const staff = [...new Set((r.data ?? []).filter((x) => x.role !== "customer").map((x) => x.user_id))];
      const customers = [...new Set((r.data ?? []).filter((x) => x.role === "customer").map((x) => x.user_id))];
      return { rows: i.data, names, staff, customers };
    },
  });
  const d = list.data;
  const rows = (d?.rows ?? []).filter((r) => !st || r.status === st);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const title = s(f, "title"); const customer = s(f, "customer_id");
    if (!title || !customer) { toast.error("Title and client are required"); return; }
    const payload = {
      title, customer_id: customer, incident_type: String(f.get("incident_type")), severity: String(f.get("severity")),
      status: String(f.get("status")), handler_id: s(f, "handler_id"), detected_at: s(f, "detected_at"), reported_at: s(f, "reported_at"),
      description: s(f, "description"), actions_taken: s(f, "actions_taken"), lessons_learned: s(f, "lessons_learned"), final_report: s(f, "final_report"),
    };
    const { error } = edit?.id
      ? await supabase.from("cyber_incidents").update(payload).eq("id", edit.id)
      : await supabase.from("cyber_incidents").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Incident saved"); setEdit(null); qc.invalidateQueries({ queryKey: ["cyber-incidents"] });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <select className={`${sel} max-w-[200px]`} value={st} onChange={(e) => setSt(e.target.value)}><option value="">All statuses</option>{opts(INCIDENT_STATUS)}</select>
        <Button onClick={() => setEdit({})}>New incident</Button>
      </div>
      {list.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {list.error && <p className="text-sm text-destructive">{(list.error as Error).message}</p>}
      {d && rows.length === 0 && <p className="text-sm text-muted-foreground">No incidents.</p>}
      <div className="grid gap-2 md:grid-cols-2">
        {rows.map((r) => (
          <div key={r.id} className="rounded-xl border border-border bg-card/60 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0"><p className="truncate font-semibold">{r.title}</p><p className="text-xs text-muted-foreground">{r.incident_code} · {INCIDENT_TYPES[r.incident_type]} · {d?.names.get(r.customer_id)}</p></div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${levelTone(r.severity)}`}>{SEVERITY[r.severity]}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{INCIDENT_STATUS[r.status]} · Handler: {r.handler_id ? d?.names.get(r.handler_id) : "—"} · Detected {r.detected_at ?? "?"}</p>
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setEdit(r)}>Edit</Button>
              <Button size="sm" variant="ghost" onClick={() => setOpen(open === r.id ? null : r.id)}>Timeline</Button>
            </div>
            {open === r.id && <Timeline id={r.id} />}
          </div>
        ))}
      </div>
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{edit?.id ? `Edit ${edit.incident_code}` : "New incident"}</DialogTitle></DialogHeader>
          {edit && d && (
            <form onSubmit={save} className="space-y-3">
              <div><Label>Title</Label><Input name="title" required maxLength={200} defaultValue={edit.title ?? ""} /></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><Label>Client</Label><select name="customer_id" className={sel} defaultValue={edit.customer_id ?? ""} disabled={!!edit.id}>
                  <option value="">—</option>{[...new Set([...d.customers, ...(edit.customer_id ? [edit.customer_id] : [])])].map((id) => <option key={id} value={id}>{d.names.get(id) ?? id}</option>)}</select>
                  {edit.id && <input type="hidden" name="customer_id" value={edit.customer_id ?? ""} />}</div>
                <div><Label>Handler</Label><select name="handler_id" className={sel} defaultValue={edit.handler_id ?? ""}><option value="">—</option>{d.staff.map((id) => <option key={id} value={id}>{d.names.get(id) ?? "Staff"}</option>)}</select></div>
                <div><Label>Type</Label><select name="incident_type" className={sel} defaultValue={edit.incident_type ?? "other"}>{opts(INCIDENT_TYPES)}</select></div>
                <div><Label>Severity</Label><select name="severity" className={sel} defaultValue={edit.severity ?? "medium"}>{opts(SEVERITY)}</select></div>
                <div><Label>Status</Label><select name="status" className={sel} defaultValue={edit.status ?? "reported"}>{opts(INCIDENT_STATUS)}</select></div>
                <div><Label>Date detected</Label><Input type="date" name="detected_at" defaultValue={edit.detected_at ?? ""} /></div>
                <div><Label>Date reported</Label><Input type="date" name="reported_at" defaultValue={edit.reported_at ?? ""} /></div>
              </div>
              <div><Label>Description</Label><Textarea name="description" rows={3} defaultValue={edit.description ?? ""} /></div>
              <div><Label>Actions taken</Label><Textarea name="actions_taken" rows={3} defaultValue={edit.actions_taken ?? ""} /></div>
              <div><Label>Lessons learned</Label><Textarea name="lessons_learned" rows={2} defaultValue={edit.lessons_learned ?? ""} /></div>
              <div><Label>Final report</Label><Textarea name="final_report" rows={3} defaultValue={edit.final_report ?? ""} /></div>
              <Button type="submit" className="w-full">Save</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Customer: report an incident and follow its progress. */
export function MyCyberIncidents() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ["my-incidents", user?.id], enabled: !!user, refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await supabase.from("cyber_incidents")
        .select("id,incident_code,title,incident_type,severity,status,detected_at,created_at,final_report")
        .eq("customer_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error; return data;
    },
  });
  async function report(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const title = s(f, "title");
    if (!title || !user) { toast.error("Please give the incident a title"); return; }
    const { error } = await supabase.from("cyber_incidents").insert({
      title, customer_id: user.id, incident_type: String(f.get("incident_type")), severity: String(f.get("severity")),
      detected_at: s(f, "detected_at"), description: s(f, "description"),
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Incident reported — our team will respond"); setForm(false); qc.invalidateQueries({ queryKey: ["my-incidents"] });
  }
  return (
    <section className="mt-10">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <h2 className="truncate text-xl font-extrabold">Security incidents</h2>
        <button onClick={() => setForm(true)} className="glass-interactive min-h-[48px] shrink-0 rounded-xl px-5 text-sm font-semibold">Report incident</button>
      </header>
      <div className="mt-4 space-y-3">
        {q.data?.length === 0 && <div className="glass rounded-2xl p-6 text-sm text-muted-foreground">No incidents reported.</div>}
        {q.data?.map((r) => (
          <article key={r.id} className="glass rounded-2xl p-5">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <div className="min-w-0"><h3 className="truncate font-bold">{r.title}</h3><p className="text-xs text-muted-foreground">{r.incident_code} · {INCIDENT_TYPES[r.incident_type]}</p></div>
              <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${levelTone(r.severity)}`}>{INCIDENT_STATUS[r.status]}</span>
            </div>
            {r.final_report && <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{r.final_report}</p>}
            <button className="mt-2 text-xs font-semibold text-primary" onClick={() => setOpen(open === r.id ? null : r.id)}>{open === r.id ? "Hide history" : "Show history"}</button>
            {open === r.id && <Timeline id={r.id} />}
          </article>
        ))}
      </div>
      <Dialog open={form} onOpenChange={setForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Report a security incident</DialogTitle></DialogHeader>
          <form onSubmit={report} className="space-y-3">
            <div><Label>What happened?</Label><Input name="title" required maxLength={200} /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Type</Label><select name="incident_type" className={sel} defaultValue="suspicious_activity">{opts(INCIDENT_TYPES)}</select></div>
              <div><Label>How serious?</Label><select name="severity" className={sel} defaultValue="medium">{opts(SEVERITY)}</select></div>
              <div><Label>When noticed</Label><Input type="date" name="detected_at" /></div>
            </div>
            <div><Label>Details</Label><Textarea name="description" rows={4} maxLength={6000} /></div>
            <p className="text-xs text-muted-foreground">Never send passwords here.</p>
            <Button type="submit" className="w-full">Send report</Button>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
