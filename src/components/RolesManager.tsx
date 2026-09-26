import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Plus, Search, Copy, Trash2, Power, Settings2, Users, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type Role = { key: string; name: string; description: string | null; role_type: string; audience: string; is_active: boolean; is_protected: boolean; created_at: string };
type Module = { key: string; name: string; description: string | null; is_enabled: boolean; display_order: number; depends_on: string[] };
type Perm = { key: string; module_key: string; action: string; description: string | null; is_sensitive: boolean };

const MATRIX = ["view", "create", "edit", "delete", "manage"] as const;
const inputCls = "min-h-[40px] w-full rounded-lg border border-border bg-background/60 px-3 text-sm text-foreground";
const errMsg = (e: unknown) => (e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : "Failed");

function useRbac() {
  return useQuery({
    queryKey: ["rbac"],
    queryFn: async () => {
      const [roles, modules, perms, rp, ur, ucr] = await Promise.all([
        supabase.from("roles").select("*").order("role_type", { ascending: false }).order("created_at"),
        supabase.from("app_modules").select("key,name,description,is_enabled,display_order,depends_on").order("display_order"),
        supabase.from("permissions").select("key,module_key,action,description,is_sensitive").order("key"),
        supabase.from("role_permissions").select("role,permission_key"),
        supabase.from("user_roles").select("user_id,role"),
        supabase.from("user_custom_roles").select("user_id,role_key"),
      ]);
      for (const r of [roles, modules, perms, rp, ur, ucr]) if (r.error) throw r.error;
      const grants = new Map<string, Set<string>>();
      for (const g of rp.data ?? []) { if (!grants.has(g.role)) grants.set(g.role, new Set()); grants.get(g.role)!.add(g.permission_key); }
      const users = new Map<string, number>();
      for (const u of ur.data ?? []) users.set(u.role, (users.get(u.role) ?? 0) + 1);
      for (const u of ucr.data ?? []) users.set(u.role_key, (users.get(u.role_key) ?? 0) + 1);
      return { roles: (roles.data ?? []) as Role[], modules: (modules.data ?? []) as Module[], perms: (perms.data ?? []) as Perm[], grants, users };
    },
  });
}

export function RolesManager() {
  const qc = useQueryClient();
  const data = useRbac();
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState<Role | "new" | null>(null);
  const [assigning, setAssigning] = useState<Role | null>(null);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["rbac"] }); qc.invalidateQueries({ queryKey: ["my-permissions"] }); qc.invalidateQueries({ queryKey: ["admin-users"] }); };

  if (data.isLoading) return <p className="text-sm text-muted-foreground">Loading roles…</p>;
  if (data.isError || !data.data) return <p className="text-sm text-destructive">Couldn't load roles.</p>;
  const { roles, modules, perms, grants, users } = data.data;

  const modulesOf = (rk: string) => new Set([...(grants.get(rk) ?? [])].map((p) => p.split(".")[0])).size;

  const toggleActive = async (r: Role) => {
    if (r.key === "super_admin") { toast.error("The Super Admin role can't be disabled"); return; }
    const { error } = await supabase.from("roles").update({ is_active: !r.is_active }).eq("key", r.key);
    if (error) { toast.error(error.message); return; }
    toast.success(r.is_active ? `${r.name} disabled — its permissions no longer apply` : `${r.name} enabled`);
    refresh();
  };
  const remove = async (r: Role) => {
    if (!window.confirm(`Delete the role "${r.name}"? ${users.get(r.key) ?? 0} people will lose it.`)) return;
    const { error } = await supabase.from("roles").delete().eq("key", r.key);
    if (error) { toast.error(error.message); return; }
    toast.success("Role deleted"); refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold">Roles & permissions</h2>
          <p className="text-sm text-muted-foreground">A person's access is the combination of all their active roles. Super Admin always has everything.</p>
        </div>
        <button onClick={() => setCreating("new")} className="flex min-h-[44px] items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" /> Create role</button>
      </div>

      <div className="glass overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr className="border-b border-border">{["Role", "Users", "Modules", "Permissions", "Status", "Created", "Actions"].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody>
            {roles.map((r) => (
              <tr key={r.key} className="border-b border-border/50 last:border-0">
                <td className="px-4 py-3">
                  <p className="flex items-center gap-1.5 font-semibold">{r.name}{r.is_protected && <Lock className="h-3 w-3 text-muted-foreground" aria-label="Protected system role" />}</p>
                  <p className="text-xs text-muted-foreground">{r.role_type === "system" ? "System" : "Custom"} · {r.audience}{r.description ? ` · ${r.description}` : ""}</p>
                </td>
                <td className="px-4 py-3">{users.get(r.key) ?? 0}</td>
                <td className="px-4 py-3">{r.key === "super_admin" ? "All" : modulesOf(r.key)}</td>
                <td className="px-4 py-3">{r.key === "super_admin" ? "All" : grants.get(r.key)?.size ?? 0}</td>
                <td className="px-4 py-3"><span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", r.is_active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>{r.is_active ? "Active" : "Disabled"}</span></td>
                <td className="px-4 py-3 text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {r.key !== "super_admin" && <IconBtn label="Configure permissions" onClick={() => setEditing(r.key)}><Settings2 className="h-4 w-4" /></IconBtn>}
                    {r.role_type === "custom" && <IconBtn label="Assign users" onClick={() => setAssigning(r)}><Users className="h-4 w-4" /></IconBtn>}
                    <IconBtn label="Duplicate" onClick={() => setCreating(r)}><Copy className="h-4 w-4" /></IconBtn>
                    {r.key !== "super_admin" && <IconBtn label={r.is_active ? "Disable" : "Enable"} onClick={() => toggleActive(r)}><Power className="h-4 w-4" /></IconBtn>}
                    {r.role_type === "custom" && !r.is_protected && <IconBtn label="Delete" onClick={() => remove(r)} danger><Trash2 className="h-4 w-4" /></IconBtn>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ModuleSwitches modules={modules} onChanged={refresh} />

      <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
          {editing && <PermissionEditor role={roles.find((r) => r.key === editing)!} modules={modules} perms={perms} granted={grants.get(editing) ?? new Set()} onSaved={() => { refresh(); setEditing(null); }} />}
        </SheetContent>
      </Sheet>

      <Dialog open={!!creating} onOpenChange={(o) => !o && setCreating(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{creating === "new" ? "Create role" : `Duplicate ${creating && creating !== "new" ? creating.name : ""}`}</DialogTitle></DialogHeader>
          {creating && <CreateRoleForm source={creating === "new" ? null : creating} sourceGrants={creating !== "new" ? grants.get(creating.key) : undefined} existing={roles.map((r) => r.key)}
            onDone={(key) => { setCreating(null); refresh(); setEditing(key); }} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!assigning} onOpenChange={(o) => !o && setAssigning(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle>Assign people to {assigning?.name}</DialogTitle></DialogHeader>
          {assigning && <AssignUsers role={assigning} onChanged={refresh} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function IconBtn({ label, onClick, children, danger }: { label: string; onClick: () => void; children: React.ReactNode; danger?: boolean }) {
  return <button onClick={onClick} aria-label={label} title={label} className={cn("flex h-9 w-9 items-center justify-center rounded-lg border border-border", danger ? "text-destructive" : "text-muted-foreground hover:text-foreground")}>{children}</button>;
}

function CreateRoleForm({ source, sourceGrants, existing, onDone }: { source: Role | null; sourceGrants: Set<string> | undefined; existing: string[]; onDone: (key: string) => void }) {
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name") ?? "").trim();
    let key = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 36) || "role";
    while (existing.includes(key)) key = `${key.slice(0, 34)}_${Math.floor(Math.random() * 90 + 10)}`;
    setBusy(true);
    const { error } = await supabase.from("roles").insert({
      key, name, description: String(f.get("description") ?? "").trim() || null, role_type: "custom",
      audience: String(f.get("audience")), is_active: f.get("status") === "active",
    });
    if (error) { setBusy(false); toast.error(error.message); return; }
    if (sourceGrants?.size) {
      const { error: e2 } = await supabase.from("role_permissions").insert([...sourceGrants].map((p) => ({ role: key, permission_key: p })));
      if (e2) toast.error(`Role created, but copying permissions failed: ${e2.message}`);
    }
    setBusy(false);
    toast.success("Role created — now choose its permissions");
    onDone(key);
  };
  return (
    <form onSubmit={submit} className="grid gap-3">
      <label className="grid gap-1 text-xs text-muted-foreground">Role name *<input name="name" required maxLength={60} defaultValue={source ? `${source.name} (copy)` : ""} placeholder="e.g. Network Engineer" className={inputCls} /></label>
      <label className="grid gap-1 text-xs text-muted-foreground">Description<textarea name="description" maxLength={300} defaultValue={source?.description ?? ""} rows={3} className={cn(inputCls, "py-2")} /></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1 text-xs text-muted-foreground">Role type
          <select name="audience" defaultValue={source?.audience ?? "staff"} className={inputCls}><option value="staff">Staff</option><option value="customer">Customer</option></select>
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">Status
          <select name="status" defaultValue="active" className={inputCls}><option value="active">Active</option><option value="disabled">Disabled</option></select>
        </label>
      </div>
      <p className="text-[11px] text-muted-foreground">{sourceGrants?.size ? `${sourceGrants.size} permissions will be copied. ` : ""}You'll pick modules and permissions next.</p>
      <button disabled={busy} className="min-h-[44px] rounded-lg bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60">{busy ? "Saving…" : "Create role"}</button>
    </form>
  );
}

function PermissionEditor({ role, modules, perms, granted, onSaved }: { role: Role; modules: Module[]; perms: Perm[]; granted: Set<string>; onSaved: () => void }) {
  const [sel, setSel] = useState<Set<string>>(() => new Set(granted));
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const permKeys = useMemo(() => new Set(perms.map((p) => p.key)), [perms]);
  const modName = (k: string) => modules.find((m) => m.key === k)?.name ?? k;

  const flip = (keys: string[], on: boolean) => setSel((cur) => { const n = new Set(cur); for (const k of keys) on ? n.add(k) : n.delete(k); return n; });

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? perms.filter((p) => [p.key, p.description ?? "", modName(p.module_key)].some((v) => v.toLowerCase().includes(s))) : [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, perms]);

  // Dependencies: any module used needs "view" on the modules it depends on
  const missingDeps = useMemo(() => {
    const used = new Set([...sel].map((k) => k.split(".")[0]!));
    const need: { module: string; for: string }[] = [];
    for (const m of modules) if (used.has(m.key)) for (const d of m.depends_on) if (!sel.has(`${d}.view`) && permKeys.has(`${d}.view`)) need.push({ module: d, for: m.key });
    return need;
  }, [sel, modules, permKeys]);

  const save = async () => {
    const add = [...sel].filter((k) => !granted.has(k));
    const del = [...granted].filter((k) => !sel.has(k));
    if (!add.length && !del.length) { onSaved(); return; }
    if (missingDeps.length && !window.confirm(`Some sections depend on others:\n${missingDeps.map((d) => `• ${modName(d.for)} needs ${modName(d.module)} (view)`).join("\n")}\n\nSave anyway without them? Choose Cancel and use "Add required" to include them.`)) return;
    setBusy(true);
    try {
      if (del.length) { const { error } = await supabase.from("role_permissions").delete().eq("role", role.key).in("permission_key", del); if (error) throw error; }
      if (add.length) { const { error } = await supabase.from("role_permissions").insert(add.map((p) => ({ role: role.key, permission_key: p }))); if (error) throw error; }
      toast.success(`Saved ${role.name}: +${add.length} / −${del.length} permissions`);
      onSaved();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  const extras = (mk: string) => perms.filter((p) => p.module_key === mk && !MATRIX.includes(p.action as (typeof MATRIX)[number]));

  return (
    <>
      <SheetHeader>
        <SheetTitle className="text-left">{role.name} — permissions</SheetTitle>
        <p className="text-left text-xs text-muted-foreground">{sel.size} selected{!role.is_active && " · This role is disabled, so nothing applies until it's enabled"}</p>
      </SheetHeader>
      <div className="space-y-4 px-4 pb-28 pt-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search permissions… (invoice, chat, service, media)" className={cn(inputCls, "pl-9")} aria-label="Search permissions" />
        </div>
        {q && (
          <div className="rounded-xl border border-border p-3">
            <div className="mb-2 flex items-center justify-between text-xs"><span className="text-muted-foreground">{filtered.length} matches</span>
              <span className="flex gap-2"><button onClick={() => flip(filtered.map((p) => p.key), true)} className="font-semibold text-primary">Select all</button><button onClick={() => flip(filtered.map((p) => p.key), false)} className="font-semibold text-muted-foreground">Clear all</button></span>
            </div>
            <ul className="max-h-60 space-y-1 overflow-y-auto">
              {filtered.map((p) => (
                <li key={p.key}><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sel.has(p.key)} onChange={(e) => flip([p.key], e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
                  <span className="font-mono text-xs">{p.key}</span><span className="truncate text-xs text-muted-foreground">{p.description}</span></label></li>
              ))}
            </ul>
          </div>
        )}

        {missingDeps.length > 0 && (
          <div className="rounded-xl border border-accent/50 bg-accent/10 p-3 text-xs">
            <p className="font-semibold">Required sections missing</p>
            <ul className="mt-1 list-disc pl-4">{missingDeps.map((d) => <li key={d.for + d.module}>{modName(d.for)} needs “view {modName(d.module).toLowerCase()}”</li>)}</ul>
            <button onClick={() => flip(missingDeps.map((d) => `${d.module}.view`), true)} className="mt-2 min-h-[32px] rounded-lg bg-accent px-3 font-semibold text-accent-foreground">Add required</button>
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="text-xs text-muted-foreground"><tr className="border-b border-border"><th className="px-3 py-2 text-left">Section</th>{MATRIX.map((a) => <th key={a} className="px-2 py-2 capitalize">{a}</th>)}<th className="px-2 py-2">All</th></tr></thead>
            <tbody>
              {modules.map((m) => {
                const keys = MATRIX.map((a) => `${m.key}.${a}`).filter((k) => permKeys.has(k));
                const all = keys.every((k) => sel.has(k));
                return (
                  <tr key={m.key} className={cn("border-b border-border/40 last:border-0", !m.is_enabled && "opacity-50")}>
                    <td className="px-3 py-2"><p className="font-medium">{m.name}</p>{!m.is_enabled && <p className="text-[10px] text-muted-foreground">Section switched off</p>}
                      {extras(m.key).length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">{extras(m.key).map((p) => (
                          <button key={p.key} onClick={() => flip([p.key], !sel.has(p.key))} title={p.description ?? ""}
                            className={cn("rounded-full border border-border px-2 py-0.5 text-[10px]", sel.has(p.key) ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>{p.action.replace(/_/g, " ")}</button>
                        ))}</div>
                      )}
                    </td>
                    {MATRIX.map((a) => {
                      const k = `${m.key}.${a}`;
                      return <td key={a} className="px-2 py-2 text-center">{permKeys.has(k)
                        ? <input type="checkbox" aria-label={`${a} ${m.name}`} checked={sel.has(k)} onChange={(e) => flip([k], e.target.checked)} className="h-5 w-5 accent-[var(--primary)]" />
                        : <span className="text-muted-foreground">—</span>}</td>;
                    })}
                    <td className="px-2 py-2 text-center"><input type="checkbox" aria-label={`All ${m.name}`} checked={all} onChange={(e) => flip(keys, e.target.checked)} className="h-5 w-5 accent-[var(--primary)]" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div className="fixed bottom-0 right-0 flex w-full gap-2 border-t border-border bg-background p-4 sm:max-w-3xl">
        <button onClick={() => setSel(new Set(granted))} className="min-h-[44px] flex-1 rounded-lg border border-border text-sm font-semibold">Reset</button>
        <button onClick={save} disabled={busy} className="min-h-[44px] flex-[2] rounded-lg bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60">{busy ? "Saving…" : "Save permissions"}</button>
      </div>
    </>
  );
}

function AssignUsers({ role, onChanged }: { role: Role; onChanged: () => void }) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const list = useQuery({
    queryKey: ["assign-users", role.key],
    queryFn: async () => {
      const [p, a] = await Promise.all([
        supabase.from("profiles").select("id,full_name,email").order("full_name"),
        supabase.from("user_custom_roles").select("user_id").eq("role_key", role.key),
      ]);
      if (p.error) throw p.error;
      const has = new Set((a.data ?? []).map((x) => x.user_id));
      return (p.data ?? []).map((u) => ({ ...u, has: has.has(u.id) }));
    },
  });
  const toggle = async (id: string, has: boolean) => {
    const res = has
      ? await supabase.from("user_custom_roles").delete().eq("user_id", id).eq("role_key", role.key)
      : await supabase.from("user_custom_roles").insert({ user_id: id, role_key: role.key });
    if (res.error) { toast.error(res.error.message.includes("row-level") ? "You can't change your own roles" : res.error.message); return; }
    qc.invalidateQueries({ queryKey: ["assign-users", role.key] }); onChanged();
  };
  const s = q.toLowerCase();
  return (
    <div className="space-y-3">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people…" className={inputCls} />
      <ul className="space-y-1">
        {list.data?.filter((u) => !s || u.full_name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s)).map((u) => (
          <li key={u.id}><label className="flex min-h-[44px] items-center gap-3 rounded-lg px-2 hover:bg-background/40">
            <input type="checkbox" checked={u.has} onChange={() => toggle(u.id, u.has)} className="h-5 w-5 accent-[var(--primary)]" />
            <span className="min-w-0"><span className="block truncate text-sm font-medium">{u.full_name}</span><span className="block truncate text-xs text-muted-foreground">{u.email}</span></span>
          </label></li>
        ))}
      </ul>
    </div>
  );
}

function ModuleSwitches({ modules, onChanged }: { modules: Module[]; onChanged: () => void }) {
  const toggle = async (m: Module) => {
    const dependents = modules.filter((x) => x.is_enabled && x.depends_on.includes(m.key)).map((x) => x.name);
    if (m.is_enabled && !window.confirm(`Switch off "${m.name}" for everyone except the Super Admin?${dependents.length ? `\n\nThese sections depend on it: ${dependents.join(", ")}.` : ""}`)) return;
    const { error } = await supabase.from("app_modules").update({ is_enabled: !m.is_enabled }).eq("key", m.key);
    if (error) { toast.error(error.message); return; }
    toast.success(`${m.name} ${m.is_enabled ? "switched off" : "switched on"}`); onChanged();
  };
  return (
    <section className="glass rounded-2xl p-4">
      <h3 className="font-bold">Sections on / off</h3>
      <p className="text-xs text-muted-foreground">A switched-off section gives no permissions to anyone except the Super Admin.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((m) => (
          <label key={m.key} className="flex min-h-[52px] items-center justify-between gap-3 rounded-xl border border-border px-3">
            <span className="min-w-0"><span className="block text-sm font-medium">{m.name}</span>
              <span className="block truncate text-[11px] text-muted-foreground">{m.depends_on.length ? `Needs: ${m.depends_on.map((d) => modules.find((x) => x.key === d)?.name ?? d).join(", ")}` : m.description}</span></span>
            <input type="checkbox" role="switch" checked={m.is_enabled} onChange={() => toggle(m)} aria-label={`${m.name} on/off`} className="h-5 w-5 shrink-0 accent-[var(--primary)]" />
          </label>
        ))}
      </div>
    </section>
  );
}
