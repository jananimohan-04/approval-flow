import { useEffect, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Truck,
  ClipboardCheck,
  Bell,
  Settings,
  LogOut,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NotificationBell } from "./NotificationBell";
import { VoiceListener } from "./VoiceListener";
import { useSession } from "@/hooks/useSession";
import { authService } from "@/lib/services/authService";
import { ROLE_LABELS, type UserRole } from "@/lib/types";
import { cn } from "@/lib/utils";

const NAV: { to: string; label: string; icon: typeof Truck; roles: UserRole[] }[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "data_entry", "approver"] },
  { to: "/vehicles", label: "Vehicle Entries", icon: Truck, roles: ["admin", "data_entry", "approver"] },
  { to: "/approvals", label: "Approvals", icon: ClipboardCheck, roles: ["admin", "approver"] },
  { to: "/notifications", label: "Notifications", icon: Bell, roles: ["admin", "data_entry", "approver"] },
  { to: "/admin", label: "Administration", icon: Settings, roles: ["admin"] },
];

function NavList({ role, onNavigate }: { role: UserRole; onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex flex-col gap-0.5 p-2">
      {NAV.filter((n) => n.roles.includes(role)).map((item) => {
        const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-sm px-3 py-2 text-sm transition-colors",
              active
                ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-xs"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
            )}
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const user = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) navigate({ to: "/", replace: true });
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-background">
      <VoiceListener user={user} />
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-sidebar md:flex">
        <div className="border-b px-4 py-4">
          <p className="font-display text-base font-bold tracking-tight">Vecta Logic</p>
          <p className="label-mono mt-0.5">Gate Approval Control</p>
        </div>
        <NavList role={user.role} />
        <div className="mt-auto border-t p-3">
          <p className="text-sm font-medium">{user.name}</p>
          <p className="label-mono mt-0.5">
            {ROLE_LABELS[user.role]} · {user.branch}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 w-full justify-start gap-2"
            onClick={() => {
              authService.signOut();
              navigate({ to: "/", replace: true });
            }}
          >
            <LogOut className="size-3.5" /> Sign out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-surface/90 px-4 py-3 backdrop-blur">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Menu">
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 bg-sidebar p-0">
              <SheetTitle className="border-b px-4 py-4 font-display text-base">
                Vecta Logic
              </SheetTitle>
              <NavList role={user.role} />
              <div className="mt-auto border-t p-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={() => {
                    authService.signOut();
                    navigate({ to: "/", replace: true });
                  }}
                >
                  <LogOut className="size-3.5" /> Sign out
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-lg font-bold tracking-tight">{title}</h1>
            {subtitle && <p className="label-mono mt-0.5 truncate">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2">
            {actions}
            <NotificationBell user={user} />
          </div>
        </header>
        <main className="animate-barrier flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
