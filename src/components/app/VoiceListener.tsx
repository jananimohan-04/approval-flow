import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { toast } from "sonner";
import { realtime } from "@/lib/services/realtime";
import { supabase } from "@/lib/supabase";
import type { AppUser, AppNotification } from "@/lib/types";
import { notificationService } from "@/lib/services/notificationService";
import { voiceService } from "@/lib/services/voiceService";

/**
 * Realtime bridge: turns store events into a toast plus a spoken alert for the
 * signed-in user. Swap `realtime` for Supabase Realtime / WebSockets later.
 */
export function VoiceListener({ user }: { user: AppUser }) {
  useEffect(() => {
    const unsubscribe = realtime.subscribe((event) => {
      if (event.type !== "notification.created") return;
      if (event.notification.user_id !== user.id) return;

      toast(event.notification.title, { description: event.notification.message });

      const settings = notificationService.getSettings();
      if (!settings.voice_enabled) return;
      voiceService.speak(event.notification.message, settings.voice_language);
    });
    return () => {
      unsubscribe();
    };
  }, [user.id]);

  return null;
}
