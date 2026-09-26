import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usd, tzs } from "@/lib/services";
import { useCompany } from "@/lib/company";

export function QuotesProjects() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toTzs } = useCompany();

  const quotes = useQuery({
    queryKey: ["my-quotes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotations")
        .select("id,amount_usd,notes,status,created_at,service_requests(title,tracking_code)")
        .eq("customer_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const projects = useQuery({
    queryKey: ["my-projects", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id,title,status,progress")
        .eq("customer_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const respond = async (id: string, status: "accepted" | "declined") => {
    const { error } = await supabase.from("quotations").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(status === "accepted" ? "Quote accepted — your project has started" : "Quote declined");
    qc.invalidateQueries();
  };

  return (
    <>
      <h2 className="mt-10 text-xl font-extrabold">Quotations</h2>
      <section className="mt-4 space-y-3">
        {quotes.data?.length === 0 && (
          <div className="glass rounded-2xl p-6 text-sm text-muted-foreground">No quotes yet.</div>
        )}
        {quotes.data?.map((q) => {
          const req = q.service_requests as { title: string; tracking_code: string } | null;
          return (
            <article key={q.id} className="glass rounded-2xl p-5">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-bold">{req?.title ?? "Quote"}</h3>
                  <p className="text-xs text-muted-foreground">{req?.tracking_code}</p>
                </div>
                <span className="shrink-0 rounded-full border border-border px-3 py-1 text-xs font-semibold capitalize text-accent">
                  {q.status}
                </span>
              </div>
              <p className="mt-3 text-lg font-extrabold text-primary">
                {usd(Number(q.amount_usd))}{" "}
                <span className="text-sm font-medium text-muted-foreground">≈ {tzs(toTzs(Number(q.amount_usd)))}</span>
              </p>
              {q.notes && <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{q.notes}</p>}
              {q.status === "sent" && (
                <div className="mt-4 flex gap-2">
                  <button onClick={() => respond(q.id, "accepted")} className="min-h-[44px] rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground">
                    Accept
                  </button>
                  <button onClick={() => respond(q.id, "declined")} className="glass-interactive min-h-[44px] rounded-xl px-5 text-sm font-semibold">
                    Decline
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </section>

      <h2 className="mt-10 text-xl font-extrabold">Projects</h2>
      <section className="mt-4 space-y-3">
        {projects.data?.length === 0 && (
          <div className="glass rounded-2xl p-6 text-sm text-muted-foreground">Accepted quotes become projects here.</div>
        )}
        {projects.data?.map((p) => (
          <article key={p.id} className="glass rounded-2xl p-5">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
              <h3 className="truncate font-bold">{p.title}</h3>
              <span className="text-xs capitalize text-muted-foreground">{p.status.replace("_", " ")}</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary" style={{ width: `${p.progress}%` }} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{p.progress}% complete</p>
          </article>
        ))}
      </section>
    </>
  );
}
