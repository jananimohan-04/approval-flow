import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { dataSourceService } from "@/lib/data/dataSource";
import { useSession } from "@/hooks/useSession";
import { notificationService } from "@/lib/services/notificationService";

export function useSupabaseRealtime() {
    const user = useSession();

    useEffect(() => {
        if (!user) return;

        // We only subscribe to notifications for this specific user to avoid cross-talk
        const notifChannel = supabase
            .channel(`realtime:notifications:${user.id}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "notifications",
                    filter: `user_id=eq.${user.id}`,
                },
                async (payload) => {
                    console.log("Realtime Notification Event:", payload);
                    // If we receive an event, just hydrate or surgically inject
                    // Surgically injecting is faster
                    if (payload.eventType === "INSERT") {
                        const newNotif = payload.new as any;
                        dataSourceService.insertLocal("notifications", newNotif);

                        // Handle voice notification
                        const settings = notificationService.getSettings();
                        if (settings.voice_enabled) {
                            const msg = new SpeechSynthesisUtterance("You have a new task assigned.");
                            msg.lang = settings.voice_language || "en";
                            window.speechSynthesis.speak(msg);
                        }
                    } else if (payload.eventType === "UPDATE") {
                        const updatedNotif = payload.new as any;
                        dataSourceService.updateLocal("notifications", updatedNotif.id, updatedNotif);
                    } else if (payload.eventType === "DELETE") {
                        const deletedNotif = payload.old as any;
                        dataSourceService.removeLocal("notifications", deletedNotif.id);
                    }
                }
            )
            .subscribe((status) => {
                if (status === "SUBSCRIBED") {
                    console.log("Subscribed to realtime notifications");
                }
            });

        // Also strictly isolate Tasks realtime by Company.
        const taskChannel = supabase
            .channel(`realtime:tasks:${user.company_id}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "tasks",
                    filter: `company_id=eq.${user.company_id}`,
                },
                async (payload) => {
                    if (payload.eventType === "INSERT") {
                        const newTask = payload.new as any;
                        dataSourceService.insertLocal("tasks", newTask);
                    } else if (payload.eventType === "UPDATE") {
                        const updatedTask = payload.new as any;
                        dataSourceService.updateLocal("tasks", updatedTask.id, updatedTask);
                    } else if (payload.eventType === "DELETE") {
                        const deletedTask = payload.old as any;
                        dataSourceService.removeLocal("tasks", deletedTask.id);
                    }
                }
            )
            .subscribe((status) => {
                if (status === "SUBSCRIBED") {
                    console.log("Subscribed to realtime tasks for company");
                }
            });

        return () => {
            supabase.removeChannel(notifChannel);
            supabase.removeChannel(taskChannel);
        };
    }, [user]);
}
