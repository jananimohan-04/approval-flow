import { Bell } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { notificationService } from "@/lib/services/notificationService";
import { useDatabase } from "@/lib/store";
import type { User } from "@/lib/types";

export function NotificationBell({ user }: { user: User }) {
  useDatabase();
  const items = notificationService.listFor(user.id).slice(0, 8);
  const unread = notificationService.unreadCount(user.id);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary font-mono text-[9px] text-primary-foreground">
              {unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="label-mono">Notifications</span>
          <button
            className="font-mono text-[10px] uppercase tracking-[0.08em] text-primary hover:underline"
            onClick={() => notificationService.markAllRead(user.id)}
          >
            Mark all read
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No notifications yet.
            </p>
          )}
          {items.map((n) => (
            <button
              key={n.id}
              onClick={() => notificationService.markRead(n.id)}
              className="block w-full border-b px-3 py-2 text-left last:border-b-0 hover:bg-muted"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-medium">{n.title}</span>
                {!n.is_read && <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{n.message}</p>
              <p className="label-mono mt-1">
                {new Date(n.created_at).toLocaleString()}
              </p>
            </button>
          ))}
        </div>
        <div className="border-t px-3 py-2">
          <Link to="/notifications" className="font-mono text-[10px] uppercase tracking-[0.08em] text-primary hover:underline">
            View all
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
