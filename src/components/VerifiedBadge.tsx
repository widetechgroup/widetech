import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/** Blue tick shown next to accounts the super admin has verified. */
export function VerifiedBadge({ verified, className }: { verified?: boolean | null; className?: string }) {
  if (!verified) return null;
  return (
    <BadgeCheck
      aria-label="Verified account"
      className={cn("inline h-4 w-4 shrink-0 fill-verified text-background", className)}
    >
      <title>Verified account</title>
    </BadgeCheck>
  );
}
