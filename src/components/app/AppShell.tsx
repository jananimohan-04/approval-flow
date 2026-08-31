import { useEffect, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Database, Bot, CheckSquare, Users, Settings,
  Bell, LogOut, Menu, Network, BookOpen, Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NotificationBell } from "./NotificationBell";
import { VoiceListener } from "./VoiceListener";
import { useSession } from "@/hooks/useSession";
import { useSupabaseRealtime } from "@/hooks/useSupabaseRealtime";
import { authService } from "@/lib/services/authService";
import type { AppRole } from "@/lib/types";
import { cn } from "@/lib/utils";

type NavItem = {
  to: string;
  label: string;
  icon: any;
  roles: AppRole[];
};

const NAV: NavItem[] = [
  // Super Admin Only
  { to: "/companies", label: "Companies", icon: Database, roles: ["super_admin"] },

  // Data Connectivity (Moved to top near Argus CEO Operations logo)
  { to: "/data-sources", label: "Connect to Drive", icon: Database, roles: ["super_admin", "company_admin", "admin"] },

  // Dashboard & Common
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["super_admin", "company_admin", "admin", "department_user"] },

  // Tasks & AI
  { to: "/tasks", label: "Tasks", icon: CheckSquare, roles: ["super_admin", "company_admin", "admin", "department_user"] },
  { to: "/ai-assistant", label: "AI Assistant", icon: Bot, roles: ["company_admin", "admin", "department_user"] },

  // Management
  { to: "/departments", label: "Departments", icon: Network, roles: ["super_admin", "company_admin", "admin"] },
  { to: "/users", label: "Users", icon: Users, roles: ["super_admin", "company_admin", "admin"] },
  { to: "/ai-rules", label: "AI Rules", icon: BookOpen, roles: ["super_admin", "company_admin", "admin"] },

  // Monitoring
  { to: "/notifications", label: "Notifications", icon: Bell, roles: ["super_admin", "company_admin", "admin", "department_user"] },
  { to: "/activity-logs", label: "Activity Logs", icon: Activity, roles: ["super_admin", "company_admin", "admin"] },

  // Settings
  { to: "/settings", label: "Settings", icon: Settings, roles: ["super_admin", "company_admin", "admin", "department_user"] },
];

function NavList({ role, onNavigate }: { role: AppRole; onNavigate?: () => void }) {
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
  useSupabaseRealtime();

  useEffect(() => {
    if (!user) navigate({ to: "/", replace: true });
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div className="flex min-h-[100dvh] bg-background">
      <VoiceListener user={user} />
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-sidebar md:flex">
        <div className="border-b px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Bot className="size-5" />
            </div>
            <div>
              <p className="font-display text-base font-bold tracking-tight">Argus CEO</p>
              <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Operations</p>
            </div>
          </div>
        </div>
        <NavList role={user.role} />
        <div className="mt-auto border-t p-3">
          <p className="text-sm font-medium truncate">{user.name}</p>
          <p className="label-mono mt-0.5 text-xs text-muted-foreground">
            {user.role === "super_admin" ? "Super Admin" : user.role === "company_admin" ? "Org Admin" : user.role === "admin" ? "Admin" : "Dept User"} · {user.department_id ? "Department" : "Unassigned"}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 w-full justify-start gap-2 cursor-pointer relative z-50"
            onClick={async () => {
              await authService.signOut();
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
              <SheetTitle className="border-b px-4 py-4 font-display text-base flex items-center gap-2">
                <Bot className="size-5" /> Argus CEO
              </SheetTitle>
              <NavList role={user.role} />
              <div className="mt-auto border-t p-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2 cursor-pointer relative z-50 pointer-events-auto"
                  onClick={async () => {
                    await authService.signOut();
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
