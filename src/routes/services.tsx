import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { featureList, servicesQuery, tzs, usd, type Service } from "@/lib/services";
import { RequestDialog } from "@/components/RequestDialog";
import { ConsultationDialog } from "@/components/ConsultationDialog";
import { Check } from "lucide-react";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Services & Pricing — WideTech Group" },
      {
        name: "description",
        content:
          "Software systems, cyber solutions, web development, computer maintenance, digital marketing, CCTV, consultation and data backup — with USD and TZS pricing.",
      },
      { property: "og:title", content: "Services & Pricing — WideTech Group" },
      {
        property: "og:description",
        content: "Eight technology services for Tanzanian businesses, priced in USD and TZS.",
      },
    ],
  }),
  component: Services,
});

function Services() {
  const { data: services = [], isLoading } = useQuery(servicesQuery);
  const [requestOpen, setRequestOpen] = useState(false);
  const [consultOpen, setConsultOpen] = useState(false);
  const [selected, setSelected] = useState<Service | undefined>();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8 md:py-12">
      <header className="glass rounded-2xl p-6">
        <h1 className="text-3xl font-extrabold md:text-4xl">Services & pricing</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Every engagement starts with a free scoping call. Prices below are starting points —
          final quotes follow a site survey or requirements session.
        </p>
        <button
          onClick={() => setConsultOpen(true)}
          className="mt-5 min-h-[48px] rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground"
        >
          Book a consultation
        </button>
      </header>

      {isLoading && <p className="mt-8 text-sm text-muted-foreground">Loading services…</p>}

      <div className="mt-6 space-y-4">
        {services.map((service) => (
          <article key={service.id} className="glass-interactive rounded-2xl p-5 md:p-6">
            <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_220px]">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">
                  {service.billing_type}
                </p>
                <h2 className="mt-1 text-xl font-bold">{service.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{service.full_description}</p>
                <ul className="mt-4 grid gap-1.5 sm:grid-cols-2">
                  {featureList(service.features).map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-border p-4">
                <p className="text-xs text-muted-foreground">Starting from</p>
                <p className="text-2xl font-extrabold text-gradient-brand">
                  {usd(Number(service.starting_price))}
                </p>
                <p className="text-xs text-muted-foreground">≈ {tzs(Number(service.price_tzs))}</p>
                <button
                  onClick={() => {
                    setSelected(service);
                    setRequestOpen(true);
                  }}
                  className="mt-4 min-h-[48px] w-full rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
                >
                  Request
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <RequestDialog
        open={requestOpen}
        onOpenChange={setRequestOpen}
        services={services}
        defaultServiceId={selected?.id}
      />
      <ConsultationDialog open={consultOpen} onOpenChange={setConsultOpen} />
    </div>
  );
}
