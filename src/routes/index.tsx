import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Network, Database, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/lib/services/authService";
import { useSession } from "@/hooks/useSession";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign in — Nexus AI Operations" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const user = useSession();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [user, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    const result = await authService.signIn(email, password);
    setIsSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden flex-col justify-between border-r bg-sidebar p-10 lg:flex">
        <div>
          <p className="font-display text-xl font-bold tracking-tight">Nexus AI Ops</p>
          <p className="label-mono mt-1">Intelligent Operations & Routing</p>
        </div>
        <div className="space-y-6">
          <h2 className="max-w-sm font-display text-4xl font-bold leading-[1.05] tracking-tight">
            Streamline operational tasks seamlessly.
          </h2>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-3">
              <Database className="mt-0.5 size-4 text-primary shrink-0" />
              Connected Google Drive documents and folders serve as active data sources.
            </li>
            <li className="flex items-start gap-3">
              <Network className="mt-0.5 size-4 text-primary shrink-0" />
              Custom rules and contextual LLMs classify incoming payload rows to authorized departments.
            </li>
            <li className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 size-4 text-primary shrink-0" />
              Row Level Security ensures strict isolation at the postgres database layer.
            </li>
          </ul>
        </div>
        <p className="label-mono">
          Powered by Supabase · Auth & PostgreSQL
        </p>
      </section>

      <section className="flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm">
          <h1 className="font-display text-2xl font-bold tracking-tight">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your email and password to access your dashboard.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="font-mono text-sm"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="font-mono text-sm"
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin size-4 mr-2" /> : null}
              Sign in
            </Button>
          </form>

          {/* Demo users list removed */}
        </div>
      </section>
    </div>
  );
}
