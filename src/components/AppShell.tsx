import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home, LayoutGrid, ClipboardList, UserRound, LogIn, Gauge, LifeBuoy, CalendarClock, FolderKanban,
  History, Wrench, Tags, Users, Image as ImageIcon, Settings, Menu, PanelLeftClose, PanelLeftOpen, type LucideIcon,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import logo from "@/assets/widetech-logo.png.asset.json";
import { useRoles } from "@/hooks/useRoles";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { useCompany, usePreferredCurrency } from "@/lib/company";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

type NavItem = { to: "/" | "/services" | "/requests" | "/support" | "/account" | "/dashboard"; label: string; icon: LucideIcon; tab?: string };
type NavGroup = { title: string; items: NavItem[] };

const COLLAPSE_KEY = "wt-sidebar-collapsed";

function useNavGroups(): NavGroup[] {
  const { user } = useAuth();
  const { isStaff, isSuperAdmin, isTechnician } = useRoles();
  const groups: NavGroup[] = [];
  if (isStaff) {
    groups.push({
      title: "Operations",
      items: [
        { to: "/dashboard", tab: "overview", label: "Dashboard", icon: Gauge },
        { to: "/dashboard", tab: "dispatch", label: "Requests", icon: ClipboardList },
        { to: "/dashboard", tab: "consult", label: "Consultations", icon: CalendarClock },
        { to: "/dashboard", tab: "projects", label: "Projects", icon: FolderKanban },
        { to: "/support", label: "Customer service", icon: LifeBuoy },
        { to: "/dashboard", tab: "activity", label: "Audit logs", icon: History },
      ],
    });
  }
  if (isTechnician) {
    groups.push({ title: "My work", items: [{ to: "/dashboard", tab: "jobs", label: "Assigned requests", icon: Wrench }] });
  }
  if (isSuperAdmin) {
    groups.push({
      title: "Administration",
      items: [
        { to: "/dashboard", tab: "services", label: "Services & prices", icon: Tags },
        { to: "/dashboard", tab: "team", label: "Users & roles", icon: Users },
        { to: "/dashboard", tab: "media", label: "Media", icon: ImageIcon },
        { to: "/dashboard", tab: "settings", label: "Branding & settings", icon: Settings },
      ],
    });
  }
  const isCustomerOnly = !isStaff && !isTechnician;
  groups.unshift({
    title: isCustomerOnly ? "Menu" : "Customer area",
    items: [
      { to: "/", label: "Home", icon: Home },
      { to: "/services", label: "Services", icon: LayoutGrid },
      ...(user ? [{ to: "/requests", label: "My requests", icon: ClipboardList } as NavItem] : []),
      ...(user && isCustomerOnly ? [{ to: "/support", label: "Live chat", icon: LifeBuoy } as NavItem] : []),
    ],
  });
  if (user) groups.push({ title: "Me", items: [{ to: "/account", label: "Account", icon: UserRound }] });
  return groups;
}

function useMyProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["shell-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id,full_name,avatar_url,is_suspended").eq("id", user!.id).maybeSingle();
      return data;
    },
  });
}

export function AppShell({ children }: { children: ReactNode }) {
  const location = useRouterState({ select: (s) => s.location });
  const pathname = location.pathname;
  const currentTab = (location.search as { tab?: string }).tab ?? "overview";
  const { user } = useAuth();
  const company = useCompany();
  const currency = usePreferredCurrency();
  const groups = useNavGroups();
  const profile = useMyProfile();
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => { setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1"); }, []);
  useEffect(() => { setDrawer(false); }, [pathname, currentTab]);
  const toggle = () => setCollapsed((c) => { localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1"); return !c; });

  const isActive = (item: NavItem) => {
    if (item.to === "/dashboard") return pathname.startsWith("/dashboard") && currentTab === item.tab;
    return item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
  };
  const allItems = groups.flatMap((g) => g.items);
  const current = allItems.find(isActive);
  const section = groups.find((g) => g.items.includes(current as NavItem))?.title;

  if (user && profile.data?.is_suspended) {
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

  const mobileTabs: NavItem[] = [
    { to: "/", label: "Home", icon: Home },
    { to: "/services", label: "Services", icon: LayoutGrid },
    { to: "/requests", label: "Requests", icon: ClipboardList },
    { to: "/support", label: "Chat", icon: LifeBuoy },
    { to: "/account", label: "Account", icon: UserRound },
  ];

  const avatar = <UserAvatar name={profile.data?.full_name ?? user?.email ?? "?"} url={profile.data?.avatar_url ?? null} />;

  return (
    <div className="flex min-h-screen w-full">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "glass fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-border transition-[width] duration-200 md:flex",
          collapsed ? "w-[76px]" : "w-[280px]",
        )}
      >
        <SidebarBody groups={groups} isActive={isActive} collapsed={collapsed} company={company} />
      </aside>
      <div aria-hidden className={cn("hidden shrink-0 transition-[width] duration-200 md:block", collapsed ? "w-[76px]" : "w-[280px]")} />

      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
        {/* Desktop header */}
        <header className="glass sticky top-0 z-30 hidden h-16 items-center gap-4 border-b border-border px-6 md:flex">
          <button onClick={toggle} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} className="rounded-lg p-2 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground">
            {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </button>
          <div className="min-w-0">
            <p className="truncate text-[11px] text-muted-foreground">{section ?? company.name}</p>
            <h1 className="truncate text-sm font-bold">{current?.label ?? company.name}</h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {user && (
              <Link to="/account" title="Preferred currency — change it in your account" className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground">
                {currency}
              </Link>
            )}
            {user ? (
              <Link to="/account" aria-label="My account" className="flex items-center gap-2 rounded-full pl-1 pr-3 hover:bg-sidebar-accent">
                {avatar}
                <span className="max-w-[140px] truncate text-xs font-medium">{profile.data?.full_name}</span>
              </Link>
            ) : (
              <Link to="/auth" className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">
                <LogIn className="h-4 w-4" /> Sign in
              </Link>
            )}
          </div>
        </header>

        {/* Mobile header */}
        <header className="glass sticky top-0 z-30 flex items-center gap-3 px-4 py-3 md:hidden">
          <button onClick={() => setDrawer(true)} aria-label="Open menu" className="-ml-1 rounded-lg p-1.5 text-foreground">
            <Menu className="h-5 w-5" />
          </button>
          <img src={company.logoUrl ?? logo.url} alt={company.name || "Logo"} className="h-7 w-auto shrink-0" />
          <p className="min-w-0 flex-1 truncate text-sm font-bold">{company.name}</p>
          {user ? (
            <Link to="/account" aria-label="My account">{avatar}</Link>
          ) : (
            <Link to="/auth" className="shrink-0 text-xs font-semibold text-primary">Sign in</Link>
          )}
        </header>

        <main className="flex-1 pb-24 md:pb-0">{children}</main>
      </div>

      {/* Mobile drawer */}
      <Sheet open={drawer} onOpenChange={setDrawer}>
        <SheetContent side="left" className="w-[82vw] max-w-[300px] overflow-y-auto p-0">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SidebarBody groups={groups} isActive={isActive} collapsed={false} company={company} />
        </SheetContent>
      </Sheet>

      {/* Mobile bottom navigation */}
      <nav className="glass safe-bottom fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 md:hidden">
        {mobileTabs.map((item) => (
          <Link
            key={item.label}
            to={item.to}
            className={cn(
              "flex min-h-[56px] flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors",
              isActive(item) && "text-primary",
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

function SidebarBody({
  groups, isActive, collapsed, company,
}: { groups: NavGroup[]; isActive: (i: NavItem) => boolean; collapsed: boolean; company: ReturnType<typeof useCompany> }) {
  const { user } = useAuth();
  return (
    <div className="flex h-full flex-col">
      <Link to="/" className={cn("flex h-16 shrink-0 items-center gap-3 border-b border-border", collapsed ? "justify-center px-2" : "px-5")}>
        <img src={company.logoUrl ?? logo.url} alt={company.name || "Logo"} className="h-9 w-auto shrink-0" />
        {!collapsed && (
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold">{company.name}</span>
            <span className="block truncate text-[10px] tracking-widest text-muted-foreground">{company.tagline}</span>
          </span>
        )}
      </Link>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {groups.map((g) => (
          <div key={g.title}>
            {collapsed ? <div className="mx-3 mb-2 border-t border-border" /> : (
              <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{g.title}</p>
            )}
            <div className="space-y-0.5">
              {g.items.map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  {...(item.tab ? { search: { tab: item.tab } } : {})}
                  title={collapsed ? item.label : undefined}
                  aria-label={item.label}
                  className={cn(
                    "flex min-h-[40px] items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground",
                    collapsed && "justify-center px-0",
                    isActive(item) && "bg-sidebar-accent text-primary",
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>
      {!user && !collapsed && (
        <div className="border-t border-border p-3">
          <Link to="/auth" className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-primary">
            <LogIn className="h-4 w-4" /> Sign in / Create account
          </Link>
        </div>
      )}
    </div>
  );
}

function UserAvatar({ name, url }: { name: string; url: string | null }) {
  if (url) return <img src={url} alt={name} className="h-8 w-8 rounded-full object-cover" />;
  const initials = name.split(/[\s@]/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">{initials}</span>;
}
