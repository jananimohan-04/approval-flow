import { createFileRoute, Navigate } from "@tanstack/react-router";
import { BookOpen, Plus, Tag, Network } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDatabase } from "@/lib/store";
import { useSession } from "@/hooks/useSession";

export const Route = createFileRoute("/ai-rules")({
    component: AiRulesPage,
});

function AiRulesPage() {
    const db = useDatabase();
    const user = useSession();

    if (!user) return null;
    if (user.role !== "admin") return <Navigate to="/dashboard" replace />;

    return (
        <AppShell
            title="AI Rules & Mapping"
            subtitle="Configure how Nexus AI automatically routes parsed data"
            actions={
                <Button><Plus className="size-4 mr-2" /> Create Rule</Button>
            }
        >
            <div className="max-w-5xl">
                <div className="mb-6 border bg-primary/5 border-primary/20 p-4 rounded-lg flex items-start gap-4">
                    <BookOpen className="size-5 text-primary shrink-0 mt-0.5" />
                    <div className="text-sm">
                        <h3 className="font-semibold text-primary mb-1">Decision Hierarchy</h3>
                        <p className="text-muted-foreground">
                            Nexus AI routes data in this exact order: <strong>1. Explicit Admin Rule</strong> → <strong>2. Department Context</strong> → <strong>3. AI Inference Inference</strong>.
                            Rules defined here take absolute precedence over generative AI decisions.
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    {db.ai_rules.map(rule => (
                        <div key={rule.id} className="border bg-card p-5 rounded-xl shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center">
                            <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-3">
                                    <h3 className="font-semibold text-lg">{rule.name}</h3>
                                    {!rule.active && <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30">Inactive</Badge>}
                                </div>
                                <p className="text-sm text-muted-foreground flex gap-2 items-start mt-2">
                                    <Tag className="size-4 shrink-0 mt-0.5 opacity-60" />
                                    <span className="leading-tight">
                                        Keywords: <span className="font-mono text-[11px] bg-muted px-1 py-0.5 rounded text-foreground">{rule.keywords}</span>
                                    </span>
                                </p>
                                {rule.source_conditions && (
                                    <p className="text-sm text-muted-foreground flex gap-2 items-center">
                                        <BookOpen className="size-4 opacity-60" />
                                        Match Files containing: <span className="font-mono text-[11px] bg-muted px-1 rounded text-foreground">{rule.source_conditions}</span>
                                    </p>
                                )}
                            </div>

                            <div className="w-full md:w-auto p-4 bg-muted/40 rounded-lg flex items-center gap-4 min-w-[250px] shrink-0 border border-muted/50">
                                <div className="flex flex-col items-center">
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Routes To</span>
                                    <Network className="size-5 text-primary" />
                                </div>
                                <div className="border-l pl-4 shrink-0">
                                    <p className="font-semibold text-foreground text-sm">{db.departments.find(d => d.id === rule.target_department_id)?.name || "Unassigned"}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5 capitalize">{rule.priority} Priority Task</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </AppShell>
    );
}
