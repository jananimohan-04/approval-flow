import { useEffect, useState } from "react";
import { useDatabase, mutate, getDb } from "@/lib/store";
import type { AppUser } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { dataSourceService } from "@/lib/data/dataSource";
import { toast } from "sonner";

export function useSession(): AppUser | null | undefined {
  const db = useDatabase();
  const [init, setInit] = useState(false);

  useEffect(() => {
    // Initial fetch of session state directly from Supabase
    const initSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user?.email) {
        // Ensure local DB is hydrated first
        if (db.users.length === 0) {
          await dataSourceService.hydrate();
        }

        const freshState = getDb();
        const u = freshState.users.find(u => u.email === data.session!.user!.email);

        if (!u || !u.active) {
          await supabase.auth.signOut();
          toast.error("Your Google account is not authorized to access this platform. Please contact your administrator.", { duration: 10000 });
          mutate(store => ({ ...store, session_user_id: null }));
        } else {
          // Found and active, link auth_user_id if not present
          if (!u.auth_user_id) {
            await dataSourceService.update("users", u.id, { auth_user_id: data.session!.user!.id } as any);
          }
          mutate(store => ({ ...store, session_user_id: u.id }));
        }
      }
      setInit(true);
    };

    if (!init) {
      initSession();
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        mutate(store => ({ ...store, session_user_id: null }));
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user?.email) {
          // Await hydrate if missing
          if (getDb().users.length === 0) {
            await dataSourceService.hydrate();
          }

          const u = getFreshUserByEmail(session.user.email);
          if (!u || !u.active) {
            await supabase.auth.signOut();
            toast.error("Your Google account is not authorized to access this platform. Please contact your administrator.", { duration: 10000 });
            mutate(store => ({ ...store, session_user_id: null }));
          } else {
            if (!u.auth_user_id) {
              await dataSourceService.update("users", u.id, { auth_user_id: session.user.id } as any);
            }
            mutate(store => ({ ...store, session_user_id: u.id }));
          }
        }
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [init]);

  if (!init) return undefined;
  if (!db.session_user_id) return null;
  return db.users.find((u) => u.id === db.session_user_id) ?? null;
}

function getFreshUserByEmail(email: string) {
  const state = getDb();
  return state.users.find((u) => u.email === email);
}
