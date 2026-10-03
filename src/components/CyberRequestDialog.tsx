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
export function CyberRequestDialog({ open, onOpenChange, itemName, serviceId, packageId }: { open: boolean; onOpenChange: (o: boolean) => void; itemName: string; serviceId?: string | undefined; packageId?: string | undefined }) {
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
    const t = (k: string, n: number) => String(f.get(k) ?? "").trim().slice(0, n) || null;
    const assets = Number(f.get("assets"));
    setSaving(true);
    const { data: prof } = await supabase.from("profiles").select("full_name,email,phone").eq("id", user.id).maybeSingle();
    const { data, error } = await supabase
      .from("cyber_service_requests")
      .insert({
        customer_id: user.id,
        request_code: "", // replaced by the database
        service_id: serviceId ?? null,
        package_id: packageId ?? null,
        item_name: itemName.slice(0, 200),
        customer_name: (prof?.full_name || user.email || "Customer").slice(0, 150),
        email: prof?.email || user.email || "",
        phone: t("phone", 40) ?? prof?.phone ?? null,
        organization: t("org", 150),
        organization_type: String(f.get("org_type")),
        security_concern: concern,
        description: details,
        preferred_date: t("date", 10),
        preferred_method: String(f.get("method")),
        priority: String(f.get("urgency")),
        asset_count: f.get("assets") && Number.isFinite(assets) ? Math.max(0, Math.floor(assets)) : null,
        website_url: t("website", 300),
        domain_name: t("domain", 200),
        application_name: t("app", 200),
        additional_info: t("extra", 2000),
      })
      .select("request_code")
      .single();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Request sent — request number ${data.request_code}`);
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
              <select name="method" className={sel}><option value="remote">Remote</option><option value="onsite">On-site</option><option value="hybrid">Hybrid</option></select>
            </div>
            <div><Label>Urgency</Label>
              <select name="urgency" defaultValue="medium" className={sel}>
                {["low", "medium", "high", "critical"].map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div><Label>Phone</Label><Input name="phone" maxLength={40} /></div>
            <div><Label>Number of systems</Label><Input name="assets" type="number" min="0" /></div>
            <div><Label>Website</Label><Input name="website" maxLength={300} placeholder="https://" /></div>
            <div><Label>Domain</Label><Input name="domain" maxLength={200} /></div>
            <div className="sm:col-span-2"><Label>Application name</Label><Input name="app" maxLength={200} /></div>
          </div>
          <div><Label>Anything else?</Label><Textarea name="extra" maxLength={2000} rows={2} placeholder="Never send passwords here." /></div>
          <Button type="submit" disabled={saving} className="w-full">{saving ? "Sending…" : user ? "Send request" : "Sign in to request"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
