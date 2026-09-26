import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Laptop, Smartphone, ShieldCheck, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { currentDeviceKey } from "@/lib/devices";
import { InstallApp } from "@/components/InstallApp";

const isPhone = (label: string) => /android|iphone|ipad/i.test(label);

export function DeviceSecurity() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState(false);
  const devices = useQuery({
    queryKey: ["my-devices", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_devices").select("id,device_key,label,first_seen,last_seen").eq("user_id", user!.id).order("last_seen", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const here = typeof window !== "undefined" ? currentDeviceKey() : "";

  const signOutOthers = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signOut({ scope: "others" });
    if (!error) await supabase.from("user_devices").delete().eq("user_id", user!.id).neq("device_key", here);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Signed out on all other devices");
    qc.invalidateQueries({ queryKey: ["my-devices"] });
  };

  const resetPassword = async () => {
    if (!user?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: `${window.location.origin}/auth` });
    if (error) { toast.error(error.message); return; }
    setEmail(true);
  };

  return (
    <section className="glass mt-4 rounded-2xl p-5">
      <h2 className="flex items-center gap-2 text-lg font-bold"><ShieldCheck className="h-5 w-5 text-primary" /> Devices & security</h2>
      <p className="mt-1 text-sm text-muted-foreground">Phones and computers where your account has been used. If you don't recognise one, sign out everywhere else and change your password.</p>

      <ul className="mt-4 space-y-2">
        {devices.isLoading && <li className="text-sm text-muted-foreground">Loading…</li>}
        {devices.data?.map((d) => {
          const Icon = isPhone(d.label) ? Smartphone : Laptop;
          return (
            <li key={d.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
              <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{d.label} {d.device_key === here && <span className="ml-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] text-success">This device</span>}</p>
                <p className="text-xs text-muted-foreground">Last active {new Date(d.last_seen).toLocaleString()} · first seen {new Date(d.first_seen).toLocaleDateString()}</p>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button onClick={signOutOthers} disabled={busy} className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-border text-sm font-semibold disabled:opacity-60">
          <LogOut className="h-4 w-4" /> {busy ? "Signing out…" : "Sign out other devices"}
        </button>
        <button onClick={resetPassword} disabled={email} className="min-h-[44px] rounded-xl border border-border text-sm font-semibold disabled:opacity-60">
          {email ? "Check your email for the link" : "Change my password"}
        </button>
      </div>

      <ul className="mt-4 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
        <li>Use a screen lock (PIN, fingerprint or face) on every phone and laptop.</li>
        <li>Keep your phone and browser updated, and never share your password or sign-in codes.</li>
        <li>Sign out when using a shared or public computer.</li>
      </ul>

      <div className="mt-4 border-t border-border pt-4">
        <p className="mb-2 text-sm font-semibold">Install WideTech on this device</p>
        <InstallApp />
      </div>
    </section>
  );
}
