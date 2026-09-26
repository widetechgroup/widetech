import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — WideTech Group" },
      { name: "description", content: "Choose a new password for your WideTech Group account." },
      { property: "og:title", content: "Set a new password — WideTech Group" },
      { property: "og:description", content: "Choose a new password for your WideTech Group account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
      else setTimeout(() => setReady((r) => r ?? false), 2500);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const pw = String(f.get("password"));
    if (pw !== String(f.get("confirm"))) { toast.error("The two passwords don't match."); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password updated. You're signed in.");
    navigate({ to: "/account" });
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10 md:py-16">
      <div className="glass rounded-2xl p-6 md:p-8">
        <h1 className="text-2xl font-extrabold">Set a new password</h1>
        {ready === null && <p className="mt-3 text-sm text-muted-foreground">Checking your reset link…</p>}
        {ready === false && (
          <div className="mt-3 text-sm text-muted-foreground">
            <p>This reset link is invalid or has expired.</p>
            <Link to="/auth" className="mt-3 inline-block font-semibold text-primary">Back to sign in to request a new one</Link>
          </div>
        )}
        {ready && (
          <form onSubmit={submit} className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password">New password</Label>
              <Input id="password" name="password" type="password" required minLength={6} autoComplete="new-password" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirm new password</Label>
              <Input id="confirm" name="confirm" type="password" required minLength={6} autoComplete="new-password" />
            </div>
            <Button type="submit" disabled={busy} className="min-h-[48px] w-full">{busy ? "Saving…" : "Save new password"}</Button>
          </form>
        )}
      </div>
    </div>
  );
}
