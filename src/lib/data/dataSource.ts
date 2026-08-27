import { getDb, mutate } from "../store";
import type { Database } from "../types";
import { supabase } from "../supabase";

export type TableName = Exclude<keyof Database, "session_user_id">;

export interface DataSource {
  readonly name: string;
  list<T extends TableName>(table: T): Database[T];
  insert<T extends TableName>(table: T, row: Database[T][number]): Promise<Database[T][number]>;
  update<T extends TableName>(table: T, id: string, patch: Partial<Database[T][number]>): Promise<void>;
  remove(table: TableName, id: string): Promise<void>;
  sync(): Promise<{ synced: boolean; message: string }>;
  hydrate(): Promise<void>;
}

class AuthoritativeSupabaseDataSource implements DataSource {
  readonly name = "supabase-authoritative";
  private isConnected = false;

  constructor() {
    this.isConnected =
      import.meta.env["VITE_SUPABASE_URL"] !== undefined &&
      import.meta.env["VITE_SUPABASE_ANON_KEY"] !== undefined;

    if (this.isConnected && typeof window !== "undefined") {
      this.setupRealtime();
    }
  }

  private setupRealtime() {
    supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public' },
        (payload) => {
          this.handleRealtimeEvent(payload.table as TableName, payload);
        }
      )
      .subscribe();
  }

  private handleRealtimeEvent(table: TableName, payload: any) {
    if (!Object.keys(getDb()).includes(table)) return;

    if (payload.eventType === 'INSERT') {
      const existing = (getDb()[table] as any[]).find((r) => r.id === payload.new.id);
      if (!existing) {
        mutate((db) => ({ ...db, [table]: [payload.new, ...(db[table] as any[])] }) as Database);
      }
    } else if (payload.eventType === 'UPDATE') {
      mutate((db) => ({
        ...db,
        [table]: (db[table] as any[]).map((row) =>
          row.id === payload.new.id ? { ...row, ...payload.new } : row
        ),
      }) as Database);
    } else if (payload.eventType === 'DELETE') {
      mutate((db) => ({
        ...db,
        [table]: (db[table] as any[]).filter((row) => row.id !== payload.old.id),
      }) as Database);
    }
  }

  async hydrate() {
    if (!this.isConnected) return;
    try {
      const tables: { [key in TableName]: string } = {
        companies: "companies",
        users: "app_users",
        departments: "departments",
        tasks: "tasks",
        notifications: "notifications",
        activity_logs: "activity_logs",
        ai_rules: "ai_rules",
        google_drive_connections: "google_drive_connections",
        data_sources: "data_sources",
        data_source_rows: "data_source_rows",
      };

      const newDb: Partial<Database> = {};
      for (const [memTable, pgTable] of Object.entries(tables)) {
        const { data, error } = await supabase.from(pgTable).select("*");
        if (!error && data) {
          newDb[memTable as TableName] = data as any;
        }
      }
      mutate((db) => ({ ...db, ...newDb }));
    } catch (e) {
      console.error("Failed to hydrate from Supabase", e);
    }
  }

  private pgTableFor(table: TableName): string {
    switch (table) {
      case "users": return "app_users";
      default: return table;
    }
  }

  list<T extends TableName>(table: T): Database[T] {
    return getDb()[table];
  }

  async insert<T extends TableName>(table: T, row: Database[T][number]) {
    if (!this.isConnected) throw new Error("Supabase is not connected");

    // Await response, fallback to real DB record if possible
    const { data, error } = await supabase.from(this.pgTableFor(table)).insert(row).select().single();
    if (error) {
      console.error(`Supabase Insert Error (${table}):`, error);
      throw new Error(`Database error saving to ${table}: ${error.message}`);
    }

    const savedRow = (data || row) as Database[T][number];

    // Only after success, update local store
    mutate((db) => ({ ...db, [table]: [savedRow, ...(db[table] as unknown[])] }) as Database);
    return savedRow;
  }

  async update<T extends TableName>(table: T, id: string, patch: Partial<Database[T][number]>) {
    if (!this.isConnected) throw new Error("Supabase is not connected");

    const { error } = await supabase.from(this.pgTableFor(table)).update(patch as any).eq('id', id);
    if (error) {
      console.error(`Supabase Update Error (${table}):`, error);
      throw new Error(`Database error updating ${table}: ${error.message}`);
    }

    // Only after success, update local store
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

  async remove(table: TableName, id: string) {
    if (!this.isConnected) throw new Error("Supabase is not connected");

    const { error } = await supabase.from(this.pgTableFor(table)).delete().eq('id', id);
    if (error) {
      console.error(`Supabase Delete Error (${table}):`, error);
      throw new Error(`Database error deleting from ${table}: ${error.message}`);
    }

    // Only after success, update local store
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
      synced: true,
      message: "Sync managed by Supabase Realtime natively.",
    };
  }
}

export const dataSourceService: DataSource = new AuthoritativeSupabaseDataSource();
