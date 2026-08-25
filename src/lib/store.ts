import { useSyncExternalStore } from "react";
import { seedDatabase } from "./data/demoData";
import type { Database } from "./types";

/**
 * Tiny observable store standing in for the future backend.
 *
 * Everything the UI reads goes through here, so the persistence layer can be
 * replaced (PostgreSQL via a backend API, Supabase, etc.) without touching
 * components. Mutations are performed through the services in ./services.
 */

const STORAGE_KEY = "vecta-logic.db.v1";

let db: Database = seedDatabase();
let hydrated = false;
const listeners = new Set<() => void>();

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Database>;
      db = { ...seedDatabase(), ...parsed };
    }
  } catch {
    /* corrupted storage — fall back to the seed */
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    /* storage full or unavailable — state stays in memory */
  }
}

export function getDb(): Database {
  hydrate();
  return db;
}

export function mutate(updater: (current: Database) => Database) {
  hydrate();
  db = updater(db);
  persist();
  listeners.forEach((l) => l());
}

export function subscribeDb(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetDatabase() {
  db = seedDatabase();
  persist();
  listeners.forEach((l) => l());
}

export function useDatabase(): Database {
  return useSyncExternalStore(subscribeDb, getDb, getDb);
}

export function uid(prefix: string) {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${random}`;
}
