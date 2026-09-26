import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/lib/company";
import { cn } from "@/lib/utils";

const RANGES = [
  { id: 7, label: "7 days" },
  { id: 30, label: "30 days" },
  { id: 90, label: "90 days" },
  { id: 0, label: "All time" },
] as const;

const STATUSES = ["pending", "reviewing", "quoted", "in_progress", "completed", "cancelled"] as const;

export function Overview() {
  const [days, setDays] = useState<number>(30);
  const company = useCompany();
  const since = days ? new Date(Date.now() - days * 86400000).toISOString() : "1970-01-01T00:00:00Z";

  const { data, isLoading } = useQuery({
    queryKey: ["overview", days],
    queryFn: async () => {
      const [req, quotes, projects, tickets, consults, logs] = await Promise.all([
        supabase.from("service_requests").select("status, created_at").gte("created_at", since),
        supabase.from("quotations").select("status, amount_usd").gte("created_at", since),
        supabase.from("projects").select("status").gte("created_at", since),
        supabase.from("support_tickets").select("status").gte("created_at", since),
        supabase.from("consultations").select("status").gte("created_at", since),
        supabase.from("audit_logs").select("id, action, table_name, created_at").order("created_at", { ascending: false }).limit(8),
      ]);
      return {
        requests: req.data ?? [],
        quotes: quotes.data ?? [],
        projects: projects.data ?? [],
        tickets: tickets.data ?? [],
        consults: consults.data ?? [],
        logs: logs.data ?? [],
      };
    },
  });

  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Loading figures…</p>;

  const accepted = data.quotes.filter((q) => q.status === "accepted");
  const revenue = accepted.reduce((s, q) => s + Number(q.amount_usd), 0);
  const byStatus = STATUSES.map((s) => ({ s, n: data.requests.filter((r) => r.status === s).length }));
  const maxStatus = Math.max(1, ...byStatus.map((b) => b.n));

  // Requests per day (last 14 buckets of the range)
  const bucketDays = Math.min(days || 30, 30);
  const buckets = Array.from({ length: bucketDays }, (_, i) => {
    const d = new Date(Date.now() - (bucketDays - 1 - i) * 86400000).toISOString().slice(0, 10);
    return { d, n: data.requests.filter((r) => r.created_at?.slice(0, 10) === d).length };
  });
  const maxBucket = Math.max(1, ...buckets.map((b) => b.n));

  const kpis = [
    { label: "Service requests", value: data.requests.length },
    { label: "Open requests", value: data.requests.filter((r) => !["completed", "cancelled"].includes(r.status)).length },
    { label: "Quotes sent", value: data.quotes.length },
    { label: "Accepted value", value: `$${revenue.toLocaleString()}`, sub: company.toTzs(revenue) != null ? `TZS ${company.toTzs(revenue)!.toLocaleString()}` : undefined },
    { label: "Active projects", value: data.projects.filter((p) => p.status === "active").length },
    { label: "Open support chats", value: data.tickets.filter((t) => t.status === "open").length },
    { label: "Consultations", value: data.consults.length },
    { label: "Quote acceptance", value: data.quotes.length ? `${Math.round((accepted.length / data.quotes.length) * 100)}%` : "—" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex gap-2 overflow-x-auto">
        {RANGES.map((r) => (
          <button
            key={r.id}
            onClick={() => setDays(r.id)}
            className={cn(
              "min-h-[36px] shrink-0 rounded-full border border-border px-3 text-xs font-semibold",
              days === r.id ? "bg-accent text-accent-foreground" : "text-muted-foreground",
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="glass rounded-2xl p-4">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className="mt-1 text-2xl font-extrabold">{k.value}</p>
            {k.sub && <p className="text-xs text-muted-foreground">{k.sub}</p>}
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-bold">Requests per day</h3>
          <div className="mt-4 flex h-32 items-end gap-1">
            {buckets.map((b) => (
              <div key={b.d} title={`${b.d}: ${b.n}`} className="flex-1 rounded-t bg-primary/80" style={{ height: `${Math.max(2, (b.n / maxBucket) * 100)}%` }} />
            ))}
          </div>
        </div>
        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-bold">Requests by status</h3>
          <div className="mt-4 space-y-2">
            {byStatus.map((b) => (
              <div key={b.s} className="flex items-center gap-2 text-xs">
                <span className="w-24 capitalize text-muted-foreground">{b.s.replace("_", " ")}</span>
                <div className="h-2 flex-1 rounded bg-muted">
                  <div className="h-2 rounded bg-accent" style={{ width: `${(b.n / maxStatus) * 100}%` }} />
                </div>
                <span className="w-6 text-right font-semibold">{b.n}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <h3 className="text-sm font-bold">Recent activity</h3>
        {data.logs.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">No activity yet.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-xs">
            {data.logs.map((l) => (
              <li key={l.id} className="flex justify-between gap-3">
                <span>
                  <span className="font-semibold capitalize">{l.action.toLowerCase()}</span>{" "}
                  <span className="text-muted-foreground">{l.table_name.replace("_", " ")}</span>
                </span>
                <span className="text-muted-foreground">{new Date(l.created_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
