import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ShieldCheck, Zap, HeartHandshake, MapPin, ArrowRight } from "lucide-react";
import { servicesQuery, type Service } from "@/lib/services";
import { ServiceCard } from "@/components/ServiceCard";
import { RequestDialog } from "@/components/RequestDialog";
import { ConsultationDialog } from "@/components/ConsultationDialog";
import { useCompany } from "@/lib/company";
import { Phone, Mail, MessageCircle } from "lucide-react";
import logo from "@/assets/widetech-logo.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "WideTech Group — KWETU WIDE TECH TU." },
      {
        name: "description",
        content:
          "Technology partner for Tanzania and East Africa: software systems, cyber security, web, CCTV, maintenance and IT advisory with USD and TZS pricing.",
      },
      { property: "og:title", content: "WideTech Group — KWETU WIDE TECH TU." },
      {
        property: "og:description",
        content:
          "Software systems, cyber security, web, CCTV and IT support built for Tanzanian businesses.",
      },
    ],
  }),
  component: Home,
});

const pillars = [
  {
    icon: Zap,
    title: "Our Vision",
    body: "A Tanzania where every business runs on systems it can trust, own and grow with.",
  },
  {
    icon: ShieldCheck,
    title: "Our Mission",
    body: "Deliver secure, affordable and locally supported technology across East Africa.",
  },
  {
    icon: HeartHandshake,
    title: "Our Values",
    body: "Honest pricing in TZS and USD, fast response, and engineering we stand behind.",
  },
];

function Home() {
  const { data: services = [] } = useQuery(servicesQuery);
  const company = useCompany();
  const [requestOpen, setRequestOpen] = useState(false);
  const [consultOpen, setConsultOpen] = useState(false);
  const [selected, setSelected] = useState<Service | undefined>();

  const openRequest = (service?: Service) => {
    setSelected(service);
    setRequestOpen(true);
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <section className="glass overflow-hidden rounded-3xl p-6 md:p-12">
        <img src={logo.url} alt={company.name || "Logo"} className="h-16 w-auto md:h-24" />
        <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 text-accent" /> {company.address}
        </p>
        <h1 className="mt-4 text-4xl font-extrabold leading-tight md:text-6xl">
          <span className="text-gradient-brand">{company.tagline}</span>
        </h1>
        <p className="mt-4 max-w-2xl text-base text-muted-foreground md:text-lg">
          {company.name} builds, secures and maintains the technology Tanzanian businesses run on —
          from custom management systems and websites to CCTV, cyber security and daily IT support.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={() => openRequest()}
            className="min-h-[48px] rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Request a service
          </button>
          <button
            onClick={() => setConsultOpen(true)}
            className="glass-interactive min-h-[48px] rounded-xl px-6 text-sm font-semibold"
          >
            Book a consultation
          </button>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {pillars.map((pillar) => (
          <div key={pillar.title} className="glass rounded-2xl p-5">
            <pillar.icon className="h-5 w-5 text-primary" />
            <h2 className="mt-3 text-base font-bold">{pillar.title}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">{pillar.body}</p>
          </div>
        ))}
      </section>

      <section className="mt-10">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
          <div className="min-w-0">
            <h2 className="text-2xl font-extrabold md:text-3xl">Our services</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Transparent starting prices in USD and TZS.
            </p>
          </div>
          <Link
            to="/services"
            className="flex shrink-0 items-center gap-1 text-sm font-semibold text-primary"
          >
            All details <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} onRequest={openRequest} />
          ))}
        </div>
      </section>

      {(company.phone || company.email || company.whatsapp) && (
        <section className="glass mt-10 grid gap-3 rounded-2xl p-5 sm:grid-cols-3">
          {company.phone && <a href={`tel:${company.phone}`} className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-primary" />{company.phone}</a>}
          {company.whatsapp && <a href={`https://wa.me/${company.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm"><MessageCircle className="h-4 w-4 text-primary" />WhatsApp {company.whatsapp}</a>}
          {company.email && <a href={`mailto:${company.email}`} className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-primary" />{company.email}</a>}
        </section>
      )}

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
