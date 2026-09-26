import { useEffect, useState } from "react";
import logo from "@/assets/widetech-logo.png.asset.json";
import { useCompany } from "@/lib/company";

/** Animated logo shown once each time the app is opened (per browser session). */
export function SplashScreen() {
  const { logoUrl, name } = useCompany();
  const [phase, setPhase] = useState<"hidden" | "show" | "leave">("hidden");

  useEffect(() => {
    if (sessionStorage.getItem("wt-splash")) return;
    sessionStorage.setItem("wt-splash", "1");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setPhase("show");
    const t1 = setTimeout(() => setPhase("leave"), reduce ? 600 : 1900);
    const t2 = setTimeout(() => setPhase("hidden"), reduce ? 900 : 2400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (phase === "hidden") return null;
  return (
    <div
      role="status"
      aria-label={`Loading ${name || "WideTech Group"}`}
      className={`splash fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background transition-opacity duration-500 ${phase === "leave" ? "opacity-0" : "opacity-100"}`}
    >
      <div className="relative flex items-center justify-center">
        <span className="splash-ring absolute h-44 w-44 rounded-full border-2 border-primary/60" />
        <span className="splash-ring splash-ring-2 absolute h-44 w-44 rounded-full border border-accent/50" />
        <img src={logoUrl || logo.url} alt="" className="splash-logo relative h-24 w-auto max-w-[220px] object-contain" />
      </div>
      <p className="splash-text mt-8 text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">Kwetu Wide Tech Tu.</p>
      <div className="mt-4 h-1 w-32 overflow-hidden rounded-full bg-border">
        <div className="splash-bar h-full rounded-full bg-primary" />
      </div>
    </div>
  );
}
