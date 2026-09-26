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
};

export const servicesQuery = queryOptions({
  queryKey: ["services"],
  queryFn: async (): Promise<Service[]> => {
    const { data, error } = await supabase
      .from("services")
      .select(
        "id,title,slug,short_description,full_description,starting_price,price_tzs,billing_type,features,display_order,image_url",
      )
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
