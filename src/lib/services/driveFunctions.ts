import { createServerFn } from "@tanstack/react-start";
import type { DriveFolder, DriveFile } from "../types";

/**
 * Server-only Google Drive OAuth and API operations.
 *
 * All functions here execute exclusively on the server via createServerFn.
 * The GOOGLE_CLIENT_SECRET and OAuth tokens NEVER reach the browser bundle.
 *
 * Token storage: In-memory Map keyed by userId (development only).
 * Production: Replace with encrypted database table.
 */

const tokenStore = new Map<
    string,
    {
        access_token: string;
        refresh_token: string;
        token_expiry: string;
        email: string;
        scope: string;
    }
>();

// ── Environment helpers (Server-side ONLY) ─────────────────────────────
function getEnv(key: string): string {
    return (typeof process !== "undefined" && process.env?.[key]) || "";
}

function getClientId(): string {
    return getEnv("GOOGLE_CLIENT_ID");
}
function getClientSecret(): string {
    return getEnv("GOOGLE_CLIENT_SECRET");
}
function getRedirectUri(): string {
    return getEnv("GOOGLE_REDIRECT_URI") || "http://localhost:8081/auth/google/callback";
}

// ── Token helpers ──────────────────────────────────────────────────────
async function refreshAccessToken(userId: string): Promise<string | null> {
    const store = tokenStore.get(userId);
    if (!store?.refresh_token) return null;

    try {
        const res = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: getClientId(),
                client_secret: getClientSecret(),
                refresh_token: store.refresh_token,
                grant_type: "refresh_token",
            }),
        });
        if (!res.ok) return null;
        const data = (await res.json()) as { access_token: string; expires_in: number };
        store.access_token = data.access_token;
        store.token_expiry = new Date(Date.now() + data.expires_in * 1000).toISOString();
        tokenStore.set(userId, store);
        return data.access_token;
    } catch {
        return null;
    }
}

export async function getValidToken(userId: string): Promise<string | null> {
    const store = tokenStore.get(userId);
    if (!store) return null;
    if (store.access_token && new Date(store.token_expiry) > new Date()) {
        return store.access_token;
    }
    return refreshAccessToken(userId);
}

async function driveGet(token: string, url: string): Promise<Response> {
    return fetch(url, { headers: { Authorization: `Bearer ${token}` } });
}

// ── Server Functions ───────────────────────────────────────────────────

/**
 * Build the Google OAuth authorization URL (server-side so client_id
 * comes from env, not the frontend).
 */
export const getAuthUrlFn = createServerFn({ method: "POST" })
    .validator((data: { stateToken: string }) => data)
    .handler(async ({ data }) => {
        const params = new URLSearchParams({
            client_id: getClientId(),
            redirect_uri: getRedirectUri(),
            response_type: "code",
            scope: "https://www.googleapis.com/auth/drive.readonly email profile",
            access_type: "offline",
            prompt: "consent",
            state: data.stateToken,
        });
        return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` };
    });

/**
 * Exchange authorization code for tokens (server-side).
 * Returns only the Google account email — tokens stay in server memory.
 */
export const handleGoogleAuthCallbackFn = createServerFn({ method: "POST" })
    .validator((data: { code: string; userId: string }) => data)
    .handler(async ({ data }) => {
        try {
            const { code, userId } = data;

            const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    code,
                    client_id: getClientId(),
                    client_secret: getClientSecret(),
                    redirect_uri: getRedirectUri(),
                    grant_type: "authorization_code",
                }),
            });

            if (!tokenRes.ok) {
                return { success: false as const, error: "Failed to exchange authorization code." };
            }

            const tokens = (await tokenRes.json()) as {
                access_token: string;
                refresh_token?: string;
                expires_in: number;
                scope: string;
            };

            const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
                headers: { Authorization: `Bearer ${tokens.access_token}` },
            });
            const userInfo = (await userInfoRes.json()) as { email?: string };
            const email = userInfo.email ?? "unknown";

            tokenStore.set(userId, {
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token ?? "",
                token_expiry: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
                email,
                scope: tokens.scope,
            });

            return { success: true as const, email };
        } catch {
            return { success: false as const, error: "Server OAuth callback failed." };
        }
    });

/** Clear server-side tokens for a user. */
export const disconnectGoogleDriveFn = createServerFn({ method: "POST" })
    .validator((data: { userId: string }) => data)
    .handler(async ({ data }) => {
        tokenStore.delete(data.userId);
        return { success: true };
    });

/** List Google Drive folders. */
export const listGoogleFoldersFn = createServerFn({ method: "POST" })
    .validator((data: { userId: string }) => data)
    .handler(async ({ data }): Promise<{ folders: DriveFolder[] }> => {
        const token = await getValidToken(data.userId);
        if (!token) return { folders: [] };

        try {
            const q = encodeURIComponent(
                "mimeType='application/vnd.google-apps.folder' and trashed=false",
            );
            const fields = encodeURIComponent("files(id,name,mimeType,modifiedTime)");
            const res = await driveGet(
                token,
                `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&pageSize=100&orderBy=name`,
            );
            if (!res.ok) return { folders: [] };
            const d = (await res.json()) as { files: DriveFolder[] };
            return { folders: d.files ?? [] };
        } catch {
            return { folders: [] };
        }
    });

/** List Excel/Sheets files in a specific folder. */
export const listGoogleFilesInFolderFn = createServerFn({ method: "POST" })
    .validator((data: { userId: string; folderId: string }) => data)
    .handler(async ({ data }): Promise<{ files: DriveFile[] }> => {
        const token = await getValidToken(data.userId);
        if (!token) return { files: [] };

        try {
            const mimeFilter = [
                "mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'",
                "mimeType='application/vnd.ms-excel'",
                "mimeType='application/vnd.google-apps.spreadsheet'",
            ].join(" or ");
            const q = encodeURIComponent(
                `'${data.folderId}' in parents and (${mimeFilter}) and trashed=false`,
            );
            const fields = encodeURIComponent("files(id,name,mimeType,modifiedTime,size)");
            const res = await driveGet(
                token,
                `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&pageSize=100&orderBy=name`,
            );
            if (!res.ok) return { files: [] };
            const d = (await res.json()) as { files: DriveFile[] };
            return { files: d.files ?? [] };
        } catch {
            return { files: [] };
        }
    });

/** Download a Google Drive file and return it as base64. */
export const downloadGoogleFileFn = createServerFn({ method: "POST" })
    .validator((data: { userId: string; fileId: string; mimeType: string }) => data)
    .handler(
        async ({
            data,
        }): Promise<{
            success: boolean;
            error?: string;
            base64Data?: string;
            modifiedTime?: string;
        }> => {
            const token = await getValidToken(data.userId);
            if (!token) return { success: false, error: "No valid server token" };

            try {
                const metaRes = await driveGet(
                    token,
                    `https://www.googleapis.com/drive/v3/files/${data.fileId}?fields=id,name,modifiedTime,mimeType`,
                );
                if (!metaRes.ok) return { success: false, error: "Metadata fetch failed" };
                const meta = (await metaRes.json()) as { modifiedTime: string };

                const downloadUrl =
                    data.mimeType === "application/vnd.google-apps.spreadsheet"
                        ? `https://www.googleapis.com/drive/v3/files/${data.fileId}/export?mimeType=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
                        : `https://www.googleapis.com/drive/v3/files/${data.fileId}?alt=media`;

                const dlRes = await driveGet(token, downloadUrl);
                if (!dlRes.ok) return { success: false, error: "Download failed" };

                const buffer = await dlRes.arrayBuffer();
                const base64Data = Buffer.from(buffer).toString("base64");

                return { success: true, base64Data, modifiedTime: meta.modifiedTime };
            } catch (e) {
                return { success: false, error: (e as Error).message };
            }
        },
    );
