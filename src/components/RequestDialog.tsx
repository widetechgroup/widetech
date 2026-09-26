import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Service } from "@/lib/services";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const urgencies = ["low", "medium", "high", "critical"] as const;

export function RequestDialog({
  open,
  onOpenChange,
  services,
  defaultServiceId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  services: Service[];
  defaultServiceId?: string;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) {
      onOpenChange(false);
      toast.info("Create an account to send a request");
      navigate({ to: "/auth" });
      return;
    }
    const form = new FormData(event.currentTarget);
    setSaving(true);
    const { data, error } = await supabase
      .from("service_requests")
      .insert({
        customer_id: user.id,
        service_id: (form.get("service_id") as string) || null,
        title: form.get("title") as string,
        description: form.get("description") as string,
        urgency: form.get("urgency") as string,
        estimated_budget: form.get("estimated_budget")
          ? Number(form.get("estimated_budget"))
          : null,
      })
      .select("tracking_code")
      .single();
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["my-requests"] });
    onOpenChange(false);
    toast.success(`Request received — tracking code ${data.tracking_code}`);
    navigate({ to: "/requests" });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Request a service</DialogTitle>
          <DialogDescription>
            Tell us what you need. You'll get a tracking code instantly.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="service_id">Service</Label>
            <select
              id="service_id"
              name="service_id"
              defaultValue={defaultServiceId ?? ""}
              className="h-11 w-full rounded-lg border border-input bg-secondary px-3 text-sm"
            >
              <option value="">Not sure yet</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.title}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required placeholder="CCTV for our Kariakoo shop" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Details</Label>
            <Textarea
              id="description"
              name="description"
              required
              rows={4}
              placeholder="Describe the site, scope, and what success looks like."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="urgency">Urgency</Label>
              <select
                id="urgency"
                name="urgency"
                defaultValue="medium"
                className="h-11 w-full rounded-lg border border-input bg-secondary px-3 text-sm capitalize"
              >
                {urgencies.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="estimated_budget">Budget (USD)</Label>
              <Input id="estimated_budget" name="estimated_budget" type="number" min="0" />
            </div>
          </div>

          <Button type="submit" disabled={saving} className="min-h-[48px] w-full">
            {saving ? "Sending…" : "Send request"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
