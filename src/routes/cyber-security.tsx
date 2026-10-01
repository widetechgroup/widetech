import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ShieldCheck, Clock, MapPin, Check } from "lucide-react";
import { publicCyberQuery, priceLabel, DELIVERY, asList, type CyberService } from "@/lib/cyber";
import { CyberRequestDialog } from "@/components/CyberRequestDialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/cyber-security")({
  head: () => ({
    meta: [
      { title: "Cyber security services — WideTech Group" },
      { name: "description", content: "Assessments, penetration testing, incident response and security training for businesses in Tanzania." },
      { property: "og:title", content: "Cyber security services — WideTech Group" },
      { property: "og:description", content: "Protect your business with WideTech cyber security services and packages." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(publicCyberQuery),
  errorComponent: ({ error }) => <p className="p-8 text-sm text-destructive">{error instanceof Error ? error.message : "Could not load services"}</p>,
  notFoundComponent: () => <p className="p-8 text-sm">Not found</p>,
  component: CyberPage,
});

function CyberPage() {
  const { data } = useSuspenseQuery(publicCyberQuery);
  const [cat, setCat] = useState<string>("all");
  const [req, setReq] = useState<string | null>(null);
  const catName = (id: string | null) => data.categories.find((c) => c.id === id)?.name ?? "";
  const usedCats = data.categories.filter((c) => data.services.some((s) => s.category_id === c.id));
  const list = cat === "all" ? data.services : data.services.filter((s) => s.category_id === cat);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-extrabold md:text-3xl">Cyber security services</h1>
      </div>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Find weaknesses before attackers do, respond fast when something goes wrong, and train your team to stay safe.</p>

      {usedCats.length > 0 && (
        <div className="mt-6 flex gap-2 overflow-x-auto">
          {[{ id: "all", name: "All" }, ...usedCats].map((c) => (
            <button key={c.id} onClick={() => setCat(c.id)} className={cn("min-h-[40px] shrink-0 rounded-full border border-border px-4 text-sm font-semibold", cat === c.id ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>{c.name}</button>
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {list.length === 0 && <div className="glass col-span-full rounded-2xl p-6 text-sm text-muted-foreground">Cyber security services are being prepared. Ask for one of the packages below, or contact us for a custom quote.</div>}
        {list.map((s) => <ServiceTile key={s.id} s={s} category={catName(s.category_id)} onRequest={() => setReq(s.name)} />)}
      </div>

      {data.packages.length > 0 && (
        <>
          <h2 className="mt-12 text-xl font-bold">Packages</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {data.packages.map((p) => (
              <div key={p.id} className={cn("glass flex flex-col rounded-2xl p-5", p.is_featured && "ring-2 ring-primary")}>
                <h3 className="text-lg font-bold">{p.name}</h3>
                {p.description && <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>}
                <p className="mt-2 font-semibold text-primary">{priceLabel(p.pricing_model, p.price, p.currency)}</p>
                <ul className="mt-3 flex-1 space-y-1 text-sm">
                  {asList(p.includes).map((i) => <li key={i} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{i}</li>)}
                </ul>
                <Button className="mt-4" onClick={() => setReq(p.name)}>Request this package</Button>
              </div>
            ))}
          </div>
        </>
      )}
      <CyberRequestDialog open={!!req} onOpenChange={(o) => !o && setReq(null)} itemName={req ?? ""} />
    </div>
  );
}

function ServiceTile({ s, category, onRequest }: { s: CyberService; category: string; onRequest: () => void }) {
  return (
    <div className="glass flex flex-col overflow-hidden rounded-2xl">
      {s.image_url ? <img src={s.image_url} alt={s.name} className="aspect-video w-full object-cover" loading="lazy" /> : (
        <div className="flex aspect-video items-center justify-center bg-primary/10"><ShieldCheck className="h-12 w-12 text-primary" /></div>
      )}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{category}</span>{s.is_featured && <span className="rounded-full bg-primary/20 px-2 text-primary">Featured</span>}
        </div>
        <h3 className="mt-1 font-bold">{s.name}</h3>
        <p className="mt-1 flex-1 text-sm text-muted-foreground">{s.short_description}</p>
        <div className="mt-3 space-y-1 text-xs text-muted-foreground">
          {s.show_price && <p className="text-sm font-semibold text-primary">{priceLabel(s.pricing_model, s.price, s.currency)}</p>}
          {s.estimated_duration && <p className="flex items-center gap-1"><Clock className="h-3 w-3" />{s.estimated_duration}</p>}
          <p className="flex items-center gap-1"><MapPin className="h-3 w-3" />{DELIVERY[s.delivery_method as keyof typeof DELIVERY]}</p>
        </div>
        <Button className="mt-4" onClick={onRequest}>Request this service</Button>
      </div>
    </div>
  );
}
