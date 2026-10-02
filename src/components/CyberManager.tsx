import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  asList, slugify, priceLabel, PRICING_MODELS, DELIVERY, SERVICE_STATUS, CYBER_CURRENCIES,
  type CyberCategory, type CyberService, type CyberPackage,
} from "@/lib/cyber";

const sel = "min-h-[40px] w-full rounded-lg border border-border bg-background/60 px-2 text-sm text-foreground";
const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

/** Super admin editor for cyber security categories, services and packages. */
export function CyberManager() {
  const qc = useQueryClient();
  const [view, setView] = useState<"services" | "categories" | "packages">("services");
  const [edit, setEdit] = useState<{ kind: typeof view; row: Record<string, unknown> | null } | null>(null);
  const q = useQuery({
    queryKey: ["cyber-admin"],
    queryFn: async () => {
      const [c, s, p] = await Promise.all([
        supabase.from("cyber_service_categories").select("*").order("display_order"),
        supabase.from("cyber_services").select("*").order("display_order"),
        supabase.from("cyber_service_packages").select("*").order("display_order"),
      ]);
      if (c.error) throw c.error; if (s.error) throw s.error; if (p.error) throw p.error;
      return { categories: c.data as CyberCategory[], services: s.data as CyberService[], packages: p.data as CyberPackage[] };
    },
  });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["cyber-admin"] }); qc.invalidateQueries({ queryKey: ["cyber-public"] }); };
  const table = { services: "cyber_services", categories: "cyber_service_categories", packages: "cyber_service_packages" } as const;

  async function remove(kind: typeof view, id: string, name: string) {
    if (!confirm(`Delete "${name}"? This can't be undone.`)) return;
    const { error } = await supabase.from(table[kind]).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted"); refresh();
  }

  const d = q.data;
  const catName = (id: string | null) => d?.categories.find((c) => c.id === id)?.name ?? "—";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-lg border border-border p-1">
          {(["services", "categories", "packages"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} className={`rounded-md px-3 py-1.5 text-sm capitalize ${view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{v}</button>
          ))}
        </div>
        <Button onClick={() => setEdit({ kind: view, row: null })}>Add {view.slice(0, -1).replace("categorie", "category")}</Button>
      </div>
      {q.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {q.error && <p className="text-sm text-destructive">{(q.error as Error).message}</p>}
      {d && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {view === "services" && d.services.map((s) => (
            <Card key={s.id} title={s.name} sub={`${catName(s.category_id)} · ${SERVICE_STATUS[s.status as keyof typeof SERVICE_STATUS] ?? s.status}${s.is_public ? "" : " · hidden"}${s.is_featured ? " · featured" : ""}`}
              body={priceLabel(s.pricing_model, s.price, s.currency)} onEdit={() => setEdit({ kind: "services", row: s })} onDelete={() => remove("services", s.id, s.name)} />
          ))}
          {view === "categories" && d.categories.map((c) => (
            <Card key={c.id} title={c.name} sub={c.is_active ? "Active" : "Inactive"} body={`${d.services.filter((s) => s.category_id === c.id).length} services`}
              onEdit={() => setEdit({ kind: "categories", row: c })} onDelete={() => remove("categories", c.id, c.name)} />
          ))}
          {view === "packages" && d.packages.map((p) => (
            <Card key={p.id} title={p.name} sub={`${p.is_active ? "Active" : "Inactive"}${p.is_featured ? " · featured" : ""}`} body={`${priceLabel(p.pricing_model, p.price, p.currency)} · ${asList(p.includes).length} items`}
              onEdit={() => setEdit({ kind: "packages", row: p })} onDelete={() => remove("packages", p.id, p.name)} />
          ))}
        </div>
      )}
      {edit && d && <Editor kind={edit.kind} row={edit.row} categories={d.categories} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); refresh(); }} />}
    </div>
  );
}

function Card({ title, sub, body, onEdit, onDelete }: { title: string; sub: string; body: string; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-4">
      <p className="font-semibold">{title}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
      <p className="mt-2 text-sm">{body}</p>
      <div className="mt-3 flex gap-2">
        <Button size="sm" variant="outline" onClick={onEdit}>Edit</Button>
        <Button size="sm" variant="ghost" className="text-destructive" onClick={onDelete}>Delete</Button>
      </div>
    </div>
  );
}

function Editor({ kind, row, categories, onClose, onSaved }: {
  kind: "services" | "categories" | "packages"; row: Record<string, unknown> | null; categories: CyberCategory[]; onClose: () => void; onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r: any = row ?? {};
  const chk = (n: string, label: string, def: boolean) => (
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name={n} defaultChecked={r[n] ?? def} /> {label}</label>
  );

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const g = (k: string) => String(f.get(k) ?? "").trim();
    const name = g("name");
    if (!name) { toast.error("Name is required"); return; }
    const slug = slugify(g("slug") || name);
    const priceRaw = g("price");
    const price = priceRaw === "" ? null : Number(priceRaw);
    if (price != null && (isNaN(price) || price < 0)) { toast.error("Price must be a positive number"); return; }
    let payload: Record<string, unknown>;
    if (kind === "categories") {
      payload = { name, slug, description: g("description") || null, is_active: f.get("is_active") === "on", display_order: Number(g("display_order") || 0) };
    } else if (kind === "packages") {
      payload = { name, slug, description: g("description") || null, includes: lines(g("includes")), price, currency: g("currency"), pricing_model: g("pricing_model"),
        is_active: f.get("is_active") === "on", is_featured: f.get("is_featured") === "on", display_order: Number(g("display_order") || 0) };
    } else {
      if (!g("short_description") || !g("full_description")) { toast.error("Both descriptions are required"); return; }
      payload = { name, slug, category_id: g("category_id") || null, short_description: g("short_description"), full_description: g("full_description"),
        icon: g("icon") || "shield", image_url: g("image_url") || null, status: g("status"), pricing_model: g("pricing_model"), price, currency: g("currency"),
        estimated_duration: g("estimated_duration") || null, delivery_method: g("delivery_method"), is_featured: f.get("is_featured") === "on",
        is_public: f.get("is_public") === "on", show_price: f.get("show_price") === "on", seo_title: g("seo_title") || null, meta_description: g("meta_description") || null,
        features: lines(g("features")), deliverables: lines(g("deliverables")), display_order: Number(g("display_order") || 0) };
    }
    setSaving(true);
    const tbl = kind === "services" ? "cyber_services" : kind === "categories" ? "cyber_service_categories" : "cyber_service_packages";
    const { error } = row ? await supabase.from(tbl).update(payload as never).eq("id", r.id) : await supabase.from(tbl).insert(payload as never);
    setSaving(false);
    if (error) { toast.error(error.message.includes("duplicate") ? "That name/slug is already used" : error.message); return; }
    toast.success("Saved"); onSaved();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{row ? "Edit" : "Add"} {kind === "categories" ? "category" : kind.slice(0, -1)}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Name</Label><Input name="name" required maxLength={150} defaultValue={r.name} /></div>
            <div><Label>Slug (web address)</Label><Input name="slug" maxLength={150} defaultValue={r.slug} placeholder="auto from name" /></div>
          </div>
          {kind !== "services" && <div><Label>Description</Label><Textarea name="description" rows={3} maxLength={2000} defaultValue={r.description ?? ""} /></div>}
          {kind === "services" && <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Category</Label><select name="category_id" className={sel} defaultValue={r.category_id ?? ""}><option value="">—</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div><Label>Status</Label><select name="status" className={sel} defaultValue={r.status ?? "draft"}>{Object.entries(SERVICE_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            </div>
            <div><Label>Short description</Label><Input name="short_description" maxLength={300} defaultValue={r.short_description} /></div>
            <div><Label>Full description</Label><Textarea name="full_description" rows={4} maxLength={6000} defaultValue={r.full_description} /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Icon name</Label><Input name="icon" maxLength={40} defaultValue={r.icon ?? "shield"} /></div>
              <div><Label>Picture link</Label><Input name="image_url" maxLength={1000} defaultValue={r.image_url ?? ""} /></div>
              <div><Label>Delivery</Label><select name="delivery_method" className={sel} defaultValue={r.delivery_method ?? "remote"}>{Object.entries(DELIVERY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              <div><Label>Estimated duration</Label><Input name="estimated_duration" maxLength={80} defaultValue={r.estimated_duration ?? ""} /></div>
            </div>
          </>}
          {kind !== "categories" && <div className="grid gap-3 sm:grid-cols-3">
            <div><Label>Pricing</Label><select name="pricing_model" className={sel} defaultValue={r.pricing_model ?? "custom_quote"}>{Object.entries(PRICING_MODELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <div><Label>Price</Label><Input name="price" type="number" min={0} step="0.01" defaultValue={r.price ?? ""} /></div>
            <div><Label>Currency</Label><select name="currency" className={sel} defaultValue={r.currency ?? "USD"}>{CYBER_CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></div>
          </div>}
          {kind === "services" && <>
            <div><Label>Features (one per line)</Label><Textarea name="features" rows={3} defaultValue={asList(r.features).join("\n")} /></div>
            <div><Label>Deliverables (one per line)</Label><Textarea name="deliverables" rows={3} defaultValue={asList(r.deliverables).join("\n")} /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>SEO title</Label><Input name="seo_title" maxLength={70} defaultValue={r.seo_title ?? ""} /></div>
              <div><Label>Meta description</Label><Input name="meta_description" maxLength={160} defaultValue={r.meta_description ?? ""} /></div>
            </div>
          </>}
          {kind === "packages" && <div><Label>Includes (one per line)</Label><Textarea name="includes" rows={4} defaultValue={asList(r.includes).join("\n")} /></div>}
          <div><Label>Display order</Label><Input name="display_order" type="number" defaultValue={r.display_order ?? 0} /></div>
          <div className="flex flex-wrap gap-4">
            {kind !== "services" && chk("is_active", "Active", true)}
            {kind !== "categories" && chk("is_featured", "Featured", false)}
            {kind === "services" && chk("is_public", "Visible to public", true)}
            {kind === "services" && chk("show_price", "Show price", true)}
          </div>
          <Button type="submit" disabled={saving} className="w-full">{saving ? "Saving…" : "Save"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
