import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CURRENCIES } from "@/lib/company";

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
        .select("id,full_name,email,phone,whatsapp,job_title,address,company_name,city,country,avatar_url,preferred_currency")
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
        country: (form.get("country") as string) || null,
        whatsapp: (form.get("whatsapp") as string) || null,
        job_title: (form.get("job_title") as string) || null,
        address: (form.get("address") as string) || null,
        preferred_currency: (form.get("preferred_currency") as string) || "USD",
      })
      .eq("id", user!.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
    await queryClient.invalidateQueries({ queryKey: ["my-currency", user?.id] });
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

      <AvatarPicker userId={user?.id} name={profile.data?.full_name ?? ""} url={profile.data?.avatar_url ?? null} onChange={() => queryClient.invalidateQueries({ queryKey: ["profile", user?.id] })} />

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
        <div className="grid gap-4 sm:grid-cols-2">
          {([["whatsapp", "WhatsApp"], ["job_title", "Job title"], ["address", "Address"], ["country", "Country"]] as const).map(([k, lbl]) => (
            <div key={k} className="space-y-1.5">
              <Label htmlFor={k}>{lbl}</Label>
              <Input id={k} name={k} defaultValue={profile.data?.[k] ?? ""} key={profile.data?.[k] ?? k} />
            </div>
          ))}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="preferred_currency">Preferred currency</Label>
          <select
            id="preferred_currency"
            name="preferred_currency"
            defaultValue={profile.data?.preferred_currency ?? "USD"}
            key={profile.data?.preferred_currency}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
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

function AvatarPicker({ userId, name, url, onChange }: { userId: string | undefined; name: string; url: string | null; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";

  async function upload(file: File) {
    if (!userId) return;
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB");
    setBusy(true);
    const path = `avatars/${userId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
    const up = await supabase.storage.from("media").upload(path, file, { contentType: file.type });
    if (up.error) { setBusy(false); { toast.error(up.error.message); }
    const signed = await supabase.storage.from("media").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
    if (signed.error) { setBusy(false); { toast.error(signed.error.message); }
    const { error } = await supabase.from("profiles").update({ avatar_url: signed.data.signedUrl }).eq("id", userId);
    setBusy(false);
    if (error) { toast.error(error.message);
    toast.success("Profile picture updated");
    onChange();
  }

  async function remove() {
    if (!userId) return;
    setBusy(true);
    const { data: files } = await supabase.storage.from("media").list(`avatars/${userId}`);
    if (files?.length) await supabase.storage.from("media").remove(files.map((f) => `avatars/${userId}/${f.name}`));
    const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", userId);
    setBusy(false);
    if (error) { toast.error(error.message);
    toast.success("Profile picture removed");
    onChange();
  }

  return (
    <div className="glass mt-6 flex items-center gap-4 rounded-2xl p-5">
      {url ? (
        <img src={url} alt="Profile picture" className="h-20 w-20 rounded-full object-cover" />
      ) : (
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/15 text-2xl font-bold text-primary">{initials}</div>
      )}
      <div className="flex flex-wrap gap-2">
        <label className="cursor-pointer rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
          {busy ? "Working…" : url ? "Replace picture" : "Upload picture"}
          <input type="file" accept="image/*" className="hidden" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
        </label>
        {url && (
          <button type="button" disabled={busy} onClick={remove} className="glass-interactive rounded-xl px-4 py-2.5 text-sm font-semibold text-destructive">
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
