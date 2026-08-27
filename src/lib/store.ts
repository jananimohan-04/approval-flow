import { useSyncExternalStore } from "react";
import { seedDatabase } from "./data/demoData";
import type { Database } from "./types";

/**
 * Tiny observable store tracking Postgres schema.
 * Replaced localStorage persistence architecture with memory-only backing
 * since everything is flushed to Supabase.
 */

let db: Database = seedDatabase();
let hydrated = false;
const listeners = new Set<() => void>();

// Simulate hydrating from real db if needed, or initialized via dataSource route.
function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  // Previously we pulled from localStorage here. Now we just rely on seed,
  // and the data source abstraction `dataSourceService.hydrate()` overwrites this on load.
  try {
    localStorage.removeItem("nexus-ai.db.v2"); // Cleanup old legacy state
  } catch { }
}

export function getDb(): Database {
  hydrate();
  return db;
}

export function mutate(updater: (current: Database) => Database) {
  hydrate();
  db = updater(db);
  listeners.forEach((l) => l());
}

export function subscribeDb(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetDatabase() {
  db = seedDatabase();
  listeners.forEach((l) => l());
}

export function useDatabase(): Database {
  return useSyncExternalStore(subscribeDb, getDb, getDb);
}

export function uid(prefix?: string) {
  // Always return a strictly compliant UUID since Postgres strictly enforces it for keys.
  // The prefix argument is ignored to prevent UUID format violations.
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  } else {
    // Fallback pseudo-UUID generator for older browsers
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}
