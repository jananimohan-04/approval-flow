import { createServerFn } from "@tanstack/react-start";
import { QAAnswer, ClassificationResult } from "../types";
import { getSecureServerSupabase, executeStructuredQuery, StructuredQuery, QueryResult } from "./dataQueryService";

export const classifyRowFn = createServerFn({ method: "POST" })
    .validator((data: {
        source: string;
        sheet: string;
        columns: string[];
        row: Record<string, unknown>;
        departments: string[];
        customPrompts?: string[];
    }) => data)
    .handler(async ({ data }) => {
        try {
            const apiKey = process.env["OPENAI_API_KEY"] || (import.meta as any).env?.OPENAI_API_KEY || (import.meta as any).env?.VITE_OPENAI_API_KEY;
            if (!apiKey) {
                throw new Error("AI provider API key is not configured.");
            }

            const customInstructionStr = data.customPrompts && data.customPrompts.length > 0
                ? `\n\n=== CUSTOM TARGET INSTRUCTIONS ===\nThe Admin has provided you with the following strict rules. You MUST obey these instructions above all default behavior:\n${data.customPrompts.map(p => `- ${p}`).join("\n")}`
                : "";

            const response = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: process.env["AI_MODEL"] || "gpt-4o-mini",
                    response_format: { type: "json_object" },
                    temperature: 0.1,
                    messages: [
                        {
                            role: "system",
                            content: `You are an AI tasked with evaluating a row of data imported from a spreadsheet (${data.source} - ${data.sheet}).
Analyze the payload. Decide if this row requires actionable work (e.g. follow-up, approval, data entry). If it's a completely empty, junk, or non-actionable header row, set is_actionable=false.
If actionable, classify it into EXACTLY ONE of the provided departments.
Provide a clear task_title and a short task_description summarizing what needs to be done.
Estimate confidence (0.0 to 1.0).
Determine priority ('low', 'medium', 'high', 'critical').

Available Departments:
${data.departments.join("\n")}${customInstructionStr}

Return the structured JSON classification. Note: Ensure department matches exactly from available list or is 'unclassified'.`,
                        },
                        {
                            role: "user",
                            content: `Source File: ${data.source}
Sheet: ${data.sheet}
Columns: ${data.columns.join(", ")}
Row Data:
${JSON.stringify(data.row, null, 2)}

Available Departments:
${data.departments.join("\n")}

Return the structured JSON classification. Note: Ensure department matches exactly from available list or is 'unclassified'.`,
                        },
                    ],
                }),
            });

            if (!response.ok) {
                throw new Error("AI Classification failed");
            }

            const completion = await response.json();
            const content = completion.choices[0].message.content;
            return JSON.parse(content) as ClassificationResult;
        } catch (e: any) {
            console.error("Server AI Error classification:", e.message);
            return {
                department: "unclassified",
                is_actionable: false,
                task_title: "AI Analysis Failed",
                task_description: "Failed to classify via server.",
                priority: "low",
                confidence: 0,
            } as ClassificationResult;
        }
    });


export const answerQuestionFn = createServerFn({ method: "POST" })
    .validator((data: {
        question: string;
        accessToken: string;
    }) => data)
    .handler(async ({ data }) => {
        try {
            const apiKey = process.env["OPENAI_API_KEY"] || (import.meta as any).env?.OPENAI_API_KEY || (import.meta as any).env?.VITE_OPENAI_API_KEY;
            if (!apiKey) throw new Error("AI provider API key is not configured.");

            const supabase = getSecureServerSupabase(data.accessToken);

            // 1. Fetch secure accessible schema maps based on authenticated user RLS
            const { data: sources } = await supabase.from("data_sources").select("id, file_name, row_count, schema_snapshot");
            if (!sources || sources.length === 0) {
                return { answer: "I couldn't find any connected data sources you have access to.", sources: [] } as QAAnswer;
            }

            let schemaSummary = "Available Data Sources:\n";
            for (const src of sources) {
                schemaSummary += `- [ID: ${src.id}] ${src.file_name}\n`;
                if (src.schema_snapshot) {
                    for (const [sheet, cols] of Object.entries(src.schema_snapshot as Record<string, string[]>)) {
                        schemaSummary += `   -> Sheet: "${sheet}", Columns: [${(cols).join(", ")}]\n`;
                    }
                }
            }

            // 2. PASS 1: Understand intent and output Structured Query payload
            const intentResponse = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
                body: JSON.stringify({
                    model: process.env["AI_MODEL"] || "gpt-4o-mini",
                    response_format: { type: "json_object" },
                    temperature: 0.0,
                    messages: [
                        {
                            role: "system",
                            content: `You are an AI database architect converting user questions into specific data queries.
You are given the user's question and the available Data Source schemas.
Decide if the answer exists in these schemas. If not, return an empty array for queries.
You must output a JSON object obeying this exactly:

{
  "queries": [
    {
      "dataSourceId": "string-id of the file",
      "sheetName": "string name of the sheet",
      "filters": [
         { "column": "Exact Column Name", "operator": "eq" | "contains" | "gt" | "lt", "value": "Value exactly matching schema typing" }
      ],
      "operation": "count" | "sum" | "avg" | "max" | "min" | "list",
      "targetColumn": "Target exact column name ONLY if operation is sum/avg/max/min",
      "limit": 5 (only apply if you need specific list)
    }
  ]
}`
                        },
                        {
                            role: "user",
                            content: `Available Schema:\n${schemaSummary}\n\nQuestion: "${data.question}"\n\nGenerate the JSON execution plan.`
                        }
                    ]
                })
            });

            if (!intentResponse.ok) throw new Error("Intent parsing failed.");

            const intentResult = await intentResponse.json();

            let plan: { queries: StructuredQuery[] } = { queries: [] };
            try {
                // OpenAI might wrap response in markdown blocks
                let rawJson = intentResult.choices[0].message.content;
                if (rawJson.startsWith("```json")) {
                    rawJson = rawJson.replace(/```json\n/, "").replace(/\n```/, "");
                }
                plan = JSON.parse(rawJson) as { queries: StructuredQuery[] };
            } catch (e) {
                console.error("AI JSON Parse Error:", e, intentResult.choices[0].message.content);
                // Fallback to empty queries if it hallucinated non-JSON
            }

            let aggregatedResults: QueryResult[] = [];

            // 3. SECURE SERVER EVALUATION LOOP OVER ALL ROWS BYPASSING LIMITS
            if (plan.queries && plan.queries.length > 0) {
                for (const q of plan.queries) {
                    const result = await executeStructuredQuery(q, data.accessToken);
                    aggregatedResults.push(result);
                }
            }

            // 4. GENERATE NATURAL LANGUAGE EXPLANATION NO LLM MATH ALLOWED
            const hasMeaningfulData = aggregatedResults.some(r => r.recordsAnalyzed > 0);
            let injectionContext = "";

            if (hasMeaningfulData) {
                injectionContext = "Deterministic Executed Results (TRUST THESE VALUES CITED EXACTLY):\n" +
                    aggregatedResults.map((r, i) => `Query ${i + 1} [${r.fileName} -> ${r.query.sheetName}]: Requested ${r.query.operation}. System parsed ${r.recordsAnalyzed} entire row(s). Final Result -> ${JSON.stringify(r.result)}`).join("\n\n");
            } else {
                injectionContext = "The system found 0 rows or executed 0 queries meaning data doesn't exist.";
            }

            const exactSources = aggregatedResults.map(r => ({ file: r.fileName || "Unknown", sheet: r.query.sheetName }));

            const finalResponse = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
                body: JSON.stringify({
                    model: process.env["AI_MODEL"] || "gpt-4o-mini",
                    response_format: { type: "json_object" },
                    temperature: 0.1,
                    messages: [
                        {
                            role: "system",
                            content: `You are the Nexus AI Assistant. You answer questions definitively based ONLY on the Deterministic Executed Results provided.
Do NOT attempt to calculate numbers yourself, trust the server's math injected below implicitly.
If the requested numerical or filtered data cannot be determined (no queries executed), explicitly output EXACTLY: "I couldn't find that information in the connected data sources." 
UNLESS the user is asking a general question about what data/columns/files are available, in which case you should explain the Availabe Data Sources (schemas) to them directly.
CRITICAL: If a count or sum successfully executes but mathematically results in 0, you MUST state the 0 result explicitly (e.g. "There are 0 pending invoices."). Do NOT say you couldn't find it.

Output exactly as JSON:
{
  "answer": "...",
  "sources": [] (Can be left empty if you used no sources)
}`
                        },
                        {
                            role: "user",
                            content: `Available Data Sources (Schemas):\n${schemaSummary}\n\nQuestion: "${data.question}"\n\n${injectionContext}\n\nFormulate the exact JSON response passing strictly the answer string.`
                        }
                    ]
                })
            });

            const finalData = await finalResponse.json();
            let rawJson = finalData.choices[0].message.content;
            let finalAnswer: any = { answer: "AI is temporarily unavailable" };

            try {
                if (rawJson.startsWith("```json")) {
                    rawJson = rawJson.replace(/```json\n/, "").replace(/\n```/, "");
                }
                finalAnswer = JSON.parse(rawJson);
            } catch (e) {
                // If AI ignores JSON strict output, just use the raw text
                finalAnswer = { answer: rawJson };
            }

            return {
                answer: finalAnswer.answer || "I could not answer that question.",
                sources: exactSources.length > 0 ? exactSources : []
            } as QAAnswer;

        } catch (e: any) {
            console.error("Server QA Error:", e.message);
            return {
                answer: `AI Error: ${e.message}`,
                sources: []
            } as QAAnswer;
        }
    });
