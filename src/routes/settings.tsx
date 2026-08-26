import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { Settings } from "lucide-react";

export const Route = createFileRoute("/settings")({
    component: SettingsPage,
});

function SettingsPage() {
    return (
        <AppShell
            title="Settings"
            subtitle="Application configuration and user profile settings"
        >
            <div className="flex flex-col items-center justify-center py-20 border rounded-xl bg-card border-dashed">
                <Settings className="size-10 text-muted-foreground/30 mb-4" />
                <h2 className="text-lg font-medium">Settings & Profile Configuration</h2>
                <p className="text-muted-foreground mt-1">Notification preferences, language handling, and display rules.</p>
            </div>
        </AppShell>
    );
}
