import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { AppRole } from "@/hooks/useRoles";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const ROLES: AppRole[] = ["super_admin", "admin", "operator", "technician", "customer"];
const inputCls = "min-h-[40px] rounded-lg border border-border bg-background/60 px-3 text-sm text-foreground";

type UserRow = {
  id: string; full_name: string; email: string; phone: string | null; company_name: string | null;
  city: string | null; created_at: string | null; is_suspended: boolean; roles: AppRole[];
};

export function UsersManager() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [role, setRole] = useState<AppRole | "all">("all");
  const [state, setState] = useState<"all" | "active" | "suspended">("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ["admin-users"],
    queryFn: async (): Promise<UserRow[]> => {
      const [p, r] = await Promise.all([
        supabase.from("profiles").select("id,full_name,email,phone,company_name,city,created_at,is_suspended").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id,role"),
      ]);
      if (p.error) throw p.error;
      if (r.error) throw r.error;
      return (p.data ?? []).map((x) => ({ ...x, roles: (r.data ?? []).filter((y) => y.user_id === x.id).map((y) => y.role as AppRole) }));
    },
  });

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (list.data ?? []).filter((u) =>
      (!s || [u.full_name, u.email, u.phone, u.company_name].some((v) => v?.toLowerCase().includes(s))) &&
      (role === "all" || u.roles.includes(role)) &&
      (state === "all" || (state === "suspended") === u.is_suspended),
    );
  }, [list.data, q, role, state]);

  const open = list.data?.find((u) => u.id === openId) ?? null;
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-users"] });
    qc.invalidateQueries({ queryKey: ["staff-profiles"] });
  };

  const toggleRole = async (u: UserRow, r: AppRole) => {
    const has = u.roles.includes(r);
    const res = has
      ? await supabase.from("user_roles").delete().eq("user_id", u.id).eq("role", r)
      : await supabase.from("user_roles").insert({ user_id: u.id, role: r });
    if (res.error) { toast.error(res.error.message); return; }
    refresh();
  };

  const toggleSuspend = async (u: UserRow) => {
    const { error } = await supabase.from("profiles").update({ is_suspended: !u.is_suspended }).eq("id", u.id);
    if (error) { toast.error(error.message); return; }
    toast.success(u.is_suspended ? "Account restored" : "Account suspended");
    refresh();
  };

  const total = list.data?.length ?? 0;
  const suspended = list.data?.filter((u) => u.is_suspended).length ?? 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[["Total users", total], ["Active", total - suspended], ["Suspended", suspended]].map(([l, v]) => (
          <div key={l} className="glass rounded-2xl p-4">
            <p className="text-xs text-muted-foreground">{l}</p>
            <p className="text-2xl font-extrabold">{v}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
        <input className={inputCls} placeholder="Search name, email, phone, company…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value as AppRole | "all")}>
          <option value="all">All roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
        </select>
        <select className={inputCls} value={state} onChange={(e) => setState(e.target.value as typeof state)}>
          <option value="all">All accounts</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {list.isLoading && <p className="text-sm text-muted-foreground">Loading users…</p>}
      {!list.isLoading && rows.length === 0 && <div className="glass rounded-2xl p-6 text-sm text-muted-foreground">No users match.</div>}

      <div className="space-y-2">
        {rows.map((u) => (
          <button key={u.id} onClick={() => setOpenId(u.id)} className="glass grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl p-4 text-left">
            <span className="min-w-0">
              <span className="block truncate font-bold">{u.full_name}</span>
              <span className="block truncate text-xs text-muted-foreground">{u.email}</span>
            </span>
            <span className="flex shrink-0 flex-wrap justify-end gap-1">
              {u.is_suspended && <span className="rounded-full bg-destructive/20 px-2 py-0.5 text-[11px] font-semibold text-destructive">Suspended</span>}
              {u.roles.map((r) => <span key={r} className="rounded-full border border-border px-2 py-0.5 text-[11px] capitalize text-muted-foreground">{r.replace("_", " ")}</span>)}
            </span>
          </button>
        ))}
      </div>

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="overflow-y-auto">
          {open && (
            <>
              <SheetHeader><SheetTitle>{open.full_name}</SheetTitle></SheetHeader>
              <dl className="mt-4 space-y-2 px-4 text-sm">
                {[["Email", open.email], ["Phone", open.phone], ["Company", open.company_name], ["City", open.city],
                  ["Joined", open.created_at ? new Date(open.created_at).toLocaleDateString() : null]].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3"><dt className="text-muted-foreground">{k}</dt><dd className="truncate">{v || "—"}</dd></div>
                ))}
              </dl>
              <div className="mt-6 px-4">
                <p className="text-xs font-semibold text-muted-foreground">Roles</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {ROLES.map((r) => (
                    <button key={r} disabled={open.id === user?.id} onClick={() => toggleRole(open, r)}
                      className={cn("min-h-[36px] rounded-full border border-border px-3 text-xs font-semibold capitalize disabled:opacity-50",
                        open.roles.includes(r) ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
                      {r.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-6 px-4 pb-6">
                <button disabled={open.id === user?.id} onClick={() => toggleSuspend(open)}
                  className={cn("min-h-[44px] w-full rounded-lg text-sm font-semibold disabled:opacity-50",
                    open.is_suspended ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground")}>
                  {open.is_suspended ? "Restore account" : "Suspend account"}
                </button>
                {open.id === user?.id && <p className="mt-2 text-xs text-muted-foreground">You can't change your own account here.</p>}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
