import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Truck, ShieldCheck, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService, DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/services/authService";
import { useSession } from "@/hooks/useSession";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign in — Vecta Logic Vehicle Approval" },
      {
        name: "description",
        content:
          "Sign in to the Vecta Logic vehicle entry and approval console: gate entries, approver routing, and voice notifications.",
      },
      { property: "og:title", content: "Sign in — Vecta Logic Vehicle Approval" },
      {
        property: "og:description",
        content:
          "Gate vehicle entries, route approvals to the right approver, and hear voice alerts in English or Tamil.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const user = useSession();
  const navigate = useNavigate();
  const [email, setEmail] = useState("entry@demo.com");
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) navigate({ to: "/dashboard", replace: true });
  }, [user, navigate]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const result = authService.signIn(email, password);
    if (result.error) {
      setError(result.error);
      return;
    }
    setError("");
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden flex-col justify-between border-r bg-sidebar p-10 lg:flex">
        <div>
          <p className="font-display text-xl font-bold tracking-tight">Vecta Logic</p>
          <p className="label-mono mt-1">Gate Approval Control · MVP</p>
        </div>
        <div className="space-y-6">
          <h2 className="max-w-sm font-display text-4xl font-bold leading-[1.05] tracking-tight">
            Every vehicle at the gate, approved by the right person.
          </h2>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-3">
              <Truck className="mt-0.5 size-4 text-primary" />
              Data entry captures the manifest at the barrier.
            </li>
            <li className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 size-4 text-primary" />
              Branch + company + vehicle type routes to a mapped approver.
            </li>
            <li className="flex items-start gap-3">
              <Volume2 className="mt-0.5 size-4 text-primary" />
              Approvers get an instant voice alert in English or Tamil.
            </li>
          </ul>
        </div>
        <p className="label-mono">
          Demo data only · Google Drive / Sheets sync pending client confirmation
        </p>
      </section>

      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <h1 className="font-display text-2xl font-bold tracking-tight">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Use a demo account below to explore each role.
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
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" className="w-full">
              Sign in
            </Button>
          </form>

          <div className="mt-6 rounded-sm border bg-surface p-3">
            <p className="label-mono">Demo accounts · password {DEMO_PASSWORD}</p>
            <div className="mt-2 space-y-1">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => {
                    setEmail(account.email);
                    setPassword(DEMO_PASSWORD);
                  }}
                  className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted"
                >
                  <span className="font-mono text-xs">{account.email}</span>
                  <span className="label-mono">{account.role}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
