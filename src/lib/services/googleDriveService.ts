import { dataSourceService } from "../data/dataSource";
import { getDb, uid } from "../store";
import type {
  GoogleDriveConnection,
  DataSourceModel,
  DataSourceRow,
} from "../types";
import { activityService } from "./activityService";
import { taskService } from "./taskService";

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export const googleDriveService = {

  async saveConnection(userId: string, email: string, accessToken?: string, refreshToken?: string, expiry?: string, scopes?: string): Promise<GoogleDriveConnection> {
    const now = new Date().toISOString();
    const userObj = getDb().users.find((u) => u.id === userId);

    const conn: GoogleDriveConnection = {
      id: uid("gdc"),
      company_id: userObj?.company_id ?? "",
      user_id: userId,
      google_account_email: email,
      encrypted_access_token: accessToken || null,
      encrypted_refresh_token: refreshToken || null,
      expiry: expiry || null,
      scopes: scopes || null,
      selected_folder_id: null,
      selected_folder_name: null,
      status: "connected",
      created_at: now,
      updated_at: now,
    };

    const existing = getDb().google_drive_connections.filter((c) => c.user_id === userId);
    for (const old of existing) {
      await dataSourceService.remove("google_drive_connections", old.id);
    }
    await dataSourceService.insert("google_drive_connections", conn);

    await activityService.log({
      user_id: userId,
      action: "drive.connected",
      entity_type: "google_drive_connection",
      entity_id: conn.id,
      description: `Google Drive connected: ${email}`,
    });

    return conn;
  },

  getConnection(userId: string): GoogleDriveConnection | null {
    return (
      getDb().google_drive_connections.find(
        (c) => c.user_id === userId && c.status === "connected",
      ) ?? null
    );
  },

  async disconnect(userId: string): Promise<void> {
    const conn = getDb().google_drive_connections.find((c) => c.user_id === userId);
    if (!conn) return;
    await dataSourceService.update("google_drive_connections", conn.id, {
      status: "disconnected",
      updated_at: new Date().toISOString(),
    });
    await activityService.log({
      user_id: userId,
      action: "drive.disconnected",
      entity_type: "google_drive_connection",
      entity_id: conn.id,
      description: "Google Drive disconnected",
    });
  },

  async selectFolder(userId: string, folderId: string, folderName: string): Promise<void> {
    const conn = getDb().google_drive_connections.find(
      (c) => c.user_id === userId && c.status === "connected",
    );
    if (!conn) return;
    await dataSourceService.update("google_drive_connections", conn.id, {
      selected_folder_id: folderId,
      selected_folder_name: folderName,
      updated_at: new Date().toISOString(),
    });
    await activityService.log({
      user_id: userId,
      action: "drive.folder_selected",
      entity_type: "google_drive_connection",
      entity_id: conn.id,
      description: `Folder selected: ${folderName} (${folderId})`,
    });
  },

  getMonitoredFiles(): DataSourceModel[] {
    return getDb().data_sources;
  },

  async saveMonitoredFiles(
    userId: string,
    connectionId: string,
    folderId: string,
    files: { id: string; name: string; mimeType: string; modifiedTime: string }[],
  ): Promise<void> {
    const existing = getDb().data_sources;
    const now = new Date().toISOString();

    for (const file of files) {
      const already = existing.find((e) => e.google_file_id === file.id);
      if (already) continue;

      const monFile: DataSourceModel = {
        id: uid("ds"),
        google_file_id: file.id,
        google_folder_id: folderId,
        file_name: file.name,
        file_type: null,
        mime_type: file.mimeType,
        enabled: true,
        last_modified_at: file.modifiedTime || null,
        last_synced_at: null,
        row_count: 0,
        sync_status: "pending",
        schema_snapshot: {},
        company_id: getDb().users.find((u) => u.id === userId)?.company_id || null,
        created_at: now,
        updated_at: now,
      };
      await dataSourceService.insert("data_sources", monFile);

      await activityService.log({
        user_id: userId,
        action: "drive.file_monitoring_added",
        entity_type: "data_source",
        entity_id: monFile.id,
        description: `File added to data sources: ${file.name}`,
      });
    }
  },

  async toggleMonitoring(fileId: string, enabled: boolean): Promise<void> {
    await dataSourceService.update("data_sources", fileId, {
      enabled: enabled,
      updated_at: new Date().toISOString(),
    });
    const file = getDb().data_sources.find((f) => f.id === fileId);
    if (file) {
      await activityService.log({
        user_id: "system",
        action: enabled ? "drive.file_monitoring_enabled" : "drive.file_monitoring_disabled",
        entity_type: "data_source",
        entity_id: fileId,
        description: `Monitoring ${enabled ? "enabled" : "disabled"}: ${file.file_name}`,
      });
    }
  },

  async removeMonitoredFile(fileId: string): Promise<void> {
    const file = getDb().data_sources.find((f) => f.id === fileId);
    if (file) {
      await activityService.log({
        user_id: "system",
        action: "drive.file_monitoring_removed",
        entity_type: "data_source",
        entity_id: fileId,
        description: `Removed from monitoring: ${file.file_name}`,
      });
      const rows = getDb().data_source_rows.filter((r) => r.data_source_id === fileId);
      for (const r of rows) await dataSourceService.remove("data_source_rows", r.id);
      await dataSourceService.remove("data_sources", fileId);
    }
  },

  async processRows(
    monitoredFile: DataSourceModel,
    sheetName: string,
    rows: Record<string, unknown>[],
    userId: string,
  ): Promise<void> {
    const existingRows = getDb().data_source_rows.filter(
      (r) => r.data_source_id === monitoredFile.id && r.sheet_name === sheetName,
    );
    const now = new Date().toISOString();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!;
      if (Object.keys(row).length === 0) continue;

      const rowJson = JSON.stringify(row);
      const rowHash = simpleHash(rowJson);

      const possibleIdFields = ["Invoice Number", "ID", "id", "Employee ID", "VehicleNumber"];
      let rowKey = "";
      for (const field of possibleIdFields) {
        if (row[field]) {
          rowKey = String(row[field]);
          break;
        }
      }
      if (!rowKey) rowKey = `row-${i}-${simpleHash(Object.keys(row).join(","))}`;

      const existingRow = existingRows.find(
        (e) => e.row_key === rowKey && e.sheet_name === sheetName,
      );

      if (!existingRow) {
        const newRow = {
          id: uid("dfr"),
          data_source_id: monitoredFile.id,
          sheet_name: sheetName,
          row_key: rowKey,
          row_hash: rowHash,
          first_seen_at: now,
          last_seen_at: now,
          updated_at: now,
        };
        await dataSourceService.insert("data_source_rows", newRow);
        await this.evaluateDataRow(row, rowKey, sheetName, userId, monitoredFile);
      } else if (existingRow.row_hash !== rowHash) {
        await dataSourceService.update("data_source_rows", existingRow.id, {
          row_hash: rowHash,
          last_seen_at: now,
          updated_at: now,
        });
        await this.evaluateDataRow(row, rowKey, sheetName, userId, monitoredFile);
      } else {
        await dataSourceService.update("data_source_rows", existingRow.id, {
          last_seen_at: now,
          updated_at: now,
        });
      }
    }

    const totalRowsCount = getDb().data_source_rows.filter(r => r.data_source_id === monitoredFile.id).length;
    await dataSourceService.update("data_sources", monitoredFile.id, { row_count: totalRowsCount });
  },

  async evaluateDataRow(
    rowData: Record<string, unknown>,
    rowKey: string,
    sheetName: string,
    userId: string,
    monitoredFile: DataSourceModel,
  ): Promise<void> {
    const user = getDb().users.find((u) => u.id === userId);
    await taskService.evaluateAndCreateTask({
      source: monitoredFile.file_name,
      sheet: sheetName,
      columns: Object.keys(rowData),
      row: rowData,
      source_file_id: monitoredFile.id,
      source_row_key: rowKey,
      created_by: "system",
      company_id: user?.company_id || "",
    });
  }
};
