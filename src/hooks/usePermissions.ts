import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/** Permissions come from the backend (my_permissions RPC); UI checks are convenience only — RLS/has_permission enforce. */
export function usePermissions() {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ["my-permissions", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase.rpc("my_permissions");
      if (error) throw error;
      return (data ?? []) as unknown as string[];
    },
  });
  const set = new Set(q.data ?? []);
  return {
    permissions: q.data ?? [],
    loading: q.isLoading,
    can: (perm: string) => set.has(perm),
    canAny: (...perms: string[]) => perms.some((p) => set.has(p)),
  };
}
