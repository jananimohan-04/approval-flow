import { useState } from "react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { BookOpen, Plus, Tag, Network, Edit, Trash2, MessageSquare } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

    const [modalOpen, setModalOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<AiRule | null>(null);

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

    const openCreateModal = () => {
        setEditingRule(null);
        setName("");
        setPromptInstruction("");
        setIsActive(true);
        setModalOpen(true);
    };

    const openEditModal = (rule: AiRule) => {
        setEditingRule(rule);
        setName(rule.name);
        setPromptInstruction(rule.prompt_instruction);
        setIsActive(rule.is_active);
        setModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!promptInstruction.trim()) {
            toast.error("Please provide prompt instructions.");
            return;
        }

        setLoading(true);
        try {
            if (editingRule) {
                await dataSourceService.update("ai_rules", editingRule.id, {
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
            }
            setModalOpen(false);
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
        } catch (e: any) {
            toast.error("Failed to delete rule.");
        }
    };

    return (
        <AppShell
            title="AI Rules & System Prompts"
            subtitle="Configure custom system instructions to guide how AI analyzes and routes your incoming data."
            actions={
                <Button onClick={openCreateModal}><Plus className="size-4 mr-2" /> Add Prompt Rule</Button>
            }
        >
            <div className="max-w-5xl">
                <div className="mb-6 border bg-primary/5 border-primary/20 p-4 rounded-lg flex items-start gap-4">
                    <MessageSquare className="size-5 text-primary shrink-0 mt-0.5" />
                    <div className="text-sm">
                        <h3 className="font-semibold text-primary mb-1">Custom System Instructions</h3>
                        <p className="text-muted-foreground">
                            When AI analyzes new data rows, these instructions will be automatically injected into the LLM context. Use this to teach the AI company-specific definitions, prioritization rules, or when to explicitly ignore certain types of junk data.
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    {visibleRules.map(rule => (
                        <div key={rule.id} className="border bg-card p-5 rounded-xl shadow-sm flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <h3 className="font-semibold text-lg">{rule.name}</h3>
                                    {!rule.is_active && <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30">Inactive</Badge>}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => openEditModal(rule)}>
                                        <Edit className="size-4 mr-2" /> Edit
                                    </Button>
                                    <Button variant="ghost" size="sm" className="text-red-500/70 hover:text-red-600" onClick={() => handleDelete(rule.id, rule.name)}>
                                        <Trash2 className="size-4" />
                                    </Button>
                                </div>
                            </div>

                            <div className="bg-muted/40 p-4 rounded-lg border font-mono text-sm text-foreground/80 whitespace-pre-wrap">
                                {rule.prompt_instruction}
                            </div>
                        </div>
                    ))}

                    {visibleRules.length === 0 && (
                        <div className="text-center p-12 border border-dashed rounded-xl">
                            <MessageSquare className="size-12 text-muted-foreground/30 mx-auto mb-4" />
                            <h3 className="font-medium text-lg mb-1">No Custom Instructions yet.</h3>
                            <p className="text-muted-foreground mb-4">Teach the AI your specific routing workflows by adding a prompt rule.</p>
                            <Button onClick={openCreateModal} variant="outline">Create your first rule</Button>
                        </div>
                    )}
                </div>
            </div>

            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>{editingRule ? "Edit Prompt Rule" : "Create Prompt Rule"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Rule Name</Label>
                            <Input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. High Value Invoices" />
                        </div>

                        <div className="space-y-2">
                            <Label>AI Instruction Prompt *</Label>
                            <Textarea
                                required
                                className="min-h-[150px] font-mono text-sm leading-relaxed"
                                value={promptInstruction}
                                onChange={e => setPromptInstruction(e.target.value)}
                                placeholder="e.g. If the 'Total Amount' column is over $5,000, always mark priority as 'critical' and route to the 'Finance' department."
                            />
                            <p className="text-xs text-muted-foreground">This text is directly injected into the AI system prompt during classification context.</p>
                        </div>

                        <div className="space-y-2">
                            <Label>Status</Label>
                            <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" value={isActive ? "true" : "false"} onChange={e => setIsActive(e.target.value === "true")}>
                                <option value="true">Active</option>
                                <option value="false">Inactive</option>
                            </select>
                        </div>

                        <div className="pt-4 border-t flex justify-end gap-2">
                            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save Rule"}</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </AppShell>
    );
}
