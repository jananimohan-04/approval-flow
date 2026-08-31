import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bot, RefreshCw, Send, Sparkles, User, AlertCircle, FileSpreadsheet } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDatabase } from "@/lib/store";
import { answerQuestionFn } from "@/lib/services/aiFunctions";
import type { QAAnswer } from "@/lib/types";

export const Route = createFileRoute("/ai-assistant")({
  component: AiAssistantPage,
});

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: { file: string; sheet: string }[];
  isError?: boolean;
}

function AiAssistantPage() {
  const db = useDatabase();

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("nexus_ai_chat");
      if (saved) return JSON.parse(saved);
    }
    return [];
  });

  useEffect(() => {
    sessionStorage.setItem("nexus_ai_chat", JSON.stringify(messages));
  }, [messages]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSend(overrideQuery?: string) {
    const query = overrideQuery || input.trim();
    if (!query || loading) return;

    setInput("");
    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", content: query };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const { supabase } = await import("@/lib/supabase");
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const aiResponse: QAAnswer = await answerQuestionFn({
        data: {
          question: query,
          accessToken: token,
        },
      });

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: aiResponse.answer,
          sources: aiResponse.sources,
        },
      ]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "AI is temporarily unavailable. Please try again.",
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell
      title="AI Assistant"
      subtitle="Ask questions about your connected data sources securely"
      actions={
        <Button
          variant="outline"
          onClick={() => setMessages([])}
          disabled={loading || messages.length === 0}
        >
          <RefreshCw className="mr-2 size-4" /> Clear Chat
        </Button>
      }
    >
      <div className="flex flex-col h-[calc(100vh-12rem)] border rounded-xl overflow-hidden bg-background shadow-sm">
        {messages.length === 0 ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center justify-center text-center bg-card">
            <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mb-6 shadow-sm">
              <Bot className="size-8 text-primary" />
            </div>

            <h2 className="text-2xl font-semibold mb-2 tracking-tight">
              How can I help you today?
            </h2>
            <p className="text-muted-foreground max-w-sm mb-8">
              Argus CEU is connected to your data sources. Ask anything about your operational data
              and get instant answers with citations.
            </p>

            <div className="grid sm:grid-cols-2 gap-3 w-full max-w-2xl text-left">
              {[
                "How many pending invoices are there?",
                "What is the total amount of pending invoices?",
                "Which employees are on leave today?",
                "What is the salary of employee John?",
              ].map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(q)}
                  className="text-sm p-4 border rounded-lg hover:border-primary/50 hover:bg-muted/30 transition-all text-muted-foreground hover:text-foreground text-left shadow-sm bg-background"
                >
                  <span className="flex items-center gap-2 mb-2 text-primary font-medium">
                    <Sparkles className="size-3" /> Suggested
                  </span>
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                <div
                  className={`shrink-0 size-8 rounded-full flex items-center justify-center
                                    ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}
                                `}
                >
                  {msg.role === "user" ? <User className="size-4" /> : <Bot className="size-4" />}
                </div>
                <div
                  className={`flex flex-col max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`
                                        p-3 px-4 rounded-2xl shadow-sm text-sm
                                        ${msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : msg.isError
                          ? "bg-destructive/10 text-destructive rounded-tl-sm"
                          : "bg-card border rounded-tl-sm"
                      }
                                    `}
                  >
                    {msg.isError && <AlertCircle className="inline size-4 mr-2 -mt-0.5" />}
                    {msg.content}
                  </div>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2 text-xs text-muted-foreground flex flex-wrap gap-2">
                      <span className="font-medium">Sources:</span>
                      {msg.sources.map((s, i) => (
                        <span
                          key={i}
                          className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded-md border"
                        >
                          <FileSpreadsheet className="size-3" />
                          {s.file} → {s.sheet}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-4">
                <div className="shrink-0 size-8 rounded-full bg-muted flex items-center justify-center">
                  <Bot className="size-4 animate-pulse" />
                </div>
                <div className="p-3 px-4 rounded-2xl bg-card border rounded-tl-sm text-sm text-muted-foreground flex items-center gap-2">
                  <Sparkles className="size-3 animate-spin" /> Analyzing connected data...
                </div>
              </div>
            )}
          </div>
        )}

        <div className="p-4 border-t bg-card">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="relative max-w-4xl mx-auto flex gap-2"
          >
            <Input
              placeholder="Message Argus CEU..."
              className="pr-12 h-12 shadow-sm rounded-full bg-background"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <Button
              type="submit"
              size="icon"
              className="absolute right-1.5 top-1.5 h-9 w-9 rounded-full transition-all"
              disabled={loading || !input.trim()}
            >
              <Send className="size-4" />
            </Button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
