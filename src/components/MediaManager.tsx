import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { companyQuery } from "@/lib/company";
import { cn } from "@/lib/utils";

const FOLDERS = ["general", "branding", "services", "projects"];
const TEN_YEARS = 60 * 60 * 24 * 365 * 10;
const inputCls = "min-h-[40px] rounded-lg border border-border bg-background/60 px-3 text-sm text-foreground";

export function MediaManager() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [folder, setFolder] = useState("all");
  const [uploadFolder, setUploadFolder] = useState("general");
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");

  const list = useQuery({
    queryKey: ["media-assets"],
    queryFn: async () => {
      const { data, error } = await supabase.from("media_assets").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const company = useQuery(companyQuery);

  const rows = useMemo(
    () => (list.data ?? []).filter((m) => (folder === "all" || m.folder === folder) && m.name.toLowerCase().includes(q.toLowerCase())),
    [list.data, folder, q],
  );

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) { toast.error(`${file.name}: only images allowed`); continue; }
      const path = `${uploadFolder}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const up = await supabase.storage.from("media").upload(path, file, { contentType: file.type });
      if (up.error) { toast.error(up.error.message); continue; }
      const signed = await supabase.storage.from("media").createSignedUrl(path, TEN_YEARS);
      if (signed.error || !signed.data) { toast.error(signed.error?.message ?? "Could not create link"); continue; }
      const { error } = await supabase.from("media_assets").insert({
        path, url: signed.data.signedUrl, name: file.name, folder: uploadFolder, mime_type: file.type, size_bytes: file.size,
      });
      if (error) toast.error(error.message);
    }
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
    toast.success("Upload finished");
    qc.invalidateQueries({ queryKey: ["media-assets"] });
  };

  const remove = async (id: string, path: string) => {
    if (!confirm("Delete this file?")) return;
    const s = await supabase.storage.from("media").remove([path]);
    if (s.error) { toast.error(s.error.message); return; }
    await supabase.from("media_assets").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["media-assets"] });
  };

  const setLogo = async (url: string) => {
    const { error } = await supabase.from("company_settings").update({ logo_url: url }).eq("id", 1);
    if (error) { toast.error(error.message); return; }
    toast.success("Logo updated across the site");
    qc.invalidateQueries({ queryKey: companyQuery.queryKey });
  };

  const copy = async (url: string) => {
    await navigator.clipboard.writeText(url);
    toast.success("Link copied — paste it into a service's image field");
  };

  return (
    <div className="space-y-4">
      <div className="glass flex flex-wrap items-center gap-2 rounded-2xl p-4">
        <select className={inputCls} value={uploadFolder} onChange={(e) => setUploadFolder(e.target.value)}>
          {FOLDERS.map((f) => <option key={f} value={f}>Upload to: {f}</option>)}
        </select>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => upload(e.target.files)} />
        <button disabled={busy} onClick={() => fileRef.current?.click()}
          className="min-h-[40px] rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {busy ? "Uploading…" : "Upload images"}
        </button>
        <span className="text-xs text-muted-foreground">Max 10 MB each</span>
      </div>

      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <input className={inputCls} placeholder="Search files…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={inputCls} value={folder} onChange={(e) => setFolder(e.target.value)}>
          <option value="all">All folders</option>
          {FOLDERS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      {list.isLoading && <p className="text-sm text-muted-foreground">Loading media…</p>}
      {!list.isLoading && rows.length === 0 && <div className="glass rounded-2xl p-6 text-sm text-muted-foreground">No files yet.</div>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {rows.map((m) => {
          const isLogo = company.data?.logo_url === m.url;
          return (
            <div key={m.id} className={cn("glass overflow-hidden rounded-2xl", isLogo && "ring-2 ring-primary")}>
              <img src={m.url} alt={m.name} loading="lazy" className="aspect-square w-full bg-background/40 object-cover" />
              <div className="space-y-2 p-3">
                <p className="truncate text-xs font-semibold">{m.name}</p>
                <p className="text-[11px] text-muted-foreground">{m.folder} · {m.size_bytes ? `${Math.round(m.size_bytes / 1024)} KB` : ""}</p>
                <div className="flex flex-wrap gap-1">
                  <button onClick={() => copy(m.url)} className="rounded-md border border-border px-2 py-1 text-[11px]">Copy link</button>
                  <button disabled={isLogo} onClick={() => setLogo(m.url)} className="rounded-md border border-border px-2 py-1 text-[11px] disabled:opacity-50">{isLogo ? "Logo" : "Use as logo"}</button>
                  <button onClick={() => remove(m.id, m.path)} className="rounded-md border border-border px-2 py-1 text-[11px] text-destructive">Delete</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
