import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "My account — WideTech Group" },
      { name: "description", content: "Manage your WideTech Group profile and contact details." },
      { property: "og:title", content: "My account — WideTech Group" },
      { property: "og:description", content: "Manage your WideTech profile." },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const profile = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,full_name,email,phone,company_name,city,country")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const roles = useQuery({
    queryKey: ["roles", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("role");
      if (error) throw error;
      return (data ?? []).map((row) => row.role);
    },
  });

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.get("full_name") as string,
        phone: (form.get("phone") as string) || null,
        company_name: (form.get("company_name") as string) || null,
        city: (form.get("city") as string) || null,
      })
      .eq("id", user!.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
    toast.success("Profile updated");
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 md:px-8 md:py-12">
      <h1 className="text-2xl font-extrabold md:text-3xl">My account</h1>
      <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>
      {roles.data && roles.data.length > 0 && (
        <p className="mt-2 inline-block rounded-full border border-border px-3 py-1 text-xs font-semibold capitalize text-primary">
          {roles.data.join(", ").replace(/_/g, " ")}
        </p>
      )}

      <form onSubmit={handleSave} className="glass mt-6 space-y-4 rounded-2xl p-6">
        <div className="space-y-1.5">
          <Label htmlFor="full_name">Full name</Label>
          <Input
            id="full_name"
            name="full_name"
            required
            defaultValue={profile.data?.full_name ?? ""}
            key={profile.data?.full_name}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              name="phone"
              placeholder="+255 7xx xxx xxx"
              defaultValue={profile.data?.phone ?? ""}
              key={profile.data?.phone}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="city">City</Label>
            <Input id="city" name="city" defaultValue={profile.data?.city ?? ""} key={profile.data?.city} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="company_name">Company</Label>
          <Input
            id="company_name"
            name="company_name"
            defaultValue={profile.data?.company_name ?? ""}
            key={profile.data?.company_name}
          />
        </div>
        <Button type="submit" disabled={saving} className="min-h-[48px] w-full">
          {saving ? "Saving…" : "Save profile"}
        </Button>
      </form>

      <button
        onClick={async () => {
          await signOut();
          navigate({ to: "/" });
        }}
        className="glass-interactive mt-4 min-h-[48px] w-full rounded-xl text-sm font-semibold text-destructive"
      >
        Sign out
      </button>
    </div>
  );
}
