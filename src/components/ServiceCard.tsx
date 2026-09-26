import { Link } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { tzs, usd, type Service } from "@/lib/services";
import { useCompany, usePreferredCurrency } from "@/lib/company";
import { ServiceImage } from "@/components/ServiceImage";

export function ServiceCard({
  service,
  onRequest,
}: {
  service: Service;
  onRequest?: (service: Service) => void;
}) {
  const { toTzs, toEur } = useCompany();
  const currency = usePreferredCurrency();
  const price = Number(service.starting_price);
  const available = service.is_available !== false;
  return (
    <article className="glass-interactive group flex flex-col overflow-hidden rounded-2xl">
      <Link to="/services/$slug" params={{ slug: service.slug }} className="relative block aspect-[16/10] overflow-hidden">
        <ServiceImage service={service} className="h-full w-full transition-transform duration-300 group-hover:scale-[1.03]" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {service.category && (
            <span className="rounded-full bg-background/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-foreground backdrop-blur">
              {service.category.name}
            </span>
          )}
          {service.is_featured && (
            <span className="flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
              <Star className="h-3 w-3" /> Featured
            </span>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <span className="font-semibold uppercase tracking-wider text-accent">{service.billing_type}</span>
          <span className={available ? "text-success" : "text-warning"}>{available ? "Available" : "Unavailable"}</span>
        </div>
        <h3 className="mt-1.5 text-base font-bold leading-tight">
          <Link to="/services/$slug" params={{ slug: service.slug }} className="hover:text-primary">{service.title}</Link>
        </h3>
        <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{service.short_description}</p>

        <div className="mt-auto pt-4">
          <p className="text-[11px] text-muted-foreground">Starting from</p>
          <p className="text-xl font-extrabold text-gradient-brand">{usd(price)}</p>
          <p className="text-[11px] text-muted-foreground">
            ≈ {tzs(toTzs(price))}
            {currency === "EUR" && toEur(price) != null && ` · EUR ${toEur(price)!.toLocaleString()}`}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link
              to="/services/$slug"
              params={{ slug: service.slug }}
              className="flex min-h-[44px] items-center justify-center rounded-xl border border-border text-sm font-semibold hover:bg-sidebar-accent"
            >
              View
            </Link>
            {onRequest ? (
              <button
                onClick={() => onRequest(service)}
                disabled={!available}
                className="min-h-[44px] rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                Request
              </button>
            ) : (
              <Link
                to="/services/$slug"
                params={{ slug: service.slug }}
                className="flex min-h-[44px] items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
              >
                Request
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
