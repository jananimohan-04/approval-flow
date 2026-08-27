import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/hooks/useSession";
import { googleDriveService } from "@/lib/services/googleDriveService";
import { handleGoogleAuthCallbackFn } from "@/lib/services/driveFunctions";

/**
 * Google OAuth callback handler.
 *
 * Google redirects here with ?code=...&state=... after the user authorizes.
 * The authorization code is sent to the server via createServerFn where
 * the code-to-token exchange happens securely. The client secret and
 * tokens never reach the browser.
 *
 * Flow:
 *   Google → Browser (this page) → Server (driveServer.ts) → Google Token API
 *   → Tokens stored in server memory → Browser receives only connection metadata
 */

export const Route = createFileRoute("/auth/google/callback")({
  component: GoogleCallbackPage,
});

function GoogleCallbackPage() {
  const user = useSession();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [errorMsg, setErrorMsg] = useState("");
  const [sessionReady, setSessionReady] = useState(false);

  // Wait for session to initialize (useSession is async on page load)
  useEffect(() => {
    if (user) {
      setSessionReady(true);
      return;
    }
    // Give session up to 5 seconds to load after redirect
    const timeout = setTimeout(() => {
      setSessionReady(true); // Mark ready even if null — will show error
    }, 5000);
    return () => clearTimeout(timeout);
  }, [user]);

  useEffect(() => {
    if (!sessionReady) return; // Wait for session to load

    async function process() {
      if (!user) {
        setStatus("error");
        setErrorMsg("You must be logged in to connect Google Drive.");
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const error = params.get("error");
      const state = params.get("state");

      if (error) {
        setStatus("error");
        setErrorMsg(
          error === "access_denied"
            ? "You denied access to Google Drive."
            : `Google OAuth error: ${error}`,
        );
        return;
      }

      if (!code) {
        setStatus("error");
        setErrorMsg("No authorization code received from Google.");
        return;
      }

      // Validate state (CSRF protection)
      const savedState = sessionStorage.getItem("google_oauth_state");
      if (state && savedState && state !== savedState) {
        setStatus("error");
        setErrorMsg("Invalid OAuth state. Please try again.");
        return;
      }
      sessionStorage.removeItem("google_oauth_state");

      // Exchange code for tokens on the server (secret never reaches browser)
      const result = await handleGoogleAuthCallbackFn({ data: { code, userId: user.id } });

      if (result.success) {
        // Save connection metadata locally alongside persistent tokens
        const conn = await googleDriveService.saveConnection(
          user.id,
          result.email ?? "unknown",
          result.access_token,
          result.refresh_token,
          result.token_expiry,
          result.scope
        );
        setStatus("success");
        toast.success("Google Drive connected successfully!", {
          description: `Connected as ${conn.google_account_email}`,
        });
        // Redirect to data-sources page
        setTimeout(() => {
          navigate({ to: "/data-sources" });
        }, 1500);
      } else {
        setStatus("error");
        setErrorMsg(result.error ?? "Unknown error occurred.");
      }
    }

    process();
  }, [sessionReady, user, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        {status === "processing" && (
          <>
            <Loader2 className="mx-auto size-10 animate-spin text-primary" />
            <h2 className="mt-4 text-xl font-semibold">Connecting Google Drive...</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Exchanging authorization code. Please wait.
            </p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-success/10">
              <span className="text-3xl">✓</span>
            </div>
            <h2 className="mt-4 text-xl font-semibold text-success">Connected!</h2>
            <p className="mt-2 text-sm text-muted-foreground">Redirecting to admin panel...</p>
          </>
        )}
        {status === "error" && (
          <>
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-danger/10">
              <span className="text-3xl">✕</span>
            </div>
            <h2 className="mt-4 text-xl font-semibold text-danger">Connection Failed</h2>
            <p className="mt-2 text-sm text-muted-foreground">{errorMsg}</p>
            <button
              className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              onClick={() => navigate({ to: "/data-sources" })}
            >
              Back to Admin
            </button>
          </>
        )}
      </div>
    </div>
  );
}
