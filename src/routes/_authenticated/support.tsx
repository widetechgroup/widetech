import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRoles";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/support")({
  head: () => ({
    meta: [
      { title: "Support — WideTech Group" },
      { name: "description", content: "Chat live with the WideTech support team." },
      { property: "og:title", content: "Support — WideTech Group" },
      { property: "og:description", content: "Live support chat with WideTech Group." },
    ],
  }),
  component: SupportPage,
});

const inputCls = "min-h-[44px] rounded-xl border border-border bg-background/60 px-3 text-sm text-foreground";

function SupportPage() {
  const { user } = useAuth();
  const { isStaff } = useRoles();
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");

  const tickets = useQuery({
    queryKey: ["tickets", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("id,subject,status,created_at,customer_id")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !user) return;
    const { data, error } = await supabase
      .from("support_tickets")
      .insert({ subject: subject.trim(), customer_id: user.id })
      .select("id")
      .single();
    if (error) { toast.error(error.message); return; }
    setSubject("");
    setActiveId(data.id);
    qc.invalidateQueries({ queryKey: ["tickets"] });
  };

  const active = tickets.data?.find((t) => t.id === activeId) ?? null;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <h1 className="text-2xl font-extrabold md:text-3xl">Support</h1>
      <p className="text-sm text-muted-foreground">
        {isStaff ? "All customer conversations." : "Chat with our team — replies appear instantly."}
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-[300px_minmax(0,1fr)]">
        <aside className={cn("space-y-2", active && "hidden md:block")}>
          {!isStaff && (
            <form onSubmit={create} className="glass flex gap-2 rounded-2xl p-3">
              <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="What do you need help with?" className={cn(inputCls, "min-w-0 flex-1")} />
              <button className="min-h-[44px] shrink-0 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">Open</button>
            </form>
          )}
          {tickets.data?.length === 0 && (
            <div className="glass rounded-2xl p-5 text-sm text-muted-foreground">No conversations yet.</div>
          )}
          {tickets.data?.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveId(t.id)}
              className={cn("glass block w-full rounded-2xl p-4 text-left", activeId === t.id && "ring-2 ring-primary")}
            >
              <p className="truncate text-sm font-bold">{t.subject}</p>
              <p className="text-xs capitalize text-muted-foreground">
                {t.status} · {new Date(t.created_at).toLocaleDateString()}
              </p>
            </button>
          ))}
        </aside>
        {active ? (
          <Chat ticket={active} isStaff={isStaff} onBack={() => setActiveId(null)} />
        ) : (
          <div className="glass hidden rounded-2xl p-8 text-sm text-muted-foreground md:block">Pick a conversation.</div>
        )}
      </div>
    </div>
  );
}

function Chat({
  ticket,
  isStaff,
  onBack,
}: {
  ticket: { id: string; subject: string; status: string };
  isStaff: boolean;
  onBack: () => void;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const key = ["ticket-messages", ticket.id];

  const messages = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_messages")
        .select("id,body,sender_id,created_at")
        .eq("ticket_id", ticket.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`ticket-${ticket.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ticket_messages", filter: `ticket_id=eq.${ticket.id}` },
        () => qc.invalidateQueries({ queryKey: ["ticket-messages", ticket.id] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [ticket.id, qc]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.data?.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = body.trim();
    if (!text || !user) return;
    setBody("");
    const { error } = await supabase.from("ticket_messages").insert({ ticket_id: ticket.id, body: text, sender_id: user.id });
    if (error) { toast.error(error.message); setBody(text); return; }
    qc.invalidateQueries({ queryKey: key });
  };

  const toggleStatus = async () => {
    const { error } = await supabase
      .from("support_tickets")
      .update({ status: ticket.status === "open" ? "resolved" : "open" })
      .eq("id", ticket.id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["tickets"] });
  };

  return (
    <section className="glass flex h-[70vh] flex-col rounded-2xl">
      <header className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border p-4">
        <button onClick={onBack} className="text-sm font-semibold text-primary md:hidden">Back</button>
        <p className="truncate font-bold md:col-span-1">{ticket.subject}</p>
        {isStaff ? (
          <button onClick={toggleStatus} className="rounded-full border border-border px-3 py-1 text-xs font-semibold">
            Mark {ticket.status === "open" ? "resolved" : "open"}
          </button>
        ) : (
          <span className="text-xs capitalize text-muted-foreground">{ticket.status}</span>
        )}
      </header>
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages.data?.length === 0 && <p className="text-sm text-muted-foreground">Say hello 👋</p>}
        {messages.data?.map((m) => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <p
                className={cn(
                  "max-w-[80%] whitespace-pre-line rounded-2xl px-4 py-2 text-sm",
                  mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                )}
              >
                {m.body}
              </p>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} className="flex gap-2 border-t border-border p-3">
        <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Type a message" className={cn(inputCls, "min-w-0 flex-1")} />
        <button className="min-h-[44px] shrink-0 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">Send</button>
      </form>
    </section>
  );
}
