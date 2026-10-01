import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type CyberCategory = Tables<"cyber_service_categories">;
export type CyberService = Tables<"cyber_services">;
export type CyberPackage = Tables<"cyber_service_packages">;

export const PRICING_MODELS = {
  fixed: "Fixed price",
  starting_from: "Starting from",
  hourly: "Per hour",
  daily: "Per day",
  monthly: "Per month",
  custom_quote: "Custom quote",
} as const;
export const DELIVERY = { remote: "Remote", onsite: "On-site", hybrid: "Hybrid" } as const;
export const SERVICE_STATUS = { active: "Active", inactive: "Inactive", draft: "Draft" } as const;
export const CYBER_CURRENCIES = ["USD", "TZS", "EUR", "GBP"] as const;

export const slugify = (s: string) =>
  s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const asList = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

export function priceLabel(model: string, price: number | null, currency: string) {
  if (model === "custom_quote" || price == null) return "Custom quote";
  const amount = `${currency} ${Number(price).toLocaleString()}`;
  const suffix: Record<string, string> = { hourly: " / hour", daily: " / day", monthly: " / month" };
  return (model === "starting_from" ? "From " : "") + amount + (suffix[model] ?? "");
}

/** Public catalogue — RLS only returns active, public services and active categories/packages to visitors. */
export const publicCyberQuery = queryOptions({
  queryKey: ["cyber-public"],
  queryFn: async () => {
    const [c, s, p] = await Promise.all([
      supabase.from("cyber_service_categories").select("*").eq("is_active", true).order("display_order"),
      supabase.from("cyber_services").select("*").eq("status", "active").eq("is_public", true).order("display_order"),
      supabase.from("cyber_service_packages").select("*").eq("is_active", true).order("display_order"),
    ]);
    if (c.error) throw c.error;
    if (s.error) throw s.error;
    if (p.error) throw p.error;
    return { categories: c.data ?? [], services: s.data ?? [], packages: p.data ?? [] };
  },
});
