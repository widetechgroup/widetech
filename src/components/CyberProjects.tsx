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
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

type Project = Tables<"cyber_projects">;
type Asset = Tables<"cyber_assets">;
const sel = "min-h-[40px] w-full rounded-lg border border-border bg-background/60 px-2 text-sm text-foreground";
export const PROJECT_STATUS: Record<string, string> = { planning: "Planning", in_progress: "In progress", on_hold: "On hold", completed: "Completed", cancelled: "Cancelled" };
const ASSET_TYPES: Record<string, string> = { website: "Website", domain: "Domain", web_app: "Web application", mobile_app: "Mobile application", api: "API", server: "Server", cloud: "Cloud resource", network: "Network", endpoint: "Endpoint", database: "Database", other: "Other" };
const LEVELS = ["low", "medium", "high", "critical"];
const s = (f: FormData, k: string, n = 4000) => String(f.get(k) ?? "").trim().slice(0, n) || null;

function useStaff() {
  return useQuery({
    queryKey: ["cyber-staff"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("user_id,profiles(full_name)").neq("role", "customer");
      const m = new Map<string, string>();
      for (const x of (data ?? []) as { user_id: string; profiles: { full_name: string } | null }[]) m.set(x.user_id, x.profiles?.full_name ?? "Staff");
      return [...m.entries()];
    },
  });
}

/** Turn an approved cyber request into a project. */
export async function convertRequestToProject(r: Tables<"cyber_service_requests">) {
  const { data, error } = await supabase.from("cyber_projects").insert({
    project_code: "", request_id: r.id, customer_id: r.customer_id, name: r.item_name,
    service_type: r.item_name, manager_id: r.assigned_to, priority: r.priority, scope: r.description,
  }).select("project_code").single();
  if (error) { toast.error(error.message); return false; }
  toast.success(`Project ${data.project_code} created`);
  return true;
}

function Progress({ v }: { v: number }) {
  return <div className="h-1.5 w-full rounded-full bg-border"><div className="h-full rounded-full bg-primary" style={{ width: `${v}%` }} /></div>;
}

/** Staff list of cyber projects with editing and per-project asset inventory. */
export function CyberProjectsBoard() {
  const qc = useQueryClient();
  const staff = useStaff();
  const [edit, setEdit] = useState<Project | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ["cyber-projects"],
    queryFn: async () => {
      const [p, c] = await Promise.all([
        supabase.from("cyber_projects").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("id,full_name"),
      ]);
      if (p.error) throw p.error;
      return { projects: p.data, people: new Map((c.data ?? []).map((x) => [x.id, x.full_name])) };
    },
  });
  const name = (id: string | null) => (id && q.data?.people.get(id)) || "—";

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!edit) return;
    const f = new FormData(e.currentTarget);
    const team = f.getAll("team").map(String);
    const { error } = await supabase.from("cyber_projects").update({
      name: s(f, "name", 200) ?? edit.name, service_type: s(f, "service_type", 200),
      manager_id: s(f, "manager"), team, status: String(f.get("status")), priority: String(f.get("priority")),
      progress: Math.min(100, Math.max(0, Number(f.get("progress")) || 0)),
      start_date: s(f, "start"), expected_end: s(f, "expected"), actual_end: s(f, "actual"),
      scope: s(f, "scope"), objectives: s(f, "objectives"), deliverables: s(f, "deliverables"), notes: s(f, "notes"),
    }).eq("id", edit.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Project saved"); setEdit(null); qc.invalidateQueries({ queryKey: ["cyber-projects"] });
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Create a project from an approved request on the Requests tab.</p>
      {q.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {q.error && <p className="text-sm text-destructive">{(q.error as Error).message}</p>}
      {q.data?.projects.length === 0 && <p className="glass rounded-2xl p-5 text-sm text-muted-foreground">No cyber projects yet.</p>}
      {q.data?.projects.map((p) => (
        <article key={p.id} className="glass rounded-2xl p-4">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
            <div className="min-w-0">
              <h3 className="truncate font-bold">{p.project_code} · {p.name}</h3>
              <p className="text-xs text-muted-foreground">Client {name(p.customer_id)} · Manager {name(p.manager_id)} · <span className="capitalize">{p.priority}</span> priority</p>
            </div>
            <span className="h-fit rounded-full border border-border px-3 py-1 text-xs font-semibold text-accent">{PROJECT_STATUS[p.status]}</span>
          </div>
          <div className="mt-3 flex items-center gap-2"><Progress v={p.progress} /><span className="text-xs font-semibold">{p.progress}%</span></div>
          <p className="mt-2 text-xs text-muted-foreground">{p.start_date ?? "No start"} → {p.expected_end ?? "no due date"}{p.actual_end ? ` · finished ${p.actual_end}` : ""}</p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setEdit(p)}>Edit</Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(open === p.id ? null : p.id)}>{open === p.id ? "Hide assets" : "Assets"}</Button>
          </div>
          {open === p.id && <AssetList project={p} />}
        </article>
      ))}

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>{edit?.project_code}</DialogTitle></DialogHeader>
          {edit && (
            <form onSubmit={save} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div><Label>Project name</Label><Input name="name" defaultValue={edit.name} required maxLength={200} /></div>
                <div><Label>Service type</Label><Input name="service_type" defaultValue={edit.service_type ?? ""} maxLength={200} /></div>
                <div><Label>Project manager</Label>
                  <select name="manager" defaultValue={edit.manager_id ?? ""} className={sel}><option value="">None</option>{staff.data?.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select>
                </div>
                <div><Label>Status</Label>
                  <select name="status" defaultValue={edit.status} className={sel}>{Object.entries(PROJECT_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                </div>
                <div><Label>Priority</Label>
                  <select name="priority" defaultValue={edit.priority} className={cn(sel, "capitalize")}>{LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}</select>
                </div>
                <div><Label>Progress %</Label><Input name="progress" type="number" min="0" max="100" defaultValue={edit.progress} /></div>
                <div><Label>Start date</Label><Input name="start" type="date" defaultValue={edit.start_date ?? ""} /></div>
                <div><Label>Expected completion</Label><Input name="expected" type="date" defaultValue={edit.expected_end ?? ""} /></div>
                <div><Label>Actual completion</Label><Input name="actual" type="date" defaultValue={edit.actual_end ?? ""} /></div>
              </div>
              <div><Label>Security team</Label>
                <div className="mt-1 flex flex-wrap gap-3 text-sm">
                  {staff.data?.map(([id, n]) => <label key={id} className="flex items-center gap-1"><input type="checkbox" name="team" value={id} defaultChecked={edit.team.includes(id)} />{n}</label>)}
                </div>
              </div>
              <div><Label>Scope</Label><Textarea name="scope" rows={2} defaultValue={edit.scope ?? ""} /></div>
              <div><Label>Objectives</Label><Textarea name="objectives" rows={2} defaultValue={edit.objectives ?? ""} /></div>
              <div><Label>Deliverables</Label><Textarea name="deliverables" rows={2} defaultValue={edit.deliverables ?? ""} /></div>
              <div><Label>Notes</Label><Textarea name="notes" rows={2} defaultValue={edit.notes ?? ""} /></div>
              <Button type="submit" className="w-full">Save project</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AssetList({ project }: { project: Project }) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const q = useQuery({
    queryKey: ["cyber-assets", project.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("cyber_assets").select("*").eq("project_id", project.id).order("created_at");
      if (error) throw error;
      return data as Asset[];
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["cyber-assets", project.id] });

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const row: TablesInsert<"cyber_assets"> = {
      project_id: project.id, customer_id: project.customer_id, name: s(f, "name", 200) ?? "Asset",
      asset_type: String(f.get("type")), owner: s(f, "owner", 150), environment: String(f.get("env")),
      criticality: String(f.get("crit")), notes: s(f, "notes", 2000),
    };
    const { error } = await supabase.from("cyber_assets").insert(row);
    if (error) { toast.error(error.message); return; }
    setAdding(false); refresh();
  }
  async function setStatus(a: Asset, status: string) {
    const { error } = await supabase.from("cyber_assets").update({ status }).eq("id", a.id);
    if (error) toast.error(error.message); else refresh();
  }
  async function remove(a: Asset) {
    if (!confirm(`Delete asset "${a.name}"?`)) return;
    const { error } = await supabase.from("cyber_assets").delete().eq("id", a.id);
    if (error) toast.error(error.message); else refresh();
  }

  return (
    <div className="mt-3 space-y-2 border-t border-border pt-3">
      {q.data?.length === 0 && <p className="text-xs text-muted-foreground">No assets recorded.</p>}
      {q.data?.map((a) => (
        <div key={a.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-border p-2 text-sm">
          <div className="min-w-0">
            <p className="truncate font-semibold">{a.name}</p>
            <p className="text-xs text-muted-foreground">{ASSET_TYPES[a.asset_type]} · {a.environment} · <span className="capitalize">{a.criticality}</span>{a.owner ? ` · ${a.owner}` : ""}</p>
          </div>
          <div className="flex gap-1">
            <select value={a.status} onChange={(e) => setStatus(a, e.target.value)} className="rounded-md border border-border bg-background/60 px-1 text-xs">
              <option value="active">Active</option><option value="inactive">Inactive</option><option value="retired">Retired</option>
            </select>
            <Button size="sm" variant="ghost" onClick={() => remove(a)}>Delete</Button>
          </div>
        </div>
      ))}
      {adding ? (
        <form onSubmit={add} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-2">
          <Input name="name" required maxLength={200} placeholder="Asset name" />
          <select name="type" className={sel}>{Object.entries(ASSET_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <Input name="owner" maxLength={150} placeholder="Asset owner" />
          <select name="env" className={sel}><option value="production">Production</option><option value="staging">Staging</option><option value="development">Development</option></select>
          <select name="crit" defaultValue="medium" className={cn(sel, "capitalize")}>{LEVELS.map((l) => <option key={l} value={l}>{l} criticality</option>)}</select>
          <Input name="notes" maxLength={2000} placeholder="Notes (no passwords)" />
          <div className="flex gap-2 sm:col-span-2"><Button size="sm" type="submit">Add asset</Button><Button size="sm" variant="ghost" type="button" onClick={() => setAdding(false)}>Cancel</Button></div>
        </form>
      ) : <Button size="sm" variant="outline" onClick={() => setAdding(true)}>Add asset</Button>}
    </div>
  );
}

/** Customer view of their own cyber projects (no internal notes, no assets). */
export function MyCyberProjects() {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ["my-cyber-projects", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("cyber_projects")
        .select("id,project_code,name,status,progress,start_date,expected_end,deliverables")
        .eq("customer_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  if (!q.data?.length) return null;
  return (
    <section className="mt-10">
      <h2 className="text-xl font-extrabold">Cyber security projects</h2>
      <div className="mt-4 space-y-3">
        {q.data.map((p) => (
          <article key={p.id} className="glass rounded-2xl p-5">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
              <div className="min-w-0"><h3 className="truncate font-bold">{p.name}</h3><p className="text-xs text-muted-foreground">{p.project_code}</p></div>
              <span className="h-fit rounded-full border border-border px-3 py-1 text-xs font-semibold text-accent">{PROJECT_STATUS[p.status]}</span>
            </div>
            <div className="mt-3 flex items-center gap-2"><Progress v={p.progress} /><span className="text-xs font-semibold">{p.progress}%</span></div>
            <p className="mt-2 text-xs text-muted-foreground">{p.start_date ?? "Start date to be set"} → {p.expected_end ?? "due date to be set"}</p>
            {p.deliverables && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{p.deliverables}</p>}
          </article>
        ))}
      </div>
    </section>
  );
}
