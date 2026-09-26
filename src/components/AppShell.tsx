import { Link, useRouterState } from "@tanstack/react-router";
import { Home, LayoutGrid, ClipboardList, UserRound, LogIn, Gauge, LifeBuoy } from "lucide-react";
import { useRoles } from "@/hooks/useRoles";
import type { ReactNode } from "react";
import logo from "@/assets/widetech-logo.png.asset.json";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { useCompany } from "@/lib/company";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const navItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/services", label: "Services", icon: LayoutGrid },
  { to: "/requests", label: "Requests", icon: ClipboardList },
  { to: "/support", label: "Support", icon: LifeBuoy },
  { to: "/account", label: "Account", icon: UserRound },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();
  const company = useCompany();
  const { isStaff, isTechnician } = useRoles();
  const items = isStaff || isTechnician
    ? [...navItems.slice(0, 4), { to: "/dashboard", label: "Ops", icon: Gauge } as const, navItems[4]]
    : navItems;

  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));
  const suspension = useQuery({
    queryKey: ["my-suspension", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("is_suspended").eq("id", user!.id).maybeSingle();
      return data?.is_suspended ?? false;
    },
  });
  if (user && suspension.data) {
    return (
      <div className="grid min-h-screen place-items-center p-6">
        <div className="glass max-w-md rounded-2xl p-6 text-center">
          <h1 className="text-xl font-bold">Account suspended</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account has been suspended. Please contact {company.name}{company.phone ? ` on ${company.phone}` : ""}{company.email ? ` or ${company.email}` : ""}.
          </p>
          <button onClick={() => supabase.auth.signOut()} className="mt-4 min-h-[44px] rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">Sign out</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full">
      {/* Desktop sidebar */}
      <aside className="glass sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-2 p-4 md:flex">
        <Link to="/" className="mb-6 flex items-center gap-3 px-2">
          <img src={logo.url} alt={company.name || "Logo"} className="h-10 w-auto" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold">{company.name}</span>
            <span className="block truncate text-[11px] tracking-widest text-muted-foreground">{company.tagline}</span>
          </span>
        </Link>

        <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Main
        </p>
        {items.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground",
              isActive(item.to) && "bg-sidebar-accent text-primary",
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        ))}

        <div className="mt-auto rounded-xl border border-border p-3 text-xs text-muted-foreground">
          {user ? (
            <span className="block truncate">Signed in as {user.email}</span>
          ) : (
            <Link to="/auth" className="flex items-center gap-2 font-medium text-primary">
              <LogIn className="h-4 w-4" /> Sign in / Create account
            </Link>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="glass sticky top-0 z-30 flex items-center gap-3 px-4 py-3 md:hidden">
          <img src={logo.url} alt={company.name || "Logo"} className="h-8 w-auto shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{company.name}</p>
            <p className="truncate text-[10px] tracking-widest text-muted-foreground">{company.tagline}</p>
          </div>
          {!user && (
            <Link to="/auth" className="shrink-0 text-xs font-semibold text-primary">
              Sign in
            </Link>
          )}
        </header>

        <main className="flex-1 pb-24 md:pb-0">{children}</main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="glass safe-bottom fixed inset-x-0 bottom-0 z-40 grid md:hidden" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex min-h-[56px] flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors",
              isActive(item.to) && "text-primary",
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
