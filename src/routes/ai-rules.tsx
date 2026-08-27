import { useState } from "react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { BookOpen, Plus, Tag, Network, Edit, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useDatabase, uid } from "@/lib/store";
import { useSession } from "@/hooks/useSession";
import { dataSourceService } from "@/lib/data/dataSource";
import { toast } from "sonner";
import type { AiRule, TaskPriority } from "@/lib/types";

export const Route = createFileRoute("/ai-rules")({
    component: AiRulesPage,
});

function AiRulesPage() {
    const db = useDatabase();
    const user = useSession();

    const [modalOpen, setModalOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<AiRule | null>(null);

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [keywordInput, setKeywordInput] = useState("");
    const [keywords, setKeywords] = useState<string[]>([]);
    const [deptId, setDeptId] = useState("");
    const [priority, setPriority] = useState<TaskPriority>("medium");
    const [taskAction, setTaskAction] = useState<"create_task" | "ignore" | "manual_review">("create_task");
    const [ruleOrder, setRuleOrder] = useState<number>(1);
    const [isActive, setIsActive] = useState(true);
    const [loading, setLoading] = useState(false);

    if (user === undefined) return null;
    if (user === null) return <Navigate to="/" replace />;
    if (user.role !== "admin" && user.role !== "company_admin" && user.role !== "super_admin") return <Navigate to="/dashboard" replace />;

    const visibleRules = user.role === "super_admin"
        ? db.ai_rules
        : db.ai_rules.filter(r => r.company_id === user.company_id);

    // Sort by rule order ascending
    visibleRules.sort((a, b) => a.rule_order - b.rule_order);

    const availableDepts = user.role === "super_admin"
        ? db.departments
        : db.departments.filter(d => d.company_id === user.company_id);

    const openCreateModal = () => {
        setEditingRule(null);
        setName("");
        setDescription("");
        setKeywords([]);
        setKeywordInput("");
        setDeptId(availableDepts.length > 0 ? availableDepts[0]?.id || "" : "");
        setPriority("medium");
        setTaskAction("create_task");
        setRuleOrder(visibleRules.length > 0 ? Math.max(...visibleRules.map(r => r.rule_order)) + 1 : 1);
        setIsActive(true);
        setModalOpen(true);
    };

    const openEditModal = (rule: AiRule) => {
        setEditingRule(rule);
        setName(rule.name);
        setDescription(rule.description || "");
        setKeywords(rule.keywords || []);
        setKeywordInput("");
        setDeptId(rule.target_department_id);
        setPriority(rule.priority);
        setTaskAction(rule.task_action);
        setRuleOrder(rule.rule_order);
        setIsActive(rule.is_active);
        setModalOpen(true);
    };

    const addKeyword = () => {
        const word = keywordInput.trim().toLowerCase();
        if (word && !keywords.includes(word)) {
            setKeywords([...keywords, word]);
        }
        setKeywordInput("");
    };

    const removeKeyword = (word: string) => {
        setKeywords(keywords.filter(k => k !== word));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (keywords.length === 0) {
            toast.error("Please add at least one keyword.");
            return;
        }
        if (taskAction === "create_task" && !deptId) {
            toast.error("Please select a target department.");
            return;
        }

        setLoading(true);
        try {
            if (editingRule) {
                await dataSourceService.update("ai_rules", editingRule.id, {
                    name,
                    description,
                    keywords,
                    target_department_id: deptId,
                    priority,
                    task_action: taskAction,
                    rule_order: ruleOrder,
                    is_active: isActive,
                    updated_at: new Date().toISOString()
                });
                toast.success("AI Rule updated successfully.");
            } else {
                await dataSourceService.insert("ai_rules", {
                    id: uid("rule"),
                    company_id: user.company_id, // Pin to creator's company
                    name,
                    description,
                    keywords,
                    target_department_id: deptId,
                    priority,
                    task_action: taskAction,
                    rule_order: ruleOrder,
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
            title="AI Rules"
            subtitle="Create deterministic rules to automatically route incoming data before using AI."
            actions={
                <Button onClick={openCreateModal}><Plus className="size-4 mr-2" /> Create Rule</Button>
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
                    {visibleRules.map(rule => (
                        <div key={rule.id} className="border bg-card p-5 rounded-xl shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center">
                            <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-3">
                                    <Badge variant="secondary" className="font-mono">{rule.rule_order}</Badge>
                                    <h3 className="font-semibold text-lg">{rule.name}</h3>
                                    {!rule.is_active && <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30">Inactive</Badge>}
                                </div>
                                <p className="text-sm text-muted-foreground flex gap-2 items-start mt-2">
                                    <Tag className="size-4 shrink-0 mt-0.5 opacity-60" />
                                    <span className="leading-tight flex flex-wrap gap-1">
                                        <span className="mr-1">Keywords:</span>
                                        {rule.keywords?.map(k => (
                                            <span key={k} className="font-mono text-[11px] bg-muted px-1 py-0.5 rounded text-foreground">{k}</span>
                                        ))}
                                    </span>
                                </p>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-muted/40 rounded-lg flex items-center gap-4 min-w-[240px] shrink-0 border border-muted/50">
                                    <div className="flex flex-col items-center">
                                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Action</span>
                                        <Network className="size-5 text-primary" />
                                    </div>
                                    <div className="border-l pl-4 shrink-0">
                                        <p className="font-semibold text-foreground text-sm uppercase">
                                            {rule.task_action.replace("_", " ")}
                                        </p>
                                        {(rule.task_action === "create_task" || rule.task_action === "manual_review") && (
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {db.departments.find(d => d.id === rule.target_department_id)?.name || "Unassigned"} • <span className="capitalize">{rule.priority}</span>
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => openEditModal(rule)}>
                                        <Edit className="size-4 text-muted-foreground" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(rule.id, rule.name)}>
                                        <Trash2 className="size-4 text-red-500/70 hover:text-red-600" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {visibleRules.length === 0 && (
                        <div className="text-center p-12 border border-dashed rounded-xl">
                            <Network className="size-12 text-muted-foreground/30 mx-auto mb-4" />
                            <h3 className="font-medium text-lg mb-1">No AI Rules yet.</h3>
                            <p className="text-muted-foreground mb-4">Create a rule to automatically route incoming data from Google Drive.</p>
                            <Button onClick={openCreateModal} variant="outline">Create your first rule</Button>
                        </div>
                    )}
                </div>
            </div>

            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>{editingRule ? "Edit AI Rule" : "Create AI Rule"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2 col-span-2">
                                <Label>Rule Name</Label>
                                <Input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Pending Invoice" />
                            </div>

                            <div className="space-y-2 col-span-2">
                                <Label>Description (Optional)</Label>
                                <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Route pending invoice records to Accounts." />
                            </div>

                            <div className="space-y-2 col-span-2">
                                <Label>Keywords *</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={keywordInput}
                                        onChange={e => setKeywordInput(e.target.value)}
                                        placeholder="Add a keyword..."
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addKeyword(); } }}
                                    />
                                    <Button type="button" variant="secondary" onClick={addKeyword}>Add</Button>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {keywords.map(k => (
                                        <Badge key={k} variant="secondary" className="flex items-center gap-1 font-mono">
                                            {k}
                                            <button type="button" onClick={() => removeKeyword(k)} className="hover:text-red-500 rounded-full w-4 h-4 inline-flex items-center justify-center">&times;</button>
                                        </Badge>
                                    ))}
                                    {keywords.length === 0 && <span className="text-xs text-muted-foreground italic">Add at least one keyword</span>}
                                </div>
                            </div>

                            <div className="space-y-2 col-span-2 sm:col-span-1">
                                <Label>Task Action</Label>
                                <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" value={taskAction} onChange={e => setTaskAction(e.target.value as any)}>
                                    <option value="create_task">Create Task</option>
                                    <option value="manual_review">Require Manual Review</option>
                                    <option value="ignore">Ignore</option>
                                </select>
                            </div>

                            <div className="space-y-2 col-span-2 sm:col-span-1">
                                <Label>Priority</Label>
                                <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" value={priority} onChange={e => setPriority(e.target.value as TaskPriority)}>
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                    <option value="critical">Critical</option>
                                </select>
                            </div>

                            <div className="space-y-2 col-span-2">
                                <Label>Target Department</Label>
                                <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" value={deptId} onChange={e => setDeptId(e.target.value)} disabled={taskAction === "ignore"}>
                                    <option value="">Select a department...</option>
                                    {availableDepts.map(d => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                                {taskAction !== "ignore" && !deptId && <span className="text-[10px] text-red-500">Required if action creates a task</span>}
                            </div>

                            <div className="space-y-2 col-span-1">
                                <Label>Rule Order</Label>
                                <Input type="number" required min={1} value={ruleOrder} onChange={e => setRuleOrder(Number(e.target.value))} />
                                <span className="text-xs text-muted-foreground">Lower = Higher Priority</span>
                            </div>

                            <div className="space-y-2 col-span-1">
                                <Label>Status</Label>
                                <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" value={isActive ? "true" : "false"} onChange={e => setIsActive(e.target.value === "true")}>
                                    <option value="true">Active</option>
                                    <option value="false">Inactive</option>
                                </select>
                            </div>
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
