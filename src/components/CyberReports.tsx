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

type Training = Tables<"cyber_trainings">;
type Report = Tables<"cyber_reports">;
type FileRef = { path: string; name: string };
const BUCKET = "cyber-files";
const MAX = 50 * 1024 * 1024;
const sel = "min-h-[40px] w-full rounded-lg border border-border bg-background/60 px-2 text-sm text-foreground";
const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim().slice(0, 6000) || null;
const opts = (o: Record<string, string>) => Object.entries(o).map(([k, v]) => <option key={k} value={k}>{v}</option>);

export const REPORT_TYPES: Record<string, string> = {
  security_assessment: "Security assessment", vulnerability: "Vulnerability", penetration: "Penetration test", incident: "Incident",
  risk: "Risk", audit: "Audit", compliance: "Compliance", executive: "Executive summary", remediation: "Remediation",
};
export const REPORT_STATUS: Record<string, string> = { draft: "Draft", under_review: "Under review", approved: "Approved", delivered: "Delivered", archived: "Archived" };
const CLASSIFICATION: Record<string, string> = { public: "Public", internal: "Internal", confidential: "Confidential", restricted: "Restricted" };
const TRAINING_STATUS: Record<string, string> = { planned: "Planned", in_progress: "In progress", completed: "Completed", cancelled: "Cancelled" };
const DELIVERY: Record<string, string> = { onsite: "On-site", remote: "Remote", hybrid: "Hybrid" };

const asFiles = (v: unknown): FileRef[] => (Array.isArray(v) ? (v as FileRef[]).filter((x) => x && x.path) : []);

async function upload(folder: string, file: File): Promise<FileRef> {
  if (file.size > MAX) throw new Error("File is larger than 50 MB");
  const path = `${folder}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]+/g, "_")}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || undefined });
  if (error) throw error;
  return { path, name: file.name };
}

async function openFile(path: string, reportId?: string) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 300);
  if (error || !data) { toast.error(error?.message ?? "Could not open file"); return; }
  if (reportId) await supabase.rpc("log_report_access", { _report: reportId, _action: "download" });
  window.open(data.signedUrl, "_blank", "noopener");
}

function useLookups() {
  return useQuery({
    queryKey: ["cyber-lookups"],
    queryFn: async () => {
      const [p, pr] = await Promise.all([
        supabase.from("profiles").select("id,full_name,email"),
        supabase.from("cyber_projects").select("id,project_code,name,customer_id"),
      ]);
      if (p.error) throw p.error; if (pr.error) throw pr.error;
      return { people: p.data ?? [], projects: pr.data ?? [] };
    },
  });
}

/** Staff board: training sessions and reports. */
export function CyberTrainingReportsBoard() {
  const [tab, setTab] = useState<"reports" | "training">("reports");
  return (
    <div className="space-y-4">
      <div className="flex w-fit gap-1 rounded-lg border border-border p-1">
        {(["reports", "training"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-md px-3 py-1.5 text-sm capitalize ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{t}</button>
        ))}
      </div>
      {tab === "reports" ? <ReportsBoard /> : <TrainingBoard />}
    </div>
  );
}

function ReportsBoard() {
  const qc = useQueryClient();
  const lk = useLookups();
  const [edit, setEdit] = useState<Partial<Report> | null>(null);
  const q = useQuery({
    queryKey: ["cyber-reports"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cyber_reports").select("*").order("created_at", { ascending: false });
      if (error) throw error; return data;
    },
  });
  const name = (id: string | null) => lk.data?.people.find((p) => p.id === id)?.full_name ?? "—";

  async function remove(r: Report) {
    if (!confirm(`Delete report ${r.report_code}?`)) return;
    const { error } = await supabase.from("cyber_reports").delete().eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    if (r.file_path) await supabase.storage.from(BUCKET).remove([r.file_path]);
    toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["cyber-reports"] });
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end"><Button onClick={() => setEdit({})}>New report</Button></div>
      {q.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {q.error && <p className="text-sm text-destructive">{(q.error as Error).message}</p>}
      {q.data?.length === 0 && <p className="rounded-xl border border-border p-4 text-sm text-muted-foreground">No reports yet.</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {q.data?.map((r) => (
          <div key={r.id} className="rounded-xl border border-border bg-card/60 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0"><p className="truncate font-semibold">{r.title}</p><p className="text-xs text-muted-foreground">{r.report_code} · {REPORT_TYPES[r.report_type]} · v{r.version}</p></div>
              <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-xs">{REPORT_STATUS[r.status]}</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Client: {name(r.customer_id)} · {CLASSIFICATION[r.classification]} · {r.report_date ?? ""}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {r.file_path && <Button size="sm" variant="outline" onClick={() => openFile(r.file_path!, r.id)}>Open file</Button>}
              <Button size="sm" variant="outline" onClick={() => setEdit(r)}>Edit</Button>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(r)}>Delete</Button>
            </div>
          </div>
        ))}
      </div>
      {edit && lk.data && <ReportEditor row={edit} people={lk.data.people} projects={lk.data.projects} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); qc.invalidateQueries({ queryKey: ["cyber-reports"] }); }} />}
    </div>
  );
}

type Person = { id: string; full_name: string | null; email: string | null };
type Proj = { id: string; project_code: string; name: string; customer_id: string | null };

function ReportEditor({ row, people, projects, onClose, onSaved }: { row: Partial<Report>; people: Person[]; projects: Proj[]; onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const title = s(f, "title"); const customer_id = s(f, "customer_id");
    if (!title || !customer_id) { toast.error("Title and client are required"); return; }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title, customer_id, project_id: s(f, "project_id"), report_type: s(f, "report_type"), classification: s(f, "classification"),
        status: s(f, "status"), report_date: s(f, "report_date"), prepared_by: s(f, "prepared_by"), reviewed_by: s(f, "reviewed_by"),
      };
      let id = row.id;
      if (!id) {
        const { data, error } = await supabase.from("cyber_reports").insert({ ...payload, report_code: "" } as never).select("id").single();
        if (error) throw error; id = data.id;
      } else {
        const { error } = await supabase.from("cyber_reports").update(payload as never).eq("id", id);
        if (error) throw error;
      }
      const file = f.get("file") as File | null;
      if (file && file.size > 0) {
        const ref = await upload(`reports/${id}`, file);
        const { data: upd, error } = await supabase.from("cyber_reports").update({ file_path: ref.path, file_name: ref.name }).eq("id", id).select("version").single();
        if (error) throw error;
        await supabase.from("cyber_report_versions").insert({ report_id: id!, version: upd.version, file_path: ref.path, file_name: ref.name });
      }
      toast.success("Saved"); onSaved();
    } catch (err) { toast.error((err as Error).message); } finally { setSaving(false); }
  }
  const pick = (n: string, v: string | null | undefined) => (
    <select name={n} className={sel} defaultValue={v ?? ""}><option value="">—</option>{people.map((p) => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}</select>
  );
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{row.id ? `Edit ${row.report_code}` : "New report"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>Title</Label><Input name="title" required maxLength={200} defaultValue={row.title} /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Client</Label>{pick("customer_id", row.customer_id)}</div>
            <div><Label>Project</Label><select name="project_id" className={sel} defaultValue={row.project_id ?? ""}><option value="">—</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.project_code} · {p.name}</option>)}</select></div>
            <div><Label>Type</Label><select name="report_type" className={sel} defaultValue={row.report_type ?? "security_assessment"}>{opts(REPORT_TYPES)}</select></div>
            <div><Label>Classification</Label><select name="classification" className={sel} defaultValue={row.classification ?? "confidential"}>{opts(CLASSIFICATION)}</select></div>
            <div><Label>Status</Label><select name="status" className={sel} defaultValue={row.status ?? "draft"}>{opts(REPORT_STATUS)}</select></div>
            <div><Label>Report date</Label><Input name="report_date" type="date" defaultValue={row.report_date ?? ""} /></div>
            <div><Label>Prepared by</Label>{pick("prepared_by", row.prepared_by)}</div>
            <div><Label>Reviewed by</Label>{pick("reviewed_by", row.reviewed_by)}</div>
          </div>
          <div><Label>{row.file_path ? `Replace file (current: ${row.file_name})` : "Report file (PDF, Word…)"}</Label><Input name="file" type="file" /></div>
          <p className="text-xs text-muted-foreground">Customers only see a report once it's Approved or Delivered.</p>
          <Button type="submit" disabled={saving} className="w-full">{saving ? "Saving…" : "Save"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TrainingBoard() {
  const qc = useQueryClient();
  const lk = useLookups();
  const [edit, setEdit] = useState<Partial<Training> | null>(null);
  const q = useQuery({
    queryKey: ["cyber-trainings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cyber_trainings").select("*").order("training_date", { ascending: false, nullsFirst: true });
      if (error) throw error; return data;
    },
  });
  const name = (id: string | null) => lk.data?.people.find((p) => p.id === id)?.full_name ?? "—";
  async function remove(t: Training) {
    if (!confirm(`Delete "${t.title}"?`)) return;
    const { error } = await supabase.from("cyber_trainings").delete().eq("id", t.id);
    if (error) { toast.error(error.message); return; }
    const paths = asFiles(t.files).map((x) => x.path);
    if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
    toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["cyber-trainings"] });
  }
  return (
    <div className="space-y-3">
      <div className="flex justify-end"><Button onClick={() => setEdit({})}>New training</Button></div>
      {q.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {q.error && <p className="text-sm text-destructive">{(q.error as Error).message}</p>}
      {q.data?.length === 0 && <p className="rounded-xl border border-border p-4 text-sm text-muted-foreground">No training sessions yet.</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {q.data?.map((t) => (
          <div key={t.id} className="rounded-xl border border-border bg-card/60 p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 truncate font-semibold">{t.title}</p>
              <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-xs">{TRAINING_STATUS[t.status]}</span>
            </div>
            <p className="text-xs text-muted-foreground">Client: {name(t.customer_id)} · {t.training_date ?? "No date"} · {DELIVERY[t.delivery_method]}{t.participants ? ` · ${t.participants} people` : ""}</p>
            <FileLinks files={asFiles(t.files)} />
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setEdit(t)}>Edit</Button>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(t)}>Delete</Button>
            </div>
          </div>
        ))}
      </div>
      {edit && lk.data && <TrainingEditor row={edit} people={lk.data.people} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); qc.invalidateQueries({ queryKey: ["cyber-trainings"] }); }} />}
    </div>
  );
}

function FileLinks({ files }: { files: FileRef[] }) {
  if (!files.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {files.map((x) => <button key={x.path} onClick={() => openFile(x.path)} className="text-xs font-semibold text-primary underline">{x.name}</button>)}
    </div>
  );
}

function TrainingEditor({ row, people, onClose, onSaved }: { row: Partial<Training>; people: Person[]; onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const title = s(f, "title");
    if (!title) { toast.error("Title is required"); return; }
    const n = s(f, "participants");
    setSaving(true);
    try {
      const payload = {
        title, customer_id: s(f, "customer_id"), training_type: s(f, "training_type") ?? "awareness", audience: s(f, "audience"), trainer: s(f, "trainer"),
        training_date: s(f, "training_date"), location: s(f, "location"), delivery_method: s(f, "delivery_method") ?? "onsite",
        participants: n ? Math.max(0, Number(n) || 0) : null, materials: s(f, "materials"), description: s(f, "description"), status: s(f, "status") ?? "planned",
      };
      let id = row.id;
      if (!id) {
        const { data, error } = await supabase.from("cyber_trainings").insert(payload).select("id").single();
        if (error) throw error; id = data.id;
      } else {
        const { error } = await supabase.from("cyber_trainings").update(payload).eq("id", id);
        if (error) throw error;
      }
      const picked = (f.getAll("files") as File[]).filter((x) => x.size > 0);
      if (picked.length) {
        const added: FileRef[] = [];
        for (const file of picked) added.push(await upload(`training/${id}`, file));
        const { error } = await supabase.from("cyber_trainings").update({ files: [...asFiles(row.files), ...added] }).eq("id", id!);
        if (error) throw error;
      }
      toast.success("Saved"); onSaved();
    } catch (err) { toast.error((err as Error).message); } finally { setSaving(false); }
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{row.id ? "Edit training" : "New training"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>Title</Label><Input name="title" required maxLength={200} defaultValue={row.title} /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Client</Label><select name="customer_id" className={sel} defaultValue={row.customer_id ?? ""}><option value="">—</option>{people.map((p) => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}</select></div>
            <div><Label>Type</Label><Input name="training_type" maxLength={80} defaultValue={row.training_type ?? "awareness"} /></div>
            <div><Label>Audience</Label><Input name="audience" maxLength={200} defaultValue={row.audience ?? ""} /></div>
            <div><Label>Trainer</Label><Input name="trainer" maxLength={150} defaultValue={row.trainer ?? ""} /></div>
            <div><Label>Date</Label><Input name="training_date" type="date" defaultValue={row.training_date ?? ""} /></div>
            <div><Label>Location</Label><Input name="location" maxLength={200} defaultValue={row.location ?? ""} /></div>
            <div><Label>Delivery</Label><select name="delivery_method" className={sel} defaultValue={row.delivery_method ?? "onsite"}>{opts(DELIVERY)}</select></div>
            <div><Label>Participants</Label><Input name="participants" type="number" min={0} defaultValue={row.participants ?? ""} /></div>
            <div><Label>Status</Label><select name="status" className={sel} defaultValue={row.status ?? "planned"}>{opts(TRAINING_STATUS)}</select></div>
          </div>
          <div><Label>Materials</Label><Textarea name="materials" rows={2} defaultValue={row.materials ?? ""} /></div>
          <div><Label>Description</Label><Textarea name="description" rows={3} defaultValue={row.description ?? ""} /></div>
          <div><Label>Add files (slides, handouts, certificates)</Label><Input name="files" type="file" multiple /></div>
          <Button type="submit" disabled={saving} className="w-full">{saving ? "Saving…" : "Save"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Customer view: approved reports and training sessions. */
export function MyCyberReports() {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ["my-cyber-reports", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [r, t] = await Promise.all([
        supabase.from("cyber_reports").select("id,report_code,title,report_type,report_date,status,file_path,file_name,version").eq("customer_id", user!.id).in("status", ["approved", "delivered"]).order("created_at", { ascending: false }),
        supabase.from("cyber_trainings").select("id,title,training_date,status,delivery_method,files").eq("customer_id", user!.id).order("training_date", { ascending: false }),
      ]);
      if (r.error) throw r.error; if (t.error) throw t.error;
      return { reports: r.data ?? [], trainings: t.data ?? [] };
    },
  });
  if (!q.data || (q.data.reports.length === 0 && q.data.trainings.length === 0)) return null;
  return (
    <section className="mt-10 space-y-3">
      <h2 className="text-xl font-extrabold">Security reports & training</h2>
      {q.data.reports.map((r) => (
        <article key={r.id} className="glass rounded-2xl p-5">
          <p className="font-bold">{r.title}</p>
          <p className="text-xs text-muted-foreground">{r.report_code} · {REPORT_TYPES[r.report_type]} · v{r.version} · {r.report_date ?? ""}</p>
          {r.file_path ? <Button size="sm" className="mt-3" onClick={() => openFile(r.file_path!, r.id)}>Download report</Button> : <p className="mt-2 text-xs text-muted-foreground">File coming soon.</p>}
        </article>
      ))}
      {q.data.trainings.map((t) => (
        <article key={t.id} className="glass rounded-2xl p-5">
          <p className="font-bold">{t.title}</p>
          <p className="text-xs text-muted-foreground">Training · {t.training_date ?? "Date to be set"} · {TRAINING_STATUS[t.status]}</p>
          <FileLinks files={asFiles(t.files)} />
        </article>
      ))}
    </section>
  );
}
