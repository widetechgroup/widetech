import { createFileRoute } from "@tanstack/react-router";
import { useCompany } from "@/lib/company";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — WideTech Group" },
      { name: "description", content: "How WideTech Group collects, uses and protects your personal information." },
      { property: "og:title", content: "Privacy Policy — WideTech Group" },
      { property: "og:description", content: "How WideTech Group collects, uses and protects your personal information." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const c = useCompany();
  const name = c.name || "WideTech Group";
  const sections: [string, string[]][] = [
    ["Who we are", [`${name} provides technology services in Tanzania and East Africa. This policy explains how we handle personal information when you use our website and app. We follow the Personal Data Protection Act, 2022 of Tanzania.`]],
    ["Information we collect", [
      "Account details: your name, email, phone, WhatsApp number, company, job title, address and profile photo.",
      "Service information: requests, consultation bookings, quotes, projects and support chat messages.",
      "Device information: the type of browser and device you sign in from and when it was last used, so you can review and protect your account.",
    ]],
    ["How we use it", [
      "To deliver the services you request, prepare quotes, schedule visits and support you.",
      "To contact you about your requests and projects.",
      "To keep accounts secure and prevent misuse.",
      "We do not sell your personal information.",
    ]],
    ["Who can see it", [
      "Only our staff who need it to serve you (for example the technician assigned to your request).",
      "Trusted providers that host our systems, under confidentiality obligations.",
      "Authorities, where the law requires it.",
    ]],
    ["How we protect it", ["Information is stored with access controls, encrypted connections and role-based permissions. Sign-ins from each device are listed in your account so you can sign out devices you don't recognise."]],
    ["How long we keep it", ["We keep account and service records while your account is active and as long as needed for legal, tax and accounting purposes."]],
    ["Your rights", ["You can view and update your details under My account, and ask us to correct, export or delete your personal information, or to stop contacting you."]],
    ["Changes", ["We may update this policy. The date below shows the latest version."]],
  ];
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-8 md:px-8 md:py-12">
      <h1 className="text-3xl font-extrabold">Privacy policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated 26 September 2026</p>
      <div className="glass mt-6 space-y-6 rounded-2xl p-6">
        {sections.map(([title, paras]) => (
          <section key={title}>
            <h2 className="text-lg font-bold">{title}</h2>
            {paras.length > 1 ? (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">{paras.map((p) => <li key={p}>{p}</li>)}</ul>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">{paras[0]}</p>
            )}
          </section>
        ))}
        <section>
          <h2 className="text-lg font-bold">Contact us</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {name}{c.address ? `, ${c.address}` : ""}
            {c.email && <><br />Email: <a className="text-primary" href={`mailto:${c.email}`}>{c.email}</a></>}
            {c.phone && <><br />Phone: {c.phone}</>}
          </p>
        </section>
      </div>
    </article>
  );
}
