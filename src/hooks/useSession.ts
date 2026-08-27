import { useEffect, useState } from "react";
import { useDatabase, mutate, getDb } from "@/lib/store";
import type { AppUser } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { dataSourceService } from "@/lib/data/dataSource";
import { toast } from "sonner";

export function useSession(): AppUser | null | undefined {
  const db = useDatabase();

  useEffect(() => {
    // We strictly only run initSession ONCE across the entire application globally
    if (!db.session_initialized) {
      if ((window as any)._sessionInitStarted) return;
      (window as any)._sessionInitStarted = true;

      const initSessionAction = async () => {
        try {
          const { data } = await supabase.auth.getSession();
          if (data.session?.user?.email) {
            // Ensure local DB is hydrated first
            if (getDb().users.length === 0) {
              await dataSourceService.hydrate();
            }

            const freshState = getDb();
            const u = freshState.users.find(u => u.email === data.session!.user!.email);

            if (!u || !u.active) {
              await supabase.auth.signOut();
              toast.error("Your account is not authorized to access this platform.", { duration: 10000 });
              mutate(store => ({ ...store, session_user_id: null, session_initialized: true }));
            } else {
              // Found and active, link auth_user_id if not present
              if (!u.auth_user_id) {
                await dataSourceService.update("users", u.id, { auth_user_id: data.session!.user!.id } as any).catch(console.error);
              }
              mutate(store => ({ ...store, session_user_id: u.id, session_initialized: true }));
            }
          } else {
            mutate(store => ({ ...store, session_initialized: true }));
          }
        } catch (err) {
          console.error("Session init failed:", err);
          mutate(store => ({ ...store, session_initialized: true }));
        }
      };

      initSessionAction();
    }

    if ((window as any)._authListenerActive) return;
    (window as any)._authListenerActive = true;

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        mutate(store => ({ ...store, session_user_id: null, session_initialized: true }));
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        try {
          if (session?.user?.email) {
            if (getDb().users.length === 0) {
              await dataSourceService.hydrate();
            }

            const u = getFreshUserByEmail(session.user.email);
            if (!u || !u.active) {
              await supabase.auth.signOut();
              toast.error("Your account is not authorized to access this platform.", { duration: 10000 });
              mutate(store => ({ ...store, session_user_id: null, session_initialized: true }));
            } else {
              if (!u.auth_user_id) {
                await dataSourceService.update("users", u.id, { auth_user_id: session.user.id } as any).catch(console.error);
              }
              mutate(store => ({ ...store, session_user_id: u.id, session_initialized: true }));
            }
          }
        } catch (err) {
          console.error("Auth change error", err);
        }
      }
    });

    // We do NOT unsubscribe in development strict mode intentionally to avoid tearing down the global listener.
    // Memory leak here is practically zero as it only happens on full page reload.
  }, [db.session_initialized]);

  if (!db.session_initialized) return undefined;
  if (!db.session_user_id) return null;
  return db.users.find((u) => u.id === db.session_user_id) ?? null;
}

function getFreshUserByEmail(email: string) {
  const state = getDb();
  return state.users.find((u) => u.email === email);
}
