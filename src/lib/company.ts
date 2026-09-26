import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type Company = {
  company_name: string;
  tagline: string;
  legal_name: string | null;
  short_description: string | null;
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
  address: string | null;
  website: string | null;
  business_hours: string | null;
  tax_number: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
  usd_tzs_rate: number;
  usd_eur_rate: number;
  logo_url: string | null;
};

export const companyQuery = queryOptions({
  queryKey: ["company-settings"],
  queryFn: async (): Promise<Company | null> => {
    const { data, error } = await supabase
      .from("company_settings")
      .select(
        "company_name,tagline,legal_name,short_description,phone,email,whatsapp,address,website,business_hours,tax_number,facebook_url,instagram_url,linkedin_url,usd_tzs_rate,usd_eur_rate,logo_url",
      )
      .eq("id", 1)
      .maybeSingle();
    if (error) throw error;
    return data
      ? { ...data, usd_tzs_rate: Number(data.usd_tzs_rate), usd_eur_rate: Number(data.usd_eur_rate) }
      : null;
  },
});

/** Company details from the backend. Empty strings while loading — never hard-coded values. */
export function useCompany() {
  const { data, isLoading } = useQuery(companyQuery);
  return {
    loading: isLoading,
    data,
    name: data?.company_name ?? "",
    tagline: data?.tagline ?? "",
    phone: data?.phone ?? null,
    email: data?.email ?? null,
    whatsapp: data?.whatsapp ?? null,
    address: data?.address ?? null,
    rate: data?.usd_tzs_rate ?? null,
    logoUrl: data?.logo_url ?? null,
    toTzs: (usdAmount: number) => (data ? Math.round(usdAmount * data.usd_tzs_rate) : null),
    toEur: (usdAmount: number) => (data ? Math.round(usdAmount * data.usd_eur_rate) : null),
  };
}

export const CURRENCIES = ["USD", "TZS", "EUR"] as const;
export type Currency = (typeof CURRENCIES)[number];

/** Signed-in user's preferred currency (defaults to USD for visitors). */
export function usePreferredCurrency(): Currency {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["my-currency", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("preferred_currency").eq("id", user!.id).maybeSingle();
      return (data?.preferred_currency ?? "USD") as Currency;
    },
  });
  return data ?? "USD";
}
