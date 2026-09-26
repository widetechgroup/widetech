import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { featureList, usd, tzs } from "@/lib/services";
import { useCompany } from "@/lib/company";

const inputCls = "min-h-[40px] rounded-lg border border-border bg-background/60 px-3 text-sm text-foreground";

type Row = {
  id: string; title: string; slug: string; short_description: string; full_description: string;
  starting_price: number; billing_type: string; features: unknown; display_order: number | null; is_active: boolean | null;
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
        .select("id,title,slug,short_description,full_description,starting_price,billing_type,features,display_order,is_active")
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
    if (error) return toast.error(error.message);
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
        };
        setSaving(true);
        const { error } = row
          ? await supabase.from("services").update(payload).eq("id", row.id)
          : await supabase.from("services").insert(payload);
        setSaving(false);
        if (error) return toast.error(error.message);
        toast.success("Service saved — the website is updated");
        onDone();
      }}
    >
      <Field label="Title" name="title" def={row?.title} />
      <Field label="Billing (e.g. One-time, Monthly)" name="billing_type" def={row?.billing_type} />
      <Field label="Starting price (USD)" name="starting_price" def={row ? String(row.starting_price) : ""} />
      <Field label="Display order" name="display_order" def={String(row?.display_order ?? 0)} />
      <Field label="Short description" name="short_description" def={row?.short_description} wide />
      <label className="grid gap-1 text-xs text-muted-foreground md:col-span-2">
        Full description
        <textarea name="full_description" defaultValue={row?.full_description ?? ""} rows={3} className={`${inputCls} py-2`} />
      </label>
      <label className="grid gap-1 text-xs text-muted-foreground md:col-span-2">
        Features (one per line)
        <textarea name="features" defaultValue={featureList(row?.features).join("\n")} rows={4} className={`${inputCls} py-2`} />
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
