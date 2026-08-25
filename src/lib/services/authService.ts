import { dataSourceService } from "../data/dataSource";
import { getDb, mutate } from "../store";
import type { User } from "../types";
import { activityService } from "./activityService";

/**
 * Demo authentication. Replace with a real identity provider before
 * production — never ship shared demo credentials to real users.
 */
export const DEMO_PASSWORD = "demo1234";

export const DEMO_ACCOUNTS = [
  { email: "admin@demo.com", label: "Admin User", role: "Admin" },
  { email: "entry@demo.com", label: "Arun", role: "Data Entry" },
  { email: "approver@demo.com", label: "Kumar", role: "Approver" },
];

export const authService = {
  signIn(email: string, password: string): { user?: User; error?: string } {
    const user = dataSourceService
      .list("users")
      .find((u) => u.email.toLowerCase() === email.trim().toLowerCase());

    if (!user) return { error: "No account found for that email." };
    if (password !== DEMO_PASSWORD) return { error: "Incorrect password." };
    if (!user.active) return { error: "This account has been deactivated." };

    mutate((db) => ({ ...db, session_user_id: user.id }));
    activityService.log({
      user_id: user.id,
      action: "auth.login",
      entity_type: "user",
      entity_id: user.id,
      description: `${user.name} logged in`,
    });
    return { user };
  },

  signOut() {
    const user = this.currentUser();
    if (user) {
      activityService.log({
        user_id: user.id,
        action: "auth.logout",
        entity_type: "user",
        entity_id: user.id,
        description: `${user.name} logged out`,
      });
    }
    mutate((db) => ({ ...db, session_user_id: null }));
  },

  currentUser(): User | null {
    const db = getDb();
    if (!db.session_user_id) return null;
    return db.users.find((u) => u.id === db.session_user_id) ?? null;
  },
};
