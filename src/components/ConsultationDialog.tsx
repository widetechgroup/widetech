import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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

const slots = ["09:00", "11:00", "14:00", "16:00"];

export function ConsultationDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) {
      onOpenChange(false);
      toast.info("Create an account to book a consultation");
      navigate({ to: "/auth" });
      return;
    }
    const form = new FormData(event.currentTarget);
    setSaving(true);
    const { error } = await supabase.from("consultations").insert({
      customer_id: user.id,
      topic: form.get("topic") as string,
      preferred_date: form.get("preferred_date") as string,
      preferred_time: form.get("preferred_time") as string,
      notes: (form.get("notes") as string) || null,
    });
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["my-consultations"] });
    onOpenChange(false);
    toast.success("Consultation requested — our team will confirm your slot");
    navigate({ to: "/requests" });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Book a consultation</DialogTitle>
          <DialogDescription>
            One hour with a WideTech advisor, on site or online.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="topic">Topic</Label>
            <Input id="topic" name="topic" required placeholder="Cloud migration roadmap" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="preferred_date">Preferred date</Label>
              <Input id="preferred_date" name="preferred_date" type="date" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="preferred_time">Preferred time</Label>
              <select
                id="preferred_time"
                name="preferred_time"
                defaultValue="09:00"
                className="h-11 w-full rounded-lg border border-input bg-secondary px-3 text-sm"
              >
                {slots.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot} EAT
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={3} />
          </div>

          <Button type="submit" disabled={saving} className="min-h-[48px] w-full">
            {saving ? "Booking…" : "Request slot"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
