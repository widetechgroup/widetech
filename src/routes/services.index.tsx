import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { servicesQuery, type Service } from "@/lib/services";
import { RequestDialog } from "@/components/RequestDialog";
import { ConsultationDialog } from "@/components/ConsultationDialog";
import { ServiceCard } from "@/components/ServiceCard";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/services/")({
  head: () => ({
    meta: [
      { title: "Services & Pricing — WideTech Group" },
      {
        name: "description",
        content:
          "Software systems, cyber solutions, web development, computer maintenance, digital marketing, CCTV, consultation and data backup — with USD and TZS pricing.",
      },
      { property: "og:title", content: "Services & Pricing — WideTech Group" },
      { property: "og:description", content: "Technology services for Tanzanian businesses, priced in USD and TZS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Services,
});

function Services() {
  const { data: services = [], isLoading, error } = useQuery(servicesQuery);
  const [requestOpen, setRequestOpen] = useState(false);
  const [consultOpen, setConsultOpen] = useState(false);
  const [selected, setSelected] = useState<Service | undefined>();
  const [category, setCategory] = useState<string>("all");

  const categories = [...new Map(services.filter((s) => s.category).map((s) => [s.category!.slug, s.category!.name])).entries()];
  const visible = (category === "all" ? services : services.filter((s) => s.category?.slug === category))
    .slice()
    .sort((a, b) => Number(!!b.is_featured) - Number(!!a.is_featured));

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8 md:py-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold md:text-4xl">Services & pricing</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Every engagement starts with a free scoping call. Prices are starting points — final quotes follow a site survey or requirements session.
          </p>
        </div>
        <button onClick={() => setConsultOpen(true)} className="min-h-[48px] shrink-0 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground">
          Book a consultation
        </button>
      </header>

      {categories.length > 1 && (
        <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
          {[["all", "All services"] as [string, string], ...categories].map(([slug, name]) => (
            <button
              key={slug}
              onClick={() => setCategory(slug)}
              className={cn(
                "min-h-[36px] shrink-0 rounded-full border border-border px-4 text-xs font-semibold",
                category === slug ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {error && <p className="mt-8 text-sm text-destructive">Couldn't load services. Please refresh the page.</p>}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading && Array.from({ length: 8 }).map((_, i) => <div key={i} className="glass h-96 animate-pulse rounded-2xl" />)}
        {visible.map((service) => (
          <ServiceCard key={service.id} service={service} onRequest={(s) => { setSelected(s); setRequestOpen(true); }} />
        ))}
      </div>
      {!isLoading && !error && visible.length === 0 && <p className="mt-8 text-center text-sm text-muted-foreground">No services in this category yet.</p>}

      <RequestDialog open={requestOpen} onOpenChange={setRequestOpen} services={services} defaultServiceId={selected?.id} />
      <ConsultationDialog open={consultOpen} onOpenChange={setConsultOpen} />
    </div>
  );
}
