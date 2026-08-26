import { useEffect, useState } from "react";
import { useDatabase, mutate, getDb } from "@/lib/store";
import type { User } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { dataSourceService } from "@/lib/data/dataSource";

export function useSession(): User | null {
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

        // At this point we can get the fresh store state because hydrate mutated it
        // We set session_user_id by finding the user with matching email
        mutate(store => {
          const u = store.users.find(u => u.email === data.session!.user!.email);
          return { ...store, session_user_id: u ? u.id : null };
        });
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
          const u = getFreshUserByEmail(session.user.email);
          if (u) {
            mutate(store => ({ ...store, session_user_id: u.id }));
          } else {
            // Race condition if they haven't hydrated yet (like fresh login redirect)
            await dataSourceService.hydrate();
            const nu = getFreshUserByEmail(session.user.email);
            if (nu) mutate(store => ({ ...store, session_user_id: nu.id }));
          }
        }
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [init, db.users.length]);

  if (!db.session_user_id) return null;
  return db.users.find((u) => u.id === db.session_user_id) ?? null;
}

function getFreshUserByEmail(email: string) {
  // Utility for pulling directly out of DB state to avoid stale captures
  const state = getDb();
  return state.users.find((u: any) => u.email === email);
}
