import { useState } from "react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { Loader2, Plus, RefreshCw, Folder, FileSpreadsheet, Trash2, Database } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useSession } from "@/hooks/useSession";
import { useDatabase, uid } from "@/lib/store";
import { googleDriveService } from "@/lib/services/googleDriveService";
import {
    getAuthUrlFn,
    disconnectGoogleDriveFn,
    listGoogleFoldersFn,
    listGoogleFilesInFolderFn,
    downloadGoogleFileFn,
} from "@/lib/services/driveFunctions";
import { dataSourceService } from "@/lib/data/dataSource";
import type { DriveFolder, DriveFile } from "@/lib/types";

export const Route = createFileRoute("/data-sources")({
    component: DataSourcesPage,
});

function DataSourcesPage() {
    const user = useSession();
    if (user === undefined) return null;
    if (user === null) return <Navigate to="/" replace />;
    if (user.role !== "admin" && user.role !== "company_admin" && user.role !== "super_admin") return <Navigate to="/dashboard" replace />;
    const db = useDatabase();

    const [loadingFolders, setLoadingFolders] = useState(false);
    const [folders, setFolders] = useState<DriveFolder[]>([]);
    const [loadingFiles, setLoadingFiles] = useState(false);
    const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
    const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
    const [checking, setChecking] = useState(false);

    if (user === undefined) return null;
    if (user === null) return <Navigate to="/" replace />;

    const connection = db.google_drive_connections.find((c) => c.user_id === user.id && c.status === "connected");
    const monitoredFiles = db.data_sources;

    // ── Handlers ──

    const handleConnect = async () => {
        const state = uid("state");
        sessionStorage.setItem("google_oauth_state", state);
        const result = await getAuthUrlFn({ data: { stateToken: state } });
        window.location.href = result.url;
    };

    const handleDisconnect = async () => {
        await disconnectGoogleDriveFn({ data: { userId: user.id } });
        googleDriveService.disconnect(user.id);
        setFolders([]);
        setDriveFiles([]);
        toast.success("Google Drive disconnected.");
    };

    const handleBrowseFolders = async () => {
        if (!connection) return;
        setLoadingFolders(true);
        if (connection.google_account_email.startsWith("mock-drive-")) {
            setTimeout(() => {
                setFolders([
                    { id: "mock_f1", name: "Mock Invoices Q3", mimeType: "folder" } as any,
                    { id: "mock_f2", name: "HR Employee Data", mimeType: "folder" } as any,
                ]);
                setLoadingFolders(false);
            }, 600);
            return;
        }
        try {
            const res = await listGoogleFoldersFn({ data: { userId: user.id } });
            setFolders(res.folders || []);
            if (!res.folders || res.folders.length === 0) toast.info("No folders found");
        } catch {
            toast.error("Failed to fetch folders");
        }
        setLoadingFolders(false);
    };

    const handleSelectFolder = async (folder: DriveFolder) => {
        googleDriveService.selectFolder(user.id, folder.id, folder.name);
        toast.success(`Selected folder: ${folder.name}`);
        setLoadingFiles(true);
        if (connection?.google_account_email.startsWith("mock-drive-")) {
            setTimeout(() => {
                setDriveFiles([
                    { id: "mock_file_1", name: "Dummy Data_Transactions.xlsx", mimeType: "application/vnd.google-apps.spreadsheet" } as any,
                    { id: "mock_file_2", name: "Employee_Roster_2026.xlsx", mimeType: "application/vnd.google-apps.spreadsheet" } as any,
                ]);
                setLoadingFiles(false);
            }, 600);
            return;
        }
        try {
            const res = await listGoogleFilesInFolderFn({ data: { userId: user.id, folderId: folder.id } });
            setDriveFiles(res.files || []);
        } catch {
            toast.error("Failed to fetch files");
        }
        setLoadingFiles(false);
    };

    const toggleFileSelection = (fileId: string) => {
        setSelectedFileIds((prev) => {
            const next = new Set(prev);
            next.has(fileId) ? next.delete(fileId) : next.add(fileId);
            return next;
        });
    };

    const handleSaveMonitoring = () => {
        if (!connection) return;
        const filesToSave = driveFiles.filter((f) => selectedFileIds.has(f.id));
        googleDriveService.saveMonitoredFiles(
            user.id,
            connection.id,
            connection.selected_folder_id ?? "",
            filesToSave,
        );
        setSelectedFileIds(new Set());
        toast.success(`${filesToSave.length} data source(s) connected.`);
    };

    const handleCheckNow = async () => {
        setChecking(true);
        if (connection?.google_account_email.startsWith("mock-drive-")) {
            setTimeout(() => {
                toast.success("Mock sync complete! No actual tables processed.");
                setChecking(false);
            }, 800);
            return;
        }
        const files = db.data_sources.filter((f) => f.enabled);
        let processed = 0;
        const errors: string[] = [];

        for (const file of files) {
            try {
                const now = new Date().toISOString();
                dataSourceService.update("data_sources", file.id, { last_synced_at: now, updated_at: now });

                const dlRes = await downloadGoogleFileFn({
                    data: { userId: user.id, fileId: file.google_file_id, mimeType: file.mime_type! },
                });

                if (!dlRes.success) {
                    errors.push(`Error downloading ${file.file_name}: ${dlRes.error}`);
                    continue;
                }

                if (file.last_modified_at && dlRes.modifiedTime! <= file.last_modified_at) {
                    continue;
                }

                const binaryString = window.atob(dlRes.base64Data!);
                const len = binaryString.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);

                const XLSX = await import("xlsx");
                const workbook = XLSX.read(bytes, { type: "array" });

                for (const sheetName of workbook.SheetNames) {
                    const sheet = workbook.Sheets[sheetName];
                    if (!sheet) continue;
                    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { blankrows: false, defval: "" });
                    googleDriveService.processRows(file, sheetName, rows, user.id);
                }

                dataSourceService.update("data_sources", file.id, {
                    last_modified_at: dlRes.modifiedTime ?? null,
                    updated_at: now,
                });
                processed++;
            } catch (err) {
                errors.push(`Error processing ${file.file_name}: ${(err as Error).message}`);
            }
        }

        if (processed > 0) toast.success(`Processed ${processed} updated source(s).`);
        else if (errors.length === 0) toast.info("Data sources are up to date.");
        for (const err of errors) toast.error(err);
        setChecking(false);
    };

    return (
        <AppShell
            title="Data Sources"
            subtitle="Connect Google Drive folders and Excel files for AI analysis"
            actions={
                <Button onClick={handleCheckNow} disabled={checking}>
                    {checking ? <Loader2 className="mr-2 size-4 animate-spin" /> : <RefreshCw className="mr-2 size-4" />}
                    Sync Now
                </Button>
            }
        >
            <div className="space-y-6 max-w-4xl">
                <div className="rounded-lg border bg-card p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-lg font-semibold">Google Drive Connection</h2>
                            <p className="text-sm text-muted-foreground mt-1">Connect your Google Workspace to empower AI data analysis.</p>
                        </div>
                        {connection ? (
                            <Button variant="destructive" size="sm" onClick={handleDisconnect}>Disconnect</Button>
                        ) : (
                            <div className="flex gap-2">
                                <Button onClick={handleConnect}>Connect Google Drive</Button>
                                <Button variant="outline" onClick={async () => {
                                    try {
                                        await dataSourceService.insert("google_drive_connections" as any, {
                                            id: crypto.randomUUID(),
                                            company_id: user.company_id,
                                            user_id: user.id,
                                            google_account_email: `mock-drive-${user.email}`,
                                            created_at: new Date().toISOString()
                                        } as any);
                                        toast.success("Bypassed Google Drive via mock connection!");
                                    } catch (e: any) {
                                        toast.error(e.message);
                                    }
                                }}>Developer Bypass</Button>
                            </div>
                        )}
                    </div>

                    {connection && (
                        <div className="border-t pt-4">
                            <p className="text-sm font-medium">Connected Account: <span className="text-muted-foreground">{connection.google_account_email}</span></p>

                            <div className="mt-6 flex flex-col sm:flex-row gap-4">
                                <div className="flex-1 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-semibold text-muted-foreground uppercase">1. Select Data Folder</h3>
                                        <Button variant="outline" size="sm" onClick={handleBrowseFolders} disabled={loadingFolders}>
                                            {loadingFolders ? <Loader2 className="mr-2 size-3 animate-spin" /> : <Folder className="mr-2 size-3" />} Browse
                                        </Button>
                                    </div>

                                    {folders.length > 0 && (
                                        <div className="rounded border divide-y max-h-48 overflow-auto">
                                            {folders.map((f) => (
                                                <div key={f.id} className="flex items-center justify-between p-2 hover:bg-muted/50 cursor-pointer" onClick={() => handleSelectFolder(f)}>
                                                    <div className="flex items-center gap-2 text-sm"><Folder className="size-4 text-primary" /> {f.name}</div>
                                                    {connection.selected_folder_id === f.id && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Selected</span>}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {connection.selected_folder_name && folders.length === 0 && (
                                        <p className="text-sm border p-3 rounded bg-muted/20">Selected: <span className="font-semibold">{connection.selected_folder_name}</span></p>
                                    )}
                                </div>

                                <div className="flex-1 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-semibold text-muted-foreground uppercase">2. Select Data Sources</h3>
                                        {selectedFileIds.size > 0 && (
                                            <Button size="sm" onClick={handleSaveMonitoring}>
                                                <Plus className="mr-2 size-3" /> Add {selectedFileIds.size} Sources
                                            </Button>
                                        )}
                                    </div>

                                    {loadingFiles ? (
                                        <div className="flex justify-center p-4"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
                                    ) : driveFiles.length > 0 ? (
                                        <div className="rounded border divide-y max-h-48 overflow-auto">
                                            {driveFiles.map((f) => {
                                                const isMonitored = monitoredFiles.some((mf) => mf.google_file_id === f.id);
                                                return (
                                                    <div key={f.id} className="flex items-center gap-3 p-2 hover:bg-muted/50 transition-colors">
                                                        <Checkbox
                                                            checked={selectedFileIds.has(f.id)}
                                                            onCheckedChange={() => toggleFileSelection(f.id)}
                                                            disabled={isMonitored}
                                                        />
                                                        <FileSpreadsheet className="size-4 text-emerald-600" />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm truncate">{f.name}</p>
                                                        </div>
                                                        {isMonitored && <span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded flex-shrink-0">Active</span>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground italic border p-3 rounded">No spreadsheets found in folder.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-3">
                    <h2 className="text-lg font-semibold">Active Data Sources</h2>

                    {monitoredFiles.length === 0 ? (
                        <div className="text-center py-10 border rounded-lg bg-card/50 text-muted-foreground">
                            <Database className="mx-auto size-10 opacity-20 mb-3" />
                            <p>No active data sources.</p>
                            <p className="text-sm">Connect Google Drive and select a folder to begin.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {monitoredFiles.map((f) => (
                                <div key={f.id} className="border bg-card rounded-lg p-4 flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <FileSpreadsheet className="size-5 text-emerald-600" />
                                                <span className="font-medium truncate" title={f.file_name}>{f.file_name}</span>
                                            </div>
                                            <div className={`size-2 rounded-full ${f.enabled ? 'bg-success' : 'bg-muted-foreground'}`} title={f.enabled ? "Active" : "Disabled"}></div>
                                        </div>
                                        <p className="text-xs text-muted-foreground">Folder ID: {f.google_folder_id?.slice(0, 8)}...</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Last Synced: {f.last_synced_at ? new Date(f.last_synced_at).toLocaleTimeString() : "Never"}
                                        </p>
                                    </div>
                                    <div className="mt-4 flex justify-end">
                                        <Button variant="ghost" size="sm" className="text-danger hover:text-danger hover:bg-danger/10" onClick={() => googleDriveService.removeMonitoredFile(f.id)}>
                                            <Trash2 className="size-4 mr-2" /> Remove
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AppShell>
    );
}
