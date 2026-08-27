import { dataSourceService } from "../data/dataSource";
import { getDb, mutate } from "../store";
import type { AppUser, AppRole } from "../types";
import { activityService } from "./activityService";
import { supabase } from "../supabase";
import { toast } from "sonner";

export const authService = {
  async signIn(email: string, password: string): Promise<{ user?: AppUser; error?: string }> {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      return { error: authError.message };
    }

    if (!authData.user) {
      return { error: "Unknown authentication error" };
    }

    // Refresh database explicitly to load matching user from app_users
    await dataSourceService.hydrate();

    // Find the mapped app_user
    const appUser = getDb().users.find(u => u.email === authData.user!.email);
    if (!appUser) {
      // Create user record locally if missing from mapping in a soft degradation mode?
      // For this spec, they must exist in the seed. If they don't and auth passes, we reject application level.
      await supabase.auth.signOut();
      return { error: "Authenticated successfully but no application user mapping found." };
    }

    if (!appUser.active) {
      await supabase.auth.signOut();
      return { error: "This account has been deactivated." };
    }

    mutate((db) => ({ ...db, session_user_id: appUser.id }));

    await activityService.log({
      user_id: appUser.id,
      action: "auth.login",
      entity_type: "user",
      entity_id: appUser.id,
      description: `${appUser.name} logged in`,
    });

    return { user: appUser };
  },

  async signOut() {
    const user = this.currentUser();
    if (user) {
      // Fire-and-forget logging for signout to keep it snappy
      activityService.log({
        user_id: user.id,
        action: "auth.logout",
        entity_type: "user",
        entity_id: user.id,
        description: `${user.name} logged out`,
      }).catch(console.error);
    }
    await supabase.auth.signOut();
    mutate((db) => ({ ...db, session_user_id: null }));
  },

  currentUser(): AppUser | null {
    const db = getDb();
    if (!db.session_user_id) return null;
    return db.users.find((u) => u.id === db.session_user_id) ?? null;
  },
};
