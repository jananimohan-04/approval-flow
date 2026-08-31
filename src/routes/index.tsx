import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Database, Network, ShieldCheck, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { signUpCompanyFn } from "@/lib/services/signUpService";

export const Route = createFileRoute("/")({
  component: LoginPage,
});

function LoginPage() {
  const user = useSession();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  // Dev Fallback state
  const [email, setEmail] = useState("admin@demo.com");
  const [password, setPassword] = useState("password123");
  const [companyName, setCompanyName] = useState("");
  const [gstNumber, setGstNumber] = useState("");

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

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;
      toast.success("Login successful!");
      // The useSession hook will catch this and route automatically
    } catch (e: any) {
      toast.error(e.message || "Invalid credentials");
      setIsSubmitting(false);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await signUpCompanyFn({ data: { companyName, gstNumber, email, password } });
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;
      toast.success("Account created successfully!");
    } catch (e: any) {
      toast.error(e.message || "Failed to sign up");
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
    <div className="grid min-h-[100dvh] w-full lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-zinc-950 p-10 text-white lg:flex">
        <div className="flex items-center gap-2 font-display text-xl tracking-tight">
          ARGUS CEO
        </div>
        <div className="space-y-6">
          <h2 className="max-w-sm font-display text-4xl font-bold leading-[1.05] tracking-tight">
            Automate your daily workflows.
          </h2>
          <ul className="space-y-3 text-sm text-zinc-400">
            <li className="flex items-start gap-3">
              <Network className="mt-0.5 size-4 text-emerald-400 shrink-0" />
              AI will assign tasks to your teams.
            </li>
          </ul>
        </div>
        <p className="font-mono text-xs text-zinc-500 uppercase tracking-widest">
          Argus CEO Platform
        </p>
      </section>

      <section className="flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm text-center">
          <h1 className="font-display text-2xl font-bold tracking-tight">Sign in</h1>

          <div className="mt-8">
            <h1 className="font-display text-2xl font-bold tracking-tight text-center mb-6">
              {isSignUp ? "Create an Account" : "Sign in"}
            </h1>
            {!isSignUp && (
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
                {isSubmitting && !showEmailLogin ? "Connecting..." : "Continue with Google"}
              </Button>
            )}
          </div>

          {!isSignUp && (
            <div className="relative mt-8">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with email
                </span>
              </div>
            </div>
          )}

          {!showEmailLogin && !isSignUp ? (
            <Button
              variant="ghost"
              className="w-full mt-4 text-xs text-muted-foreground"
              onClick={() => setShowEmailLogin(true)}
            >
              Use Developer Password Bypass
            </Button>
          ) : (
            <form onSubmit={isSignUp ? handleSignUp : handleEmailLogin} className="mt-4 space-y-4 text-left">
              {isSignUp && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      type="text"
                      value={companyName}
                      onChange={e => setCompanyName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gstNumber">GST Number</Label>
                    <Input
                      id="gstNumber"
                      type="text"
                      value={gstNumber}
                      onChange={e => setGstNumber(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (isSignUp ? "Creating account..." : "Signing in...") : (isSignUp ? "Sign Up" : "Sign in securely")}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Button
              variant="link"
              className="text-xs text-muted-foreground"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setShowEmailLogin(true);
              }}
            >
              {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
            </Button>
          </div>

          <p className="mt-6 text-xs text-muted-foreground/60 max-w-[16rem] mx-auto">
            (Google OAuth requires manual cloud console setup to activate fully.)
          </p>
        </div>
      </section>
    </div>
  );
}
