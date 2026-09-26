import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { featureList, galleryList, serviceBySlugQuery, servicesQuery, tzs, usd } from "@/lib/services";
import { useCompany, usePreferredCurrency } from "@/lib/company";
import { ServiceImage } from "@/components/ServiceImage";
import { ServiceCard } from "@/components/ServiceCard";
import { RequestDialog } from "@/components/RequestDialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/services/$slug")({
  loader: async ({ context, params }) => {
    const service = await context.queryClient.ensureQueryData(serviceBySlugQuery(params.slug));
    if (!service) throw notFound();
    return { title: service.title, description: service.short_description, image: service.image_url ?? null };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Service not found — WideTech Group" }, { name: "robots", content: "noindex" }] };
    const title = `${loaderData.title} — WideTech Group`;
    return {
      meta: [
        { title },
        { name: "description", content: loaderData.description },
        { property: "og:title", content: title },
        { property: "og:description", content: loaderData.description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        ...(loaderData.image?.startsWith("https://")
          ? [{ property: "og:image", content: loaderData.image }, { name: "twitter:image", content: loaderData.image }]
          : []),
      ],
    };
  },
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-xl p-8 text-sm text-destructive">Couldn't load this service: {error.message}</div>
  ),
  notFoundComponent: ServiceNotFound,
  component: ServiceDetail,
});

function ServiceNotFound() {
  return (
    <div className="mx-auto max-w-xl p-8 text-center">
      <h1 className="text-xl font-bold">Service not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">It may have been renamed or removed.</p>
      <Link to="/services" className="mt-4 inline-block text-sm font-semibold text-primary">Browse all services</Link>
    </div>
  );
}

function ServiceDetail() {
  const { slug } = Route.useParams();
  const { data: service } = useSuspenseQuery(serviceBySlugQuery(slug));
  const { data: all = [] } = useQuery(servicesQuery);
  const { toTzs, toEur } = useCompany();
  const currency = usePreferredCurrency();
  const [open, setOpen] = useState(false);
  const images = service ? [service.image_url, ...galleryList(service.gallery)].filter(Boolean) as string[] : [];
  const [active, setActive] = useState(0);
  if (!service) return <ServiceNotFound />;

  const price = Number(service.starting_price);
  const available = service.is_available !== false;
  const features = featureList(service.features);
  const related = all.filter((s) => s.id !== service.id && s.category?.slug === service.category?.slug).slice(0, 4);
  const relatedList = related.length ? related : all.filter((s) => s.id !== service.id).slice(0, 4);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-10">
      <Link to="/services" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> All services
      </Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div>
          <div className="glass aspect-[16/10] overflow-hidden rounded-2xl">
            {images.length ? (
              <img src={images[active] ?? images[0]} alt={service.title} className="h-full w-full object-cover" />
            ) : (
              <ServiceImage service={service} className="h-full w-full" />
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {images.map((src, i) => (
                <button key={src} onClick={() => setActive(i)} aria-label={`Show image ${i + 1}`} className={cn("h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2", i === active ? "border-primary" : "border-transparent opacity-70")}>
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <aside className="glass h-fit rounded-2xl p-5 lg:sticky lg:top-20">
          <div className="flex flex-wrap gap-1.5 text-[10px] font-semibold uppercase tracking-wider">
            {service.category && <span className="rounded-full border border-border px-2.5 py-1">{service.category.name}</span>}
            {service.is_featured && <span className="rounded-full bg-primary px-2.5 py-1 text-primary-foreground">Featured</span>}
            <span className={cn("rounded-full px-2.5 py-1", available ? "bg-success/15 text-success" : "bg-warning/15 text-warning")}>{available ? "Available" : "Unavailable"}</span>
          </div>
          <h1 className="mt-3 text-2xl font-extrabold md:text-3xl">{service.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{service.short_description}</p>
          <div className="mt-5 border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">Starting from</p>
            <p className="text-3xl font-extrabold text-gradient-brand">{usd(price)}</p>
            <p className="text-xs text-muted-foreground">
              ≈ {tzs(toTzs(price))}{currency === "EUR" && toEur(price) != null && ` · EUR ${toEur(price)!.toLocaleString()}`}
            </p>
            <p className="mt-1 text-xs"><span className="text-muted-foreground">Pricing model:</span> <span className="font-semibold">{service.billing_type}</span></p>
          </div>
          <button
            onClick={() => setOpen(true)}
            disabled={!available}
            className="mt-5 min-h-[52px] w-full rounded-xl bg-primary text-sm font-bold uppercase tracking-wide text-primary-foreground disabled:opacity-50"
          >
            Request this service
          </button>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">Free scoping call · final quote after review</p>
        </aside>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Section title="Overview"><p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{service.full_description}</p></Section>
          {features.length > 0 && (
            <Section title="What's included">
              <ul className="grid gap-2 sm:grid-cols-2">
                {features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />{f}</li>
                ))}
              </ul>
            </Section>
          )}
        </div>
        <div className="space-y-4">
          {service.requirements && <Section title="Requirements"><p className="whitespace-pre-line text-sm text-muted-foreground">{service.requirements}</p></Section>}
          {service.terms && <Section title="Terms"><p className="whitespace-pre-line text-sm text-muted-foreground">{service.terms}</p></Section>}
        </div>
      </div>

      {relatedList.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-bold">Related services</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {relatedList.map((s) => <ServiceCard key={s.id} service={s} />)}
          </div>
        </section>
      )}

      <RequestDialog open={open} onOpenChange={setOpen} services={all} defaultServiceId={service.id} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass rounded-2xl p-5">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}
