import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Service = {
  id: string;
  title: string;
  slug: string;
  short_description: string;
  full_description: string;
  starting_price: number;
  price_tzs: number | null;
  billing_type: string;
  features: unknown;
  display_order: number | null;
  image_url?: string | null;
  is_featured?: boolean;
  is_available?: boolean;
  gallery?: unknown;
  requirements?: string | null;
  terms?: string | null;
  category?: { name: string; slug: string } | null;
};

const SERVICE_COLUMNS =
  "id,title,slug,short_description,full_description,starting_price,price_tzs,billing_type,features,display_order,image_url,is_featured,is_available,gallery,requirements,terms,category:service_categories(name,slug)";

export const serviceBySlugQuery = (slug: string) =>
  queryOptions({
    queryKey: ["service", slug],
    queryFn: async (): Promise<Service | null> => {
      const { data, error } = await supabase.from("services").select(SERVICE_COLUMNS).eq("slug", slug).eq("is_active", true).maybeSingle();
      if (error) throw error;
      return data as Service | null;
    },
  });

export function galleryList(gallery: unknown): string[] {
  return Array.isArray(gallery) ? (gallery as string[]).filter((u) => typeof u === "string" && u) : [];
}

export const servicesQuery = queryOptions({
  queryKey: ["services"],
  queryFn: async (): Promise<Service[]> => {
    const { data, error } = await supabase
      .from("services")
      .select(SERVICE_COLUMNS)
      .eq("is_active", true)
      .order("display_order", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Service[];
  },
});

export function featureList(features: unknown): string[] {
  return Array.isArray(features) ? (features as string[]) : [];
}

export const usd = (value: number) =>
  `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

export const tzs = (value: number | null) =>
  value == null ? "—" : `${value.toLocaleString("en-US")} TZS`;
