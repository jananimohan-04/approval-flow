import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Database, Network, ShieldCheck, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { AnimatedNetworkBg } from "@/components/app/AnimatedNetworkBg";

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

  if (user === undefined) {
    return (
      <div className="flex min-h-[100dvh] w-full items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <div className="size-8 animate-spin rounded-full border-4 border-white/20 border-t-white" />
          <p className="text-sm font-medium text-white/50 animate-pulse">Initializing Security...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[100dvh] w-full flex flex-col overflow-hidden bg-zinc-950 text-white font-sans">
      <AnimatedNetworkBg />

      <div className="relative z-10 flex flex-1 w-full flex-col lg:flex-row">
        {/* Left Section: Hero Content */}
        <section className="flex flex-1 flex-col justify-center p-8 lg:p-16 xl:p-24">
          <div className="mb-12 flex items-center gap-3 font-display text-2xl tracking-tight">
            <img src="/logo.jpg" alt="Argus CEO Logo" className="size-10 object-contain rounded-md" />
            <span className="font-bold">ARGUS CEO</span>
          </div>

          <div className="max-w-2xl space-y-6">
            <h1 className="font-display text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              Let AI Manage Your Entire Business.<br />
              <span className="text-[#E31837]">Automatically.</span>
            </h1>
            <p className="text-lg text-zinc-400 sm:text-xl max-w-xl leading-relaxed">
              Our AI intelligently assigns tasks, schedules work, tracks progress, and ensures your team stays on top of every task.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-4">
              <Button size="lg" className="bg-[#E31837] text-white hover:bg-[#E31837]/90 rounded-full px-8 text-base h-12 border-0">
                Get Started
              </Button>
              <Button size="lg" variant="outline" className="rounded-full px-8 text-base h-12 border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800 text-white backdrop-blur-sm">
                See How It Works
              </Button>
            </div>
          </div>
        </section>

        {/* Right Section: Login/Signup Form */}
        <section className="flex w-full items-center justify-center p-6 lg:w-[500px] xl:w-[600px]">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/40 p-8 backdrop-blur-xl shadow-2xl">
            <h2 className="font-display text-2xl font-bold tracking-tight text-center mb-6 text-white">
              Sign in to Workspace
            </h2>

            <Button
              type="button"
              variant="outline"
              className="w-full relative py-6 bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white"
              disabled={isSubmitting}
              onClick={handleGoogleLogin}
            >
              <svg className="absolute left-4 size-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                <path d="M1 1h22v22H1z" fill="none" />
              </svg>
              {isSubmitting ? "Connecting..." : "Continue with Google"}
            </Button>

            <p className="mt-6 text-xs text-zinc-500 max-w-[16rem] mx-auto text-center">
              (Google OAuth requires manual cloud console setup to activate fully.)
            </p>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-white/10 bg-black/40 backdrop-blur-xl py-4 px-6 sm:px-12 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-zinc-400">
        <div className="flex items-center gap-3">
          <img src="/logo.jpg" alt="Argus Purchase Suite Logo" className="size-6 object-contain rounded-sm" />
          <span className="font-semibold text-white">Argus Purchase Suite</span>
        </div>
        <div>
          © 2026 arguscnc.com All Rights Reserved.
        </div>
      </footer>
    </div>
  );
}

