import { Camera, Code2, Globe, HardDrive, LineChart, MessagesSquare, ShieldCheck, Wrench, Layers, type LucideIcon } from "lucide-react";
import type { Service } from "@/lib/services";
import { cn } from "@/lib/utils";

const ICONS: [RegExp, LucideIcon][] = [
  [/cctv|camera|surveil/i, Camera],
  [/cyber|secur/i, ShieldCheck],
  [/web|site/i, Globe],
  [/software|system|app/i, Code2],
  [/market/i, LineChart],
  [/consult|advis/i, MessagesSquare],
  [/backup|data|storage/i, HardDrive],
  [/maint|repair|computer/i, Wrench],
];

/** Service photo from the backend; when none is set yet, shows a branded placeholder with a matching icon. */
export function ServiceImage({ service, className }: { service: Pick<Service, "title" | "image_url">; className?: string }) {
  if (service.image_url) {
    return <img src={service.image_url} alt={service.title} loading="lazy" className={cn("object-cover", className)} />;
  }
  const Icon = ICONS.find(([re]) => re.test(service.title))?.[1] ?? Layers;
  return (
    <div className={cn("relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary/25 via-card to-accent/20", className)} role="img" aria-label={service.title}>
      <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(var(--border)_1px,transparent_1px)] [background-size:14px_14px]" />
      <Icon className="relative h-12 w-12 text-primary" strokeWidth={1.5} />
    </div>
  );
}
