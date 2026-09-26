import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FileText, Paperclip, Trash2, Download, Film, Music, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const MAX = 50 * 1024 * 1024;
const ACCEPT = "image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip";

type FileRow = { id: string; sender_id: string; path: string; name: string; mime_type: string | null; size_bytes: number | null; created_at: string };

const kb = (n: number | null) => (n == null ? "" : n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** Shared files between the customer and the assigned technician/staff for one request. */
export function RequestFiles({ requestId, className }: { requestId: string; className?: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const key = ["request-files", requestId];

  const files = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase.from("request_files").select("id,sender_id,path,name,mime_type,size_bytes,created_at").eq("request_id", requestId).order("created_at");
      if (error) throw error;
      const rows = data as FileRow[];
      if (!rows.length) return [];
      const { data: signed } = await supabase.storage.from("request-files").createSignedUrls(rows.map((r) => r.path), 3600);
      return rows.map((r, i) => ({ ...r, url: signed?.[i]?.signedUrl ?? null }));
    },
    refetchInterval: 30000,
  });

  useEffect(() => {
    const ch = supabase.channel(`rf-${requestId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "request_files", filter: `request_id=eq.${requestId}` }, () => qc.invalidateQueries({ queryKey: key }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  const upload = async (list: FileList | null) => {
    if (!list || !user) return;
    for (const file of Array.from(list)) {
      if (file.size > MAX) { toast.error(`${file.name} is larger than 50 MB`); continue; }
      setUploading(file.name);
      const path = `${requestId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
      const up = await supabase.storage.from("request-files").upload(path, file, { contentType: file.type || undefined });
      if (up.error) { toast.error(up.error.message); continue; }
      const { error } = await supabase.from("request_files").insert({ request_id: requestId, path, name: file.name, mime_type: file.type || null, size_bytes: file.size });
      if (error) { await supabase.storage.from("request-files").remove([path]); toast.error(error.message); continue; }
      toast.success(`Sent ${file.name}`);
    }
    setUploading(null);
    if (input.current) input.current.value = "";
    qc.invalidateQueries({ queryKey: key });
  };

  const remove = async (f: FileRow) => {
    await supabase.storage.from("request-files").remove([f.path]);
    const { error } = await supabase.from("request_files").delete().eq("id", f.id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: key });
  };

  return (
    <div className={cn("rounded-xl border border-border p-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Shared files</p>
        <button type="button" onClick={() => input.current?.click()} disabled={!!uploading}
          className="flex min-h-[36px] items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-60">
          <Paperclip className="h-3.5 w-3.5" /> {uploading ? `Sending ${uploading.slice(0, 18)}…` : "Send file"}
        </button>
        <input ref={input} type="file" multiple accept={ACCEPT} className="hidden" onChange={(e) => upload(e.target.files)} aria-label="Choose files to send" />
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">Photos, videos, voice notes/audio or documents · up to 50 MB each</p>

      {files.isLoading && <p className="mt-3 text-xs text-muted-foreground">Loading…</p>}
      {files.data?.length === 0 && <p className="mt-3 text-xs text-muted-foreground">No files yet.</p>}
      <ul className="mt-3 space-y-3">
        {files.data?.map((f) => {
          const mine = f.sender_id === user?.id;
          const t = f.mime_type ?? "";
          return (
            <li key={f.id} className={cn("max-w-[92%] rounded-xl border border-border p-2", mine ? "ml-auto bg-primary/10" : "bg-background/40")}>
              {f.url && t.startsWith("image/") && <a href={f.url} target="_blank" rel="noreferrer"><img src={f.url} alt={f.name} className="max-h-56 w-full rounded-lg object-cover" /></a>}
              {f.url && t.startsWith("video/") && <video src={f.url} controls preload="metadata" className="max-h-64 w-full rounded-lg" />}
              {f.url && t.startsWith("audio/") && <audio src={f.url} controls preload="metadata" className="w-full" />}
              <div className="mt-1.5 flex items-center gap-2 text-xs">
                {t.startsWith("image/") ? <ImageIcon className="h-4 w-4 shrink-0" /> : t.startsWith("video/") ? <Film className="h-4 w-4 shrink-0" /> : t.startsWith("audio/") ? <Music className="h-4 w-4 shrink-0" /> : <FileText className="h-4 w-4 shrink-0" />}
                <span className="min-w-0 flex-1 truncate font-medium">{f.name}</span>
                <span className="shrink-0 text-muted-foreground">{kb(f.size_bytes)}</span>
                {f.url && <a href={f.url} target="_blank" rel="noreferrer" download={f.name} aria-label={`Download ${f.name}`} className="shrink-0 text-primary"><Download className="h-4 w-4" /></a>}
                {mine && <button onClick={() => remove(f)} aria-label={`Delete ${f.name}`} className="shrink-0 text-destructive"><Trash2 className="h-4 w-4" /></button>}
              </div>
              <p className="mt-0.5 text-[10px] text-muted-foreground">{mine ? "You" : "Them"} · {new Date(f.created_at).toLocaleString()}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Button that reveals the shared-files panel. */
export function RequestFilesToggle({ requestId }: { requestId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex min-h-[40px] items-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold">
        <Paperclip className="h-4 w-4" /> {open ? "Hide files" : "Files & media"}
      </button>
      {open && <RequestFiles requestId={requestId} className="mt-2" />}
    </div>
  );
}
