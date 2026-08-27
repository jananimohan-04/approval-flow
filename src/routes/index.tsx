import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Database, Network, ShieldCheck, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  component: LoginPage,
});

function LoginPage() {
  const user = useSession();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [user, navigate]);

  async function handleGoogleLogin() {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });
      if (error) throw error;
    } catch (e: any) {
      toast.error(e.message || "Something went wrong.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-zinc-950 p-10 text-white lg:flex">
        <div className="flex items-center gap-2 font-display text-xl tracking-tight">
          <span className="flex size-8 items-center justify-center rounded-md bg-white font-bold text-zinc-950">
            N
          </span>
          NEXUS AI
        </div>
        <div className="space-y-6">
          <h2 className="max-w-sm font-display text-4xl font-bold leading-[1.05] tracking-tight">
            Automate your daily workflows.
          </h2>
          <ul className="space-y-3 text-sm text-zinc-400">
            <li className="flex items-start gap-3">
              <Database className="mt-0.5 size-4 text-emerald-400 shrink-0" />
              Automatically monitor Google Drive spreadsheets for new information.
            </li>
            <li className="flex items-start gap-3">
              <Network className="mt-0.5 size-4 text-emerald-400 shrink-0" />
              Let AI instantly route new tasks and data to the right departments.
            </li>
            <li className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 size-4 text-emerald-400 shrink-0" />
              Keep all company data private, secure, and perfectly organized.
            </li>
          </ul>
        </div>
        <p className="font-mono text-xs text-zinc-500 uppercase tracking-widest">
          Nexus AI Platform
        </p>
      </section>

      <section className="flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm text-center">
          <h1 className="font-display text-2xl font-bold tracking-tight">Sign in</h1>

          <div className="mt-8">
            <Button
              type="button"
              variant="outline"
              className="w-full relative py-6"
              disabled={isSubmitting}
              onClick={handleGoogleLogin}
            >
              <svg className="absolute left-4 size-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
                <path d="M1 1h22v22H1z" fill="none" />
              </svg>
              {isSubmitting ? "Connecting..." : "Continue with Google"}
            </Button>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            Use the Google account registered by your administrator.
          </p>
        </div>
      </section>
    </div>
  );
}
