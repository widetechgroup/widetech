import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const sel = "min-h-[40px] w-full rounded-lg border border-border bg-background/60 px-2 text-sm text-foreground";

/** Sends a cyber security request into the normal request tracking flow. */
export function CyberRequestDialog({ open, onOpenChange, itemName }: { open: boolean; onOpenChange: (o: boolean) => void; itemName: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) {
      onOpenChange(false);
      toast.info("Create an account or sign in to send a request");
      navigate({ to: "/auth" });
      return;
    }
    const f = new FormData(e.currentTarget);
    const concern = String(f.get("concern") ?? "").trim().slice(0, 200);
    const details = String(f.get("details") ?? "").trim().slice(0, 4000);
    if (!concern || !details) {
      toast.error("Please describe your concern");
      return;
    }
    const extra = [
      `Organization: ${String(f.get("org") ?? "").slice(0, 150) || "—"}`,
      `Organization type: ${f.get("org_type")}`,
      `Preferred date: ${f.get("date") || "—"}`,
      `Preferred method: ${f.get("method")}`,
    ].join("\n");
    setSaving(true);
    const { data, error } = await supabase
      .from("service_requests")
      .insert({
        customer_id: user.id,
        title: `Cyber security: ${itemName}`.slice(0, 200),
        description: `${concern}\n\n${details}\n\n${extra}`,
        urgency: String(f.get("urgency")),
      })
      .select("tracking_code")
      .single();
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(`Request sent — tracking code ${data.tracking_code}`);
    onOpenChange(false);
    navigate({ to: "/requests" });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request: {itemName}</DialogTitle>
          <DialogDescription>Tell us what you need. Our security team will review and contact you.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>Security concern</Label><Input name="concern" required maxLength={200} placeholder="e.g. Our website may have been hacked" /></div>
          <div><Label>Description of requirement</Label><Textarea name="details" required maxLength={4000} rows={4} /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Organization</Label><Input name="org" maxLength={150} /></div>
            <div><Label>Organization type</Label>
              <select name="org_type" className={sel}>
                {["Individual", "Small business", "Company", "NGO", "Government", "School / University", "Other"].map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div><Label>Preferred date</Label><Input name="date" type="date" /></div>
            <div><Label>Preferred method</Label>
              <select name="method" className={sel}><option>Remote</option><option>On-site</option><option>Hybrid</option></select>
            </div>
            <div><Label>Urgency</Label>
              <select name="urgency" defaultValue="medium" className={sel}>
                {["low", "medium", "high", "critical"].map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <Button type="submit" disabled={saving} className="w-full">{saving ? "Sending…" : user ? "Send request" : "Sign in to request"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
