import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, CheckCircle2, Circle, Settings2 } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useSession } from "@/hooks/useSession";
import { useDatabase } from "@/lib/store";
import { notificationService, type UserSettings } from "@/lib/services/notificationService";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [{ title: "Notifications — Nexus AI" }],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const user = useSession();
  const db = useDatabase();
  const navigate = useNavigate();

  if (!user) return <AppShell title="Notifications">{null}</AppShell>;

  const notifications = notificationService.listFor(user.id);
  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const settings = notificationService.getSettings();

  const handleMarkRead = (id: string) => {
    notificationService.markRead(id);
  };

  const handleMarkAllRead = () => {
    notificationService.markAllRead(user.id);
  };

  const handleSettingChange = (updates: Partial<UserSettings>) => {
    notificationService.saveSettings({ ...settings, ...updates });
  };

  const handleNavigate = (relatedId: string | null, type: string) => {
    if (!relatedId) return;
    if (type.startsWith("task")) {
      navigate({ to: "/tasks" });
    }
  };

  return (
    <AppShell
      title="Notifications"
      subtitle={`You have ${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`}
      actions={
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
              <Check className="size-4 mr-2" /> Mark all as read
            </Button>
          )}

          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="secondary" className="gap-2">
                <Settings2 className="size-4" /> Voice Settings
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Voice Notifications</DialogTitle>
                <DialogDescription>
                  Configure browser-based voice announcements for new operational events.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Enable Voice Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Read aloud new tasks and system updates.
                    </p>
                  </div>
                  <Switch
                    checked={settings.voice_enabled}
                    onCheckedChange={(v) => handleSettingChange({ voice_enabled: v })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Voice Language</Label>
                  <Select
                    value={settings.voice_language}
                    onValueChange={(v: "en" | "ta") => handleSettingChange({ voice_language: v })}
                    disabled={!settings.voice_enabled}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ta">Tamil (தமிழ்)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    If Tamil falls back or sounds unnatural, your device might not have the Tamil
                    voice module installed.
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      <div className="bg-card border rounded-sm divide-y shadow-sm">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center">
            <CheckCircle2 className="size-12 mb-3 text-muted/40" />
            <p className="text-lg">You're all caught up!</p>
            <p className="text-sm">No notifications to display.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 flex gap-4 transition-colors hover:bg-muted/50 ${!n.is_read ? "bg-primary/5" : ""}`}
            >
              <div className="pt-1">
                {!n.is_read ? (
                  <Circle className="size-2.5 fill-primary text-primary" />
                ) : (
                  <Circle className="size-2.5 fill-muted-foreground/30 text-muted-foreground/30" />
                )}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex justify-between items-start">
                  <h4
                    className={`text-sm ${!n.is_read ? "font-semibold text-foreground" : "font-medium text-foreground/80"}`}
                  >
                    {n.title}
                  </h4>
                  <span className="text-xs text-muted-foreground font-mono">
                    {new Date(n.created_at).toLocaleString()}
                  </span>
                </div>
                <p
                  className={`text-sm ${!n.is_read ? "text-foreground/90" : "text-muted-foreground"}`}
                >
                  {n.message}
                </p>

                <div className="pt-2 flex gap-3">
                  {n.task_id && (
                    <button
                      onClick={() => handleNavigate(n.task_id, n.type)}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      View Details
                    </button>
                  )}
                  {!n.is_read && (
                    <button
                      onClick={() => handleMarkRead(n.id)}
                      className="text-xs font-medium text-muted-foreground hover:text-foreground"
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </AppShell>
  );
}
