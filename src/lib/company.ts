import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Company = {
  company_name: string;
  tagline: string;
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
  address: string | null;
  usd_tzs_rate: number;
  logo_url: string | null;
};

export const companyQuery = queryOptions({
  queryKey: ["company-settings"],
  queryFn: async (): Promise<Company | null> => {
    const { data, error } = await supabase
      .from("company_settings")
      .select("company_name,tagline,phone,email,whatsapp,address,usd_tzs_rate,logo_url")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw error;
    return data ? { ...data, usd_tzs_rate: Number(data.usd_tzs_rate) } : null;
  },
});

/** Company details from the backend. Empty strings while loading — never hard-coded values. */
export function useCompany() {
  const { data, isLoading } = useQuery(companyQuery);
  return {
    loading: isLoading,
    name: data?.company_name ?? "",
    tagline: data?.tagline ?? "",
    phone: data?.phone ?? null,
    email: data?.email ?? null,
    whatsapp: data?.whatsapp ?? null,
    address: data?.address ?? null,
    rate: data?.usd_tzs_rate ?? null,
    logoUrl: data?.logo_url ?? null,
    toTzs: (usdAmount: number) => (data ? Math.round(usdAmount * data.usd_tzs_rate) : null),
  };
}
