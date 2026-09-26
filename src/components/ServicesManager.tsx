import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { featureList, usd, tzs } from "@/lib/services";
import { useCompany } from "@/lib/company";

const inputCls = "min-h-[40px] rounded-lg border border-border bg-background/60 px-3 text-sm text-foreground";

type Row = {
  id: string; title: string; slug: string; short_description: string; full_description: string;
  starting_price: number; billing_type: string; features: unknown; image_url: string | null; display_order: number | null; is_active: boolean | null;
  is_featured: boolean; is_available: boolean; gallery: unknown; requirements: string | null; terms: string | null;
};

export function ServicesManager() {
  const qc = useQueryClient();
  const { toTzs } = useCompany();
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const q = useQuery({
    queryKey: ["admin-services"],
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase
        .from("services")
        .select("id,title,slug,short_description,full_description,starting_price,billing_type,features,image_url,display_order,is_active,is_featured,is_available,gallery,requirements,terms")
        .order("display_order");
      if (error) throw error;
      return data as Row[];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-services"] });
    qc.invalidateQueries({ queryKey: ["services"] });
  };

  const toggle = async (r: Row) => {
    const { error } = await supabase.from("services").update({ is_active: !r.is_active }).eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    toast.success(r.is_active ? "Hidden from website" : "Shown on website");
    refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setEditing("new")} className="min-h-[44px] rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground">
          Add service
        </button>
      </div>
      {editing && <ServiceForm row={editing === "new" ? null : editing} onDone={() => { setEditing(null); refresh(); }} />}
      {q.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {q.data?.length === 0 && <p className="text-sm text-muted-foreground">No services yet.</p>}
      <div className="grid gap-3">
        {q.data?.map((r) => (
          <div key={r.id} className="glass grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl p-4">
            <div className="min-w-0">
              <p className="truncate font-semibold">{r.title} {!r.is_active && <span className="ml-2 text-xs text-warning">Hidden</span>}</p>
              <p className="truncate text-xs text-muted-foreground">
                {usd(Number(r.starting_price))} · ≈ {tzs(toTzs(Number(r.starting_price)))} · {r.billing_type}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button onClick={() => setEditing(r)} className="min-h-[40px] rounded-lg border border-border px-3 text-sm">Edit</button>
              <button onClick={() => toggle(r)} className="min-h-[40px] rounded-lg border border-border px-3 text-sm">
                {r.is_active ? "Hide" : "Show"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ServiceForm({ row, onDone }: { row: Row | null; onDone: () => void }) {
  const [saving, setSaving] = useState(false);
  return (
    <form
      className="glass grid gap-3 rounded-2xl p-5 md:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const v = (k: string) => String(f.get(k) ?? "").trim();
        const title = v("title");
        const price = Number(v("starting_price"));
        if (!title || !v("short_description") || !v("billing_type") || !(price >= 0)) {
          toast.error("Title, short description, price and billing are required");
          return;
        }
        const payload = {
          title,
          slug: v("slug") || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
          short_description: v("short_description"),
          full_description: v("full_description") || v("short_description"),
          starting_price: price,
          price_tzs: null,
          billing_type: v("billing_type"),
          features: v("features").split("\n").map((s) => s.trim()).filter(Boolean),
          display_order: Number(v("display_order")) || 0,
          image_url: v("image_url") || null,
          gallery: v("gallery").split("\n").map((x) => x.trim()).filter(Boolean),
          requirements: v("requirements") || null,
          terms: v("terms") || null,
          is_featured: f.get("is_featured") === "on",
          is_available: f.get("is_available") === "on",
        };
        setSaving(true);
        const { error } = row
          ? await supabase.from("services").update(payload).eq("id", row.id)
          : await supabase.from("services").insert(payload);
        setSaving(false);
        if (error) { toast.error(error.message); return; }
        toast.success("Service saved — the website is updated");
        onDone();
      }}
    >
      <Field label="Title" name="title" def={row?.title} />
      <Field label="Billing (e.g. One-time, Monthly)" name="billing_type" def={row?.billing_type} />
      <Field label="Starting price (USD)" name="starting_price" def={row ? String(row.starting_price) : ""} />
      <Field label="Display order" name="display_order" def={String(row?.display_order ?? 0)} />
      <ImagePicker def={row?.image_url ?? ""} />
      <label className="grid gap-1 text-xs text-muted-foreground md:col-span-2">
        Gallery images (one link per line, from Media → Copy link)
        <textarea name="gallery" defaultValue={Array.isArray(row?.gallery) ? (row!.gallery as string[]).join("\n") : ""} rows={2} className={`${inputCls} py-2`} />
      </label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_featured" defaultChecked={row?.is_featured ?? false} className="h-4 w-4" /> Featured</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_available" defaultChecked={row?.is_available ?? true} className="h-4 w-4" /> Available for requests</label>
      <Field label="Short description" name="short_description" def={row?.short_description} wide />
      <label className="grid gap-1 text-xs text-muted-foreground md:col-span-2">
        Full description
        <textarea name="full_description" defaultValue={row?.full_description ?? ""} rows={3} className={`${inputCls} py-2`} />
      </label>
      <label className="grid gap-1 text-xs text-muted-foreground md:col-span-2">
        Features (one per line)
        <textarea name="features" defaultValue={featureList(row?.features).join("\n")} rows={4} className={`${inputCls} py-2`} />
      </label>
      <label className="grid gap-1 text-xs text-muted-foreground">
        Requirements (shown on the service page)
        <textarea name="requirements" defaultValue={row?.requirements ?? ""} rows={3} className={`${inputCls} py-2`} />
      </label>
      <label className="grid gap-1 text-xs text-muted-foreground">
        Terms (shown on the service page)
        <textarea name="terms" defaultValue={row?.terms ?? ""} rows={3} className={`${inputCls} py-2`} />
      </label>
      <input type="hidden" name="slug" defaultValue={row?.slug ?? ""} />
      <div className="flex gap-2 md:col-span-2">
        <button disabled={saving} className="min-h-[44px] rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {saving ? "Saving…" : "Save service"}
        </button>
        <button type="button" onClick={onDone} className="min-h-[44px] rounded-xl border border-border px-5 text-sm">Cancel</button>
      </div>
    </form>
  );
}

function Field({ label, name, def, wide }: { label: string; name: string; def?: string | undefined; wide?: boolean }) {
  return (
    <label className={`grid gap-1 text-xs text-muted-foreground ${wide ? "md:col-span-2" : ""}`}>
      {label}
      <input name={name} defaultValue={def ?? ""} className={inputCls} />
    </label>
  );
}

function ImagePicker({ def }: { def: string }) {
  const [url, setUrl] = useState(def);
  const [browsing, setBrowsing] = useState(false);
  const media = useQuery({
    queryKey: ["media-pick"],
    enabled: browsing,
    queryFn: async () => {
      const { data, error } = await supabase.from("media_assets").select("id,url,name").like("mime_type", "image/%").order("created_at", { ascending: false }).limit(60);
      if (error) throw error;
      return data;
    },
  });
  return (
    <div className="grid gap-2 md:col-span-2">
      <span className="text-xs text-muted-foreground">Main image</span>
      <div className="flex items-center gap-3">
        <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-border bg-background/60">
          {url && <img src={url} alt="" className="h-full w-full object-cover" />}
        </div>
        <input name="image_url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Image link" className={`${inputCls} min-w-0 flex-1`} />
        <button type="button" onClick={() => setBrowsing((b) => !b)} className="min-h-[40px] shrink-0 rounded-lg border border-border px-3 text-sm">
          {browsing ? "Close" : "Choose from Media"}
        </button>
      </div>
      {browsing && (
        <div className="grid max-h-64 grid-cols-3 gap-2 overflow-y-auto rounded-xl border border-border p-2 sm:grid-cols-6">
          {media.isLoading && <p className="col-span-full text-xs text-muted-foreground">Loading…</p>}
          {media.data?.length === 0 && <p className="col-span-full text-xs text-muted-foreground">No images yet — upload some in the Media tab.</p>}
          {media.data?.map((m) => (
            <button type="button" key={m.id} title={m.name} onClick={() => { setUrl(m.url); setBrowsing(false); }} className="aspect-square overflow-hidden rounded-lg border border-border hover:border-primary">
              <img src={m.url} alt={m.name} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
