import { useDatabase } from "@/lib/store";
import type { User } from "@/lib/types";

/** Current signed-in demo user, reactive to store changes. */
export function useSession(): User | null {
  const db = useDatabase();
  if (!db.session_user_id) return null;
  return db.users.find((u) => u.id === db.session_user_id) ?? null;
}
