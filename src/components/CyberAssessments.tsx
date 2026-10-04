import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

type Assessment = Tables<"cyber_assessments">;
type Finding = Tables<"cyber_findings">;
type Risk = Tables<"cyber_risks">;
const sel = "min-h-[40px] w-full rounded-lg border border-border bg-background/60 px-2 text-sm text-foreground";
const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim().slice(0, 4000) || null;

export const ASSESS_STATUS: Record<string, string> = { planned: "Planned", in_progress: "In progress", completed: "Completed", reviewed: "Reviewed" };
const ASSESS_TYPES: Record<string, string> = {
  vulnerability: "Vulnerability assessment", penetration: "Penetration test", web_app: "Web application test", mobile_app: "Mobile application test",
  network: "Network assessment", cloud: "Cloud assessment", audit: "Security audit", compliance: "Compliance assessment", risk: "Risk assessment", other: "Other",
};
export const RISK_LEVELS: Record<string, string> = { informational: "Informational", low: "Low", medium: "Medium", high: "High", critical: "Critical" };
export const FINDING_STATUS: Record<string, string> = { open: "Open", accepted: "Accepted", in_progress: "In progress", resolved: "Resolved", retest_required: "Retest required", closed: "Closed" };
const TREATMENT: Record<string, string> = { mitigate: "Mitigate", accept: "Accept", transfer: "Transfer", avoid: "Avoid" };
const RISK_STATUS: Record<string, string> = { open: "Open", in_progress: "In progress", closed: "Closed" };

export function levelTone(l: string) {
  return l === "critical" ? "bg-destructive/20 text-destructive" : l === "high" ? "bg-primary/20 text-primary" : l === "medium" ? "bg-accent/30 text-foreground" : "bg-muted text-muted-foreground";
}

function useLookups() {
  return useQuery({
    queryKey: ["cyber-lookups"],
    queryFn: async () => {
      const [p, a, pr, st] = await Promise.all([
        supabase.from("cyber_projects").select("id,project_code,name,customer_id").order("created_at", { ascending: false }),
        supabase.from("cyber_assets").select("id,name,project_id,customer_id"),
        supabase.from("profiles").select("id,full_name"),
        supabase.from("user_roles").select("user_id").neq("role", "customer"),
      ]);
      const names = new Map((pr.data ?? []).map((x) => [x.id, x.full_name]));
      const staffIds = [...new Set((st.data ?? []).map((x) => x.user_id))];
      return { projects: p.data ?? [], assets: a.data ?? [], names, staff: staffIds.map((id) => [id, names.get(id) ?? "Staff"] as const) };
    },
  });
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", className)}>{children}</span>;
}

function Filters({ q, setQ, status, setStatus, options }: { q: string; setQ: (v: string) => void; status: string; setStatus: (v: string) => void; options: Record<string, string> }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
      <select className={cn(sel, "w-auto")} value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="">All</option>{Object.entries(options).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
    </div>
  );
}

/** Staff hub for assessments, findings and the risk register. */
export function CyberSecurityRecords() {
  const [tab, setTab] = useState<"assessments" | "findings" | "risks">("assessments");
  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-lg border border-border bg-card/40 p-1 w-fit">
        {(["assessments", "findings", "risks"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-md px-3 py-1.5 text-xs capitalize ${tab === t ? "bg-secondary text-secondary-foreground" : "text-muted-foreground"}`}>{t === "risks" ? "Risk register" : t}</button>
        ))}
      </div>
      {tab === "assessments" && <Assessments />}
      {tab === "findings" && <Findings />}
      {tab === "risks" && <Risks />}
    </div>
  );
}

function Assessments() {
  const qc = useQueryClient();
  const lk = useLookups();
  const [edit, setEdit] = useState<Partial<Assessment> | null>(null);
  const [q, setQ] = useState(""); const [st, setSt] = useState("");
  const list = useQuery({
    queryKey: ["cyber-assessments"],
    queryFn: async () => { const { data, error } = await supabase.from("cyber_assessments").select("*").order("created_at", { ascending: false }); if (error) throw error; return data; },
  });
  const rows = (list.data ?? []).filter((r) => (!st || r.status === st) && (!q || r.name.toLowerCase().includes(q.toLowerCase())));

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const project = lk.data?.projects.find((p) => p.id === f.get("project_id"));
    if (!project) { toast.error("Choose a project"); return; }
    const payload = {
      project_id: project.id, customer_id: project.customer_id, name: s(f, "name") ?? "Assessment",
      assessment_type: String(f.get("assessment_type")), scope: s(f, "scope"), methodology: s(f, "methodology"),
      start_date: s(f, "start_date"), end_date: s(f, "end_date"), analyst_id: s(f, "analyst_id"), status: String(f.get("status")),
      executive_summary: s(f, "executive_summary"), recommendations: s(f, "recommendations"),
    };
    const { error } = edit?.id ? await supabase.from("cyber_assessments").update(payload).eq("id", edit.id) : await supabase.from("cyber_assessments").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Assessment saved"); setEdit(null); qc.invalidateQueries({ queryKey: ["cyber-assessments"] });
  }
  async function remove(r: Assessment) {
    if (!confirm(`Delete "${r.name}" and its findings?`)) return;
    const { error } = await supabase.from("cyber_assessments").delete().eq("id", r.id);
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["cyber-assessments"] });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Filters q={q} setQ={setQ} status={st} setStatus={setSt} options={ASSESS_STATUS} />
        <Button onClick={() => setEdit({})} disabled={!lk.data?.projects.length}>New assessment</Button>
      </div>
      {!lk.data?.projects.length && <p className="text-sm text-muted-foreground">Create a cyber project first — assessments belong to a project.</p>}
      {rows.length === 0 ? <p className="text-sm text-muted-foreground">No assessments yet.</p> : (
        <div className="grid gap-2 md:grid-cols-2">
          {rows.map((r) => {
            const p = lk.data?.projects.find((x) => x.id === r.project_id);
            return (
              <div key={r.id} className="rounded-xl border border-border bg-card/60 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div><p className="font-semibold text-foreground">{r.name}</p><p className="text-xs text-muted-foreground">{ASSESS_TYPES[r.assessment_type] ?? r.assessment_type} · {p?.project_code} · {lk.data?.names.get(r.customer_id)}</p></div>
                  <Badge className="bg-secondary/20 text-secondary">{ASSESS_STATUS[r.status]}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Analyst: {r.analyst_id ? lk.data?.names.get(r.analyst_id) : "—"} · {r.start_date ?? "?"} → {r.end_date ?? "?"}</p>
                <div className="mt-2 flex gap-2"><Button size="sm" variant="outline" onClick={() => setEdit(r)}>Edit</Button><Button size="sm" variant="ghost" onClick={() => remove(r)}>Delete</Button></div>
              </div>
            );
          })}
        </div>
      )}
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{edit?.id ? "Edit assessment" : "New assessment"}</DialogTitle></DialogHeader>
          {edit && (
            <form onSubmit={save} className="space-y-3">
              <div><Label>Name</Label><Input name="name" required defaultValue={edit.name ?? ""} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Type</Label><select name="assessment_type" className={sel} defaultValue={edit.assessment_type ?? "vulnerability"}>{Object.entries(ASSESS_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                <div><Label>Status</Label><select name="status" className={sel} defaultValue={edit.status ?? "planned"}>{Object.entries(ASSESS_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              </div>
              <div><Label>Project</Label><select name="project_id" required className={sel} defaultValue={edit.project_id ?? ""}><option value="">Choose…</option>{lk.data?.projects.map((p) => <option key={p.id} value={p.id}>{p.project_code} · {p.name}</option>)}</select></div>
              <div><Label>Security analyst</Label><select name="analyst_id" className={sel} defaultValue={edit.analyst_id ?? ""}><option value="">Unassigned</option>{lk.data?.staff.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Start</Label><Input type="date" name="start_date" defaultValue={edit.start_date ?? ""} /></div>
                <div><Label>End</Label><Input type="date" name="end_date" defaultValue={edit.end_date ?? ""} /></div>
              </div>
              <div><Label>Scope</Label><Textarea name="scope" defaultValue={edit.scope ?? ""} /></div>
              <div><Label>Methodology</Label><Textarea name="methodology" defaultValue={edit.methodology ?? ""} /></div>
              <div><Label>Executive summary</Label><Textarea name="executive_summary" defaultValue={edit.executive_summary ?? ""} /></div>
              <div><Label>Recommendations</Label><Textarea name="recommendations" defaultValue={edit.recommendations ?? ""} /></div>
              <p className="text-xs text-muted-foreground">Customers see an assessment only once it is marked Reviewed.</p>
              <Button type="submit" className="w-full">Save</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Findings() {
  const qc = useQueryClient();
  const lk = useLookups();
  const [edit, setEdit] = useState<Partial<Finding> | null>(null);
  const [q, setQ] = useState(""); const [st, setSt] = useState(""); const [lvl, setLvl] = useState("");
  const list = useQuery({
    queryKey: ["cyber-findings"],
    queryFn: async () => {
      const [f, a] = await Promise.all([
        supabase.from("cyber_findings").select("*").order("created_at", { ascending: false }),
        supabase.from("cyber_assessments").select("id,name,customer_id,project_id"),
      ]);
      if (f.error) throw f.error;
      return { findings: f.data, assessments: a.data ?? [] };
    },
  });
  const rows = (list.data?.findings ?? []).filter((r) => (!st || r.status === st) && (!lvl || r.risk_level === lvl) && (!q || `${r.title} ${r.finding_code}`.toLowerCase().includes(q.toLowerCase())));
  const editAssess = list.data?.assessments.find((a) => a.id === edit?.assessment_id);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const a = list.data?.assessments.find((x) => x.id === f.get("assessment_id"));
    if (!a) { toast.error("Choose an assessment"); return; }
    const payload = {
      assessment_id: a.id, customer_id: a.customer_id, asset_id: s(f, "asset_id"), title: s(f, "title") ?? "Finding",
      description: s(f, "description"), risk_level: String(f.get("risk_level")), business_impact: s(f, "business_impact"),
      technical_impact: s(f, "technical_impact"), evidence_ref: s(f, "evidence_ref"), remediation: s(f, "remediation"),
      responsible: s(f, "responsible"), due_date: s(f, "due_date"), status: String(f.get("status")), resolution_notes: s(f, "resolution_notes"),
    };
    const { error } = edit?.id ? await supabase.from("cyber_findings").update(payload).eq("id", edit.id) : await supabase.from("cyber_findings").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Finding saved"); setEdit(null); qc.invalidateQueries({ queryKey: ["cyber-findings"] });
  }
  async function remove(r: Finding) {
    if (!confirm(`Delete ${r.finding_code}?`)) return;
    const { error } = await supabase.from("cyber_findings").delete().eq("id", r.id);
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["cyber-findings"] });
  }
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of list.data?.findings ?? []) if (!["resolved", "closed"].includes(r.status)) c[r.risk_level] = (c[r.risk_level] ?? 0) + 1;
    return c;
  }, [list.data]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-5 gap-2">
        {Object.entries(RISK_LEVELS).map(([k, v]) => (
          <button key={k} onClick={() => setLvl(lvl === k ? "" : k)} className={cn("rounded-xl border border-border p-2 text-left", lvl === k && "ring-2 ring-primary")}>
            <p className="text-[11px] text-muted-foreground">{v} open</p><p className="text-xl font-bold text-foreground">{counts[k] ?? 0}</p>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Filters q={q} setQ={setQ} status={st} setStatus={setSt} options={FINDING_STATUS} />
        <Button onClick={() => setEdit({})} disabled={!list.data?.assessments.length}>New finding</Button>
      </div>
      {!list.data?.assessments.length && <p className="text-sm text-muted-foreground">Create an assessment first — findings belong to an assessment.</p>}
      {rows.length === 0 ? <p className="text-sm text-muted-foreground">No findings match.</p> : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card/60 p-3">
              <div className="min-w-0">
                <p className="font-semibold text-foreground"><span className="mr-2 font-mono text-xs text-muted-foreground">{r.finding_code}</span>{r.title}</p>
                <p className="text-xs text-muted-foreground">{lk.data?.names.get(r.customer_id)} · due {r.due_date ?? "—"} · {r.responsible ?? "no owner"}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={levelTone(r.risk_level)}>{RISK_LEVELS[r.risk_level]}</Badge>
                <Badge className="bg-muted text-foreground">{FINDING_STATUS[r.status]}</Badge>
                <Button size="sm" variant="outline" onClick={() => setEdit(r)}>Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => remove(r)}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{edit?.id ? `Edit ${edit.finding_code}` : "New finding"}</DialogTitle></DialogHeader>
          {edit && (
            <form onSubmit={save} className="space-y-3">
              <div><Label>Title</Label><Input name="title" required defaultValue={edit.title ?? ""} /></div>
              <div><Label>Assessment</Label><select name="assessment_id" required className={sel} defaultValue={edit.assessment_id ?? ""}><option value="">Choose…</option>{list.data?.assessments.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
              <div><Label>Affected asset</Label><select name="asset_id" className={sel} defaultValue={edit.asset_id ?? ""}><option value="">None</option>{lk.data?.assets.filter((x) => !editAssess || x.customer_id === editAssess.customer_id).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Risk level</Label><select name="risk_level" className={sel} defaultValue={edit.risk_level ?? "medium"}>{Object.entries(RISK_LEVELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                <div><Label>Status</Label><select name="status" className={sel} defaultValue={edit.status ?? "open"}>{Object.entries(FINDING_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              </div>
              <div><Label>Description</Label><Textarea name="description" defaultValue={edit.description ?? ""} /></div>
              <div><Label>Business impact</Label><Textarea name="business_impact" defaultValue={edit.business_impact ?? ""} /></div>
              <div><Label>Technical impact</Label><Textarea name="technical_impact" defaultValue={edit.technical_impact ?? ""} /></div>
              <div><Label>Evidence reference</Label><Input name="evidence_ref" defaultValue={edit.evidence_ref ?? ""} placeholder="e.g. Screenshot 3 in report v1" /><p className="mt-1 text-[11px] text-muted-foreground">Never paste passwords, keys or tokens here.</p></div>
              <div><Label>Recommended remediation</Label><Textarea name="remediation" defaultValue={edit.remediation ?? ""} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Responsible person</Label><Input name="responsible" defaultValue={edit.responsible ?? ""} /></div>
                <div><Label>Due date</Label><Input type="date" name="due_date" defaultValue={edit.due_date ?? ""} /></div>
              </div>
              <div><Label>Resolution notes</Label><Textarea name="resolution_notes" defaultValue={edit.resolution_notes ?? ""} /></div>
              <Button type="submit" className="w-full">Save</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Risks() {
  const qc = useQueryClient();
  const lk = useLookups();
  const [edit, setEdit] = useState<Partial<Risk> | null>(null);
  const [q, setQ] = useState(""); const [st, setSt] = useState("");
  const list = useQuery({
    queryKey: ["cyber-risks"],
    queryFn: async () => { const { data, error } = await supabase.from("cyber_risks").select("*").order("created_at", { ascending: false }); if (error) throw error; return data; },
  });
  const rows = (list.data ?? []).filter((r) => (!st || r.status === st) && (!q || `${r.title} ${r.risk_code}`.toLowerCase().includes(q.toLowerCase())));

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const p = lk.data?.projects.find((x) => x.id === f.get("project_id"));
    if (!p) { toast.error("Choose a project"); return; }
    const payload = {
      project_id: p.id, customer_id: p.customer_id, asset_id: s(f, "asset_id"), title: s(f, "title") ?? "Risk",
      threat: s(f, "threat"), vulnerability: s(f, "vulnerability"), likelihood: Number(f.get("likelihood")), impact: Number(f.get("impact")),
      owner: s(f, "owner"), mitigation: s(f, "mitigation"), treatment: String(f.get("treatment")), target_date: s(f, "target_date"), status: String(f.get("status")),
    };
    const { error } = edit?.id ? await supabase.from("cyber_risks").update(payload).eq("id", edit.id) : await supabase.from("cyber_risks").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Risk saved"); setEdit(null); qc.invalidateQueries({ queryKey: ["cyber-risks"] });
  }
  async function remove(r: Risk) {
    if (!confirm(`Delete ${r.risk_code}?`)) return;
    const { error } = await supabase.from("cyber_risks").delete().eq("id", r.id);
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["cyber-risks"] });
  }
  const open = (list.data ?? []).filter((r) => r.status !== "closed");
  const scale = [1, 2, 3, 4, 5];

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-card/60 p-3">
        <p className="mb-2 text-xs font-semibold text-muted-foreground">Open risks — likelihood (up) × impact (across)</p>
        <div className="grid w-fit grid-cols-5 gap-1">
          {[...scale].reverse().flatMap((l) => scale.map((i) => {
            const n = open.filter((r) => r.likelihood === l && r.impact === i).length;
            const sc = l * i;
            const tone = sc >= 20 ? "bg-destructive/40" : sc >= 12 ? "bg-primary/40" : sc >= 6 ? "bg-accent/40" : "bg-muted";
            return <div key={`${l}-${i}`} className={cn("flex h-8 w-8 items-center justify-center rounded text-xs font-bold text-foreground", tone)}>{n || ""}</div>;
          }))}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Filters q={q} setQ={setQ} status={st} setStatus={setSt} options={RISK_STATUS} />
        <Button onClick={() => setEdit({})} disabled={!lk.data?.projects.length}>New risk</Button>
      </div>
      {rows.length === 0 ? <p className="text-sm text-muted-foreground">No risks recorded.</p> : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card/60 p-3">
              <div className="min-w-0">
                <p className="font-semibold text-foreground"><span className="mr-2 font-mono text-xs text-muted-foreground">{r.risk_code}</span>{r.title}</p>
                <p className="text-xs text-muted-foreground">{lk.data?.names.get(r.customer_id)} · L{r.likelihood} × I{r.impact} · {TREATMENT[r.treatment]} · target {r.target_date ?? "—"}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={levelTone(r.risk_level ?? "low")}>{RISK_LEVELS[r.risk_level ?? "low"]}</Badge>
                <Badge className="bg-muted text-foreground">{RISK_STATUS[r.status]}</Badge>
                <Button size="sm" variant="outline" onClick={() => setEdit(r)}>Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => remove(r)}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{edit?.id ? `Edit ${edit.risk_code}` : "New risk"}</DialogTitle></DialogHeader>
          {edit && (
            <form onSubmit={save} className="space-y-3">
              <div><Label>Risk title</Label><Input name="title" required defaultValue={edit.title ?? ""} /></div>
              <div><Label>Project</Label><select name="project_id" required className={sel} defaultValue={edit.project_id ?? ""}><option value="">Choose…</option>{lk.data?.projects.map((p) => <option key={p.id} value={p.id}>{p.project_code} · {p.name}</option>)}</select></div>
              <div><Label>Asset</Label><select name="asset_id" className={sel} defaultValue={edit.asset_id ?? ""}><option value="">None</option>{lk.data?.assets.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
              <div><Label>Threat</Label><Textarea name="threat" defaultValue={edit.threat ?? ""} /></div>
              <div><Label>Vulnerability</Label><Textarea name="vulnerability" defaultValue={edit.vulnerability ?? ""} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Likelihood (1–5)</Label><select name="likelihood" className={sel} defaultValue={edit.likelihood ?? 3}>{scale.map((n) => <option key={n} value={n}>{n}</option>)}</select></div>
                <div><Label>Impact (1–5)</Label><select name="impact" className={sel} defaultValue={edit.impact ?? 3}>{scale.map((n) => <option key={n} value={n}>{n}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Treatment</Label><select name="treatment" className={sel} defaultValue={edit.treatment ?? "mitigate"}>{Object.entries(TREATMENT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                <div><Label>Status</Label><select name="status" className={sel} defaultValue={edit.status ?? "open"}>{Object.entries(RISK_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              </div>
              <div><Label>Risk owner</Label><Input name="owner" defaultValue={edit.owner ?? ""} /></div>
              <div><Label>Mitigation</Label><Textarea name="mitigation" defaultValue={edit.mitigation ?? ""} /></div>
              <div><Label>Target date</Label><Input type="date" name="target_date" defaultValue={edit.target_date ?? ""} /></div>
              <p className="text-xs text-muted-foreground">Risk level is worked out from likelihood × impact.</p>
              <Button type="submit" className="w-full">Save</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Customer view: findings on their account, plus reviewed assessments. */
export function MyCyberFindings() {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ["my-cyber-findings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [f, a] = await Promise.all([
        supabase.from("cyber_findings").select("id,finding_code,title,risk_level,status,remediation,due_date").eq("customer_id", user!.id).order("created_at", { ascending: false }),
        supabase.from("cyber_assessments").select("id,name,executive_summary,recommendations,end_date").eq("customer_id", user!.id).eq("status", "reviewed"),
      ]);
      return { findings: f.data ?? [], assessments: a.data ?? [] };
    },
  });
  if (!q.data || (q.data.findings.length === 0 && q.data.assessments.length === 0)) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold text-foreground">Security assessments & findings</h2>
      {q.data.assessments.map((a) => (
        <div key={a.id} className="rounded-xl border border-border bg-card/60 p-3">
          <p className="font-semibold text-foreground">{a.name}</p>
          {a.executive_summary && <p className="mt-1 text-sm text-muted-foreground whitespace-pre-line">{a.executive_summary}</p>}
          {a.recommendations && <p className="mt-1 text-sm text-foreground whitespace-pre-line"><b>Recommendations:</b> {a.recommendations}</p>}
        </div>
      ))}
      {q.data.findings.map((f) => (
        <div key={f.id} className="rounded-xl border border-border bg-card/60 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-foreground"><span className="mr-2 font-mono text-xs text-muted-foreground">{f.finding_code}</span>{f.title}</p>
            <div className="flex gap-1"><Badge className={levelTone(f.risk_level)}>{RISK_LEVELS[f.risk_level]}</Badge><Badge className="bg-muted text-foreground">{FINDING_STATUS[f.status]}</Badge></div>
          </div>
          {f.remediation && <p className="mt-1 text-sm text-muted-foreground">Fix: {f.remediation}</p>}
          {f.due_date && <p className="text-xs text-muted-foreground">Due {f.due_date}</p>}
        </div>
      ))}
    </section>
  );
}
