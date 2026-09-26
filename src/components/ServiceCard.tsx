import { Check } from "lucide-react";
import { featureList, tzs, usd, type Service } from "@/lib/services";

export function ServiceCard({
  service,
  onRequest,
}: {
  service: Service;
  onRequest?: (service: Service) => void;
}) {
  return (
    <article className="glass-interactive flex flex-col rounded-2xl p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">
        {service.billing_type}
      </p>
      <h3 className="mt-2 text-lg font-bold leading-tight">{service.title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{service.short_description}</p>

      <ul className="mt-4 space-y-1.5">
        {featureList(service.features).map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
            {feature}
          </li>
        ))}
      </ul>

      <div className="mt-5 border-t border-border pt-4">
        <p className="text-xs text-muted-foreground">Starting from</p>
        <p className="text-2xl font-extrabold text-gradient-brand">
          {usd(Number(service.starting_price))}
        </p>
        <p className="text-xs text-muted-foreground">≈ {tzs(Number(service.price_tzs))}</p>
      </div>

      {onRequest && (
        <button
          onClick={() => onRequest(service)}
          className="mt-4 min-h-[48px] rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Request this service
        </button>
      )}
    </article>
  );
}
