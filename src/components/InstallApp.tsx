import { useEffect, useState } from "react";
import { Download, Share, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

let deferred: PromptEvent | null = null;
const listeners = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as PromptEvent;
    listeners.forEach((l) => l());
  });
}

/** Registers the service worker on the real site only (not inside the editor preview frame). */
export function useRegisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const inFrame = window.self !== window.top;
    const isPreview = location.hostname.includes("id-preview--") || location.hostname === "localhost";
    if (inFrame || isPreview) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
}

/** Install button: uses the browser's install prompt on Android/Chrome/Edge, and shows steps on iPhone/iPad/Safari. */
export function InstallApp({ className, compact }: { className?: string; compact?: boolean }) {
  const [, force] = useState(0);
  const [installed, setInstalled] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    setInstalled(window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true);
    setIos(/iphone|ipad|ipod|macintosh/i.test(navigator.userAgent) && "ontouchend" in document || /iphone|ipad|ipod/i.test(navigator.userAgent));
    const done = () => setInstalled(true);
    window.addEventListener("appinstalled", done);
    return () => { listeners.delete(l); window.removeEventListener("appinstalled", done); };
  }, []);

  if (installed) {
    return compact ? null : (
      <p className={cn("flex items-center gap-2 text-sm text-success", className)}><Check className="h-4 w-4" /> The app is installed on this device.</p>
    );
  }

  const click = async () => {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      deferred = null;
      force((n) => n + 1);
    } else {
      setShowSteps((s) => !s);
    }
  };

  return (
    <div className={className}>
      <button onClick={click} className={cn("flex items-center gap-2 font-semibold text-primary", compact ? "rounded-lg px-3 py-2 text-xs" : "min-h-[44px] rounded-xl border border-border px-4 text-sm")}>
        <Download className="h-4 w-4" /> Install app
      </button>
      {showSteps && (
        <div className="mt-2 rounded-xl border border-border p-3 text-xs text-muted-foreground">
          {ios ? (
            <p>On iPhone or iPad: open this site in Safari, tap <Share className="inline h-3.5 w-3.5" /> <b>Share</b>, then <b>Add to Home Screen</b>.</p>
          ) : (
            <p>Open the browser menu (⋮ or ⋯) and choose <b>Install app</b> or <b>Add to Home screen</b>. On a computer, use Chrome or Edge and click the install icon in the address bar.</p>
          )}
          <p className="mt-1">Installing works on the published website, not inside the editor preview.</p>
        </div>
      )}
    </div>
  );
}
