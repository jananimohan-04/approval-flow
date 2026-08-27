import { useState } from "react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { MessageSquare, Edit, Trash2, PlusCircle, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDatabase, uid } from "@/lib/store";
import { useSession } from "@/hooks/useSession";
import { dataSourceService } from "@/lib/data/dataSource";
import { toast } from "sonner";
import type { AiRule } from "@/lib/types";

export const Route = createFileRoute("/ai-rules")({
    component: AiRulesPage,
});

function AiRulesPage() {
    const db = useDatabase();
    const user = useSession();

    const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
    const [name, setName] = useState("");
    const [promptInstruction, setPromptInstruction] = useState("");
    const [isActive, setIsActive] = useState(true);
    const [loading, setLoading] = useState(false);

    if (user === undefined) return null;
    if (user === null) return <Navigate to="/" replace />;
    if (user.role !== "admin" && user.role !== "company_admin" && user.role !== "super_admin") return <Navigate to="/dashboard" replace />;

    const visibleRules = user.role === "super_admin"
        ? db.ai_rules
        : db.ai_rules.filter(r => r.company_id === user.company_id);

    const handleNewRule = () => {
        setEditingRuleId(null);
        setName("");
        setPromptInstruction("");
        setIsActive(true);
    };

    const handleEditRule = (rule: AiRule) => {
        setEditingRuleId(rule.id);
        setName(rule.name);
        setPromptInstruction(rule.prompt_instruction);
        setIsActive(rule.is_active);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!promptInstruction.trim()) {
            toast.error("Please provide prompt instructions.");
            return;
        }

        setLoading(true);
        try {
            if (editingRuleId) {
                await dataSourceService.update("ai_rules", editingRuleId, {
                    name,
                    prompt_instruction: promptInstruction,
                    is_active: isActive,
                    updated_at: new Date().toISOString()
                });
                toast.success("AI Rule updated successfully.");
            } else {
                await dataSourceService.insert("ai_rules", {
                    id: uid("rule"),
                    company_id: user.company_id,
                    name,
                    prompt_instruction: promptInstruction,
                    is_active: isActive,
                    created_by: user.id,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                } as any);
                toast.success("AI Rule created successfully.");
                handleNewRule();
            }
        } catch (e: any) {
            toast.error(e.message || "Failed to save rule.");
        }
        setLoading(false);
    };

    const handleDelete = async (ruleId: string, ruleName: string) => {
        if (!confirm(`Are you sure you want to delete "${ruleName}"?\n\nThis cannot be undone.`)) return;
        try {
            await dataSourceService.remove("ai_rules", ruleId);
            toast.success("AI Rule deleted.");
            if (editingRuleId === ruleId) {
                handleNewRule();
            }
        } catch (e: any) {
            toast.error("Failed to delete rule.");
        }
    };

    return (
        <AppShell
            title="AI Rules & System Prompts"
            subtitle="Configure custom system instructions to guide how AI analyzes and routes your incoming data."
        >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl">
                {/* Left Side: Form */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                    <div className="border bg-primary/5 border-primary/20 p-4 rounded-lg flex items-start gap-4">
                        <MessageSquare className="size-5 text-primary shrink-0 mt-0.5" />
                        <div className="text-sm">
                            <h3 className="font-semibold text-primary mb-1">Custom System Instructions</h3>
                            <p className="text-muted-foreground">
                                These instructions will be injected directly into the LLM context when Nexus AI evaluates rows for this company. You can define priorities, custom mapping logic, or explicitly ignore junk data.
                            </p>
                        </div>
                    </div>

                    <div className="border bg-card rounded-xl shadow-sm p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-semibold">
                                {editingRuleId ? "Edit AI Rule" : "Create New AI Rule"}
                            </h2>
                            {editingRuleId && (
                                <Button variant="outline" size="sm" onClick={handleNewRule}>
                                    <PlusCircle className="size-4 mr-2" /> Add New instead
                                </Button>
                            )}
                        </div>

                        <form onSubmit={handleSave} className="space-y-5">
                            <div className="space-y-2">
                                <Label>Rule Name</Label>
                                <Input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. High Value Invoices to Finance" />
                            </div>

                            <div className="space-y-2">
                                <Label>AI Instruction Prompt *</Label>
                                <Textarea
                                    required
                                    className="min-h-[250px] font-mono text-sm leading-relaxed"
                                    value={promptInstruction}
                                    onChange={e => setPromptInstruction(e.target.value)}
                                    placeholder="e.g. If the 'Total Amount' column is over $5,000, always mark priority as 'critical' and route to the 'Finance' department."
                                />
                                <p className="text-xs text-muted-foreground">This exact text is bundled with the AI's internal logic during analysis.</p>
                            </div>

                            <div className="space-y-2">
                                <Label>Status</Label>
                                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring" value={isActive ? "true" : "false"} onChange={e => setIsActive(e.target.value === "true")}>
                                    <option value="true">Active & Running</option>
                                    <option value="false">Paused / Inactive</option>
                                </select>
                            </div>

                            <div className="pt-4 border-t flex justify-end">
                                <Button type="submit" disabled={loading} size="lg" className="w-full sm:w-auto">
                                    {loading ? "Saving..." : editingRuleId ? "Update Rule" : "Save New Rule"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Right Side: Saved Rules List */}
                <div className="lg:col-span-4 flex flex-col gap-4">
                    <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Your Saved Rules ({visibleRules.length})</h3>

                    <div className="flex flex-col gap-3">
                        {visibleRules.length === 0 ? (
                            <div className="border border-dashed p-6 text-center rounded-xl bg-muted/10 text-muted-foreground text-sm">
                                You haven't added any instructions yet.
                            </div>
                        ) : (
                            visibleRules.map(rule => (
                                <div
                                    key={rule.id}
                                    className={`border rounded-lg p-4 transition-all relative overflow-hidden group hover:border-primary/50 ${editingRuleId === rule.id ? 'border-primary shadow-sm bg-primary/5' : 'bg-card'}`}
                                >
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-medium text-sm text-foreground line-clamp-1">{rule.name}</h4>
                                                {editingRuleId === rule.id && <CheckCircle2 className="size-3.5 text-primary" />}
                                            </div>
                                            {!rule.is_active && (
                                                <Badge variant="outline" className="text-[10px] py-0 h-4 border-muted-foreground/30 text-muted-foreground w-fit">Inactive</Badge>
                                            )}
                                        </div>
                                    </div>

                                    <div className="text-xs text-muted-foreground font-mono line-clamp-3 mb-4">
                                        {rule.prompt_instruction}
                                    </div>

                                    <div className="flex items-center gap-2 border-t pt-3 mt-auto">
                                        <Button type="button" variant="secondary" size="sm" className="h-7 text-xs flex-1" onClick={() => handleEditRule(rule)}>
                                            <Edit className="size-3 mr-1.5" /> Edit
                                        </Button>
                                        <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:bg-destructive/10" onClick={() => handleDelete(rule.id, rule.name)}>
                                            <Trash2 className="size-3" />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </AppShell>
    );
}
