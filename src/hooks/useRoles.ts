import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";

export type AppRole =
  | "super_admin" | "admin" | "operations_manager" | "operator" | "sales" | "technician"
  | "consultant" | "support" | "finance" | "content_manager" | "customer";

export function useRoles() {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ["my-roles", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<AppRole[]> => {
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []).map((r) => r.role as AppRole);
    },
  });
  const perms = usePermissions();
  const roles = q.data ?? [];
  // Staff area access follows permissions (standard OR custom roles); the backend still enforces each action.
  const isStaff =
    roles.some((r) => r === "super_admin" || r === "admin" || r === "operator") || perms.can("dashboard.view");
  return {
    roles,
    loading: q.isLoading || perms.loading,
    isStaff,
    isSuperAdmin: roles.includes("super_admin"),
    isTechnician: roles.includes("technician"),
  };
}
