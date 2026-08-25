import { getDb, mutate } from "../store";
import type { Database } from "../types";

/**
 * Data source abstraction.
 *
 * Today the app reads from the local demo store. Later this same interface
 * will be fulfilled by a sync service:
 *
 *   Google Drive / Google Sheets -> Data Sync Service -> Backend API ->
 *   PostgreSQL -> this DataSource
 *
 * Feature code MUST depend on `dataSourceService` (or the services built on
 * top of it), never on the store directly, so the swap is a one-line change.
 */

export type TableName = Exclude<keyof Database, "settings" | "session_user_id">;

export interface DataSource {
  readonly name: string;
  /** Snapshot of a table. */
  list<T extends TableName>(table: T): Database[T];
  /** Insert a row. */
  insert<T extends TableName>(table: T, row: Database[T][number]): Database[T][number];
  /** Patch a row by id. */
  update<T extends TableName>(
    table: T,
    id: string,
    patch: Partial<Database[T][number]>,
  ): void;
  /** Remove a row by id. */
  remove(table: TableName, id: string): void;
  /** Reserved for the future Drive/Sheets pull. */
  sync(): Promise<{ synced: boolean; message: string }>;
}

class LocalDemoDataSource implements DataSource {
  readonly name = "demo-local";

  list<T extends TableName>(table: T): Database[T] {
    return getDb()[table];
  }

  insert<T extends TableName>(table: T, row: Database[T][number]) {
    mutate((db) => ({ ...db, [table]: [row, ...(db[table] as unknown[])] }) as Database);
    return row;
  }

  update<T extends TableName>(table: T, id: string, patch: Partial<Database[T][number]>) {
    mutate(
      (db) =>
        ({
          ...db,
          [table]: (db[table] as Array<{ id: string }>).map((row) =>
            row.id === id ? { ...row, ...patch } : row,
          ),
        }) as Database,
    );
  }

  remove(table: TableName, id: string) {
    mutate(
      (db) =>
        ({
          ...db,
          [table]: (db[table] as Array<{ id: string }>).filter((row) => row.id !== id),
        }) as Database,
    );
  }

  async sync() {
    return {
      synced: false,
      message:
        "Demo data source. Connect Google Drive / Sheets sync to enable live imports.",
    };
  }
}

/**
 * Placeholder for the future implementation. Keys must come from server-side
 * environment variables — never ship credentials in frontend code.
 */
export const GOOGLE_DRIVE_EXPECTED_FILES = [
  { file: "Vehicle Data", columns: ["Vehicle Number", "Company", "Driver", "Location", "Date", "Time", "Status"] },
  { file: "User Data", columns: ["User Name", "Email", "Role", "Branch", "Department"] },
  { file: "Approval Mapping", columns: ["Company/Branch/Type", "Approver", "Backup Approver"] },
  { file: "Operational Data", columns: ["To be confirmed with the client"] },
];

export const dataSourceService: DataSource = new LocalDemoDataSource();
