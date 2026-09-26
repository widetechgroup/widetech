import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { servicesQuery } from "@/lib/services";
import { RequestDialog } from "@/components/RequestDialog";
import { ConsultationDialog } from "@/components/ConsultationDialog";
import { cn } from "@/lib/utils";
import { QuotesProjects } from "@/components/QuotesProjects";

export const Route = createFileRoute("/_authenticated/requests")({
  head: () => ({
    meta: [
      { title: "My requests — WideTech Group" },
      {
        name: "description",
        content: "Track your WideTech service requests and consultation bookings.",
      },
      { property: "og:title", content: "My requests — WideTech Group" },
      { property: "og:description", content: "Track your WideTech service requests." },
    ],
  }),
  component: RequestsPage,
});

const statusTone: Record<string, string> = {
  pending: "text-warning",
  reviewing: "text-accent",
  quoted: "text-accent",
  in_progress: "text-primary",
  completed: "text-success",
  cancelled: "text-destructive",
};

function RequestsPage() {
  const { user } = useAuth();
  const [requestOpen, setRequestOpen] = useState(false);
  const [consultOpen, setConsultOpen] = useState(false);
  const { data: services = [] } = useQuery(servicesQuery);

  const requests = useQuery({
    queryKey: ["my-requests", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_requests")
        .select("id,tracking_code,title,description,urgency,status,created_at,estimated_budget")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const consultations = useQuery({
    queryKey: ["my-consultations", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consultations")
        .select("id,topic,preferred_date,preferred_time,status,meeting_link")
        .order("preferred_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 md:px-8 md:py-12">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-extrabold md:text-3xl">My requests</h1>
          <p className="text-sm text-muted-foreground">Live status of everything you've sent us.</p>
        </div>
        <button
          onClick={() => setRequestOpen(true)}
          className="min-h-[48px] shrink-0 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
        >
          New request
        </button>
      </header>

      <section className="mt-6 space-y-3">
        {requests.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {requests.data?.length === 0 && (
          <div className="glass rounded-2xl p-6 text-sm text-muted-foreground">
            No requests yet. Tap “New request” to get a quote.
          </div>
        )}
        {requests.data?.map((request) => (
          <article key={request.id} className="glass rounded-2xl p-5">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-base font-bold">{request.title}</h2>
                <p className="text-xs text-muted-foreground">{request.tracking_code}</p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full border border-border px-3 py-1 text-xs font-semibold capitalize",
                  statusTone[request.status] ?? "text-muted-foreground",
                )}
              >
                {request.status.replace("_", " ")}
              </span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{request.description}</p>
            <p className="mt-3 text-xs capitalize text-muted-foreground">
              Urgency: {request.urgency}
              {request.estimated_budget ? ` · Budget $${request.estimated_budget}` : ""}
            </p>
          </article>
        ))}
      </section>

      <header className="mt-10 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <h2 className="truncate text-xl font-extrabold">Consultations</h2>
        <button
          onClick={() => setConsultOpen(true)}
          className="glass-interactive min-h-[48px] shrink-0 rounded-xl px-5 text-sm font-semibold"
        >
          Book slot
        </button>
      </header>

      <section className="mt-4 space-y-3">
        {consultations.data?.length === 0 && (
          <div className="glass rounded-2xl p-6 text-sm text-muted-foreground">
            No consultations booked yet.
          </div>
        )}
        {consultations.data?.map((item) => (
          <article key={item.id} className="glass rounded-2xl p-5">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <h3 className="min-w-0 truncate text-base font-bold">{item.topic}</h3>
              <span className="shrink-0 rounded-full border border-border px-3 py-1 text-xs font-semibold capitalize text-accent">
                {item.status}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {item.preferred_date} at {item.preferred_time} EAT
            </p>
            {item.meeting_link && (
              <a
                href={item.meeting_link}
                className="mt-2 inline-block text-sm font-semibold text-primary"
              >
                Join meeting
              </a>
            )}
          </article>
        ))}
      </section>

      <QuotesProjects />

      <RequestDialog open={requestOpen} onOpenChange={setRequestOpen} services={services} />
      <ConsultationDialog open={consultOpen} onOpenChange={setConsultOpen} />
    </div>
  );
}
