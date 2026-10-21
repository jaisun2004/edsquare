import { createServerFn } from "@tanstack/react-start";

// Lovable AI Gateway (Responses API, streamed and collected server-side).
async function callGateway(instructions: string, input: string, schema?: { name: string; schema: Record<string, unknown> }) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured for this project.");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      instructions,
      input,
      stream: true,
      store: false,
      reasoning: { effort: "low", summary: "auto" },
      include: ["reasoning.encrypted_content"],
      ...(schema ? { text: { format: { type: "json_schema", name: schema.name, strict: true, schema: schema.schema } } } : {}),
    }),
  });
  if (!res.ok || !res.body) {
    const body = await res.text().catch(() => "");
    let message = `AI request failed (${res.status}).`;
    try {
      message = JSON.parse(body)?.error?.message ?? JSON.parse(body)?.message ?? message;
    } catch {
      /* keep default */
    }
    if (res.status === 402) message = "AI credits are used up. Add credits in Settings → Plans & credits.";
    if (res.status === 429) message = "AI is busy right now. Please try again in a moment.";
    throw new Error(message);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const evt = JSON.parse(data);
        if (evt.type === "response.output_text.delta") text += evt.delta ?? "";
        if (evt.type === "response.failed" || evt.type === "error") throw new Error(evt.error?.message ?? "AI request failed.");
      } catch (e) {
        if (e instanceof Error && e.message.startsWith("AI")) throw e;
      }
    }
  }
  return text;
}

interface CatalogueItem {
  key: string;
  label: string;
  type: string;
  options?: string[];
}

const draftSchema = {
  name: "rule_draft",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["rules", "missingData"],
    properties: {
      missingData: { type: "array", items: { type: "string" } },
      rules: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name", "description", "groupId", "logic", "conditions", "weight", "outcome", "readback"],
          properties: {
            name: { type: "string" },
            description: { type: "string" },
            groupId: { type: "string" },
            logic: { type: "string", enum: ["AND", "OR"] },
            conditions: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["attr", "op", "value"],
                properties: {
                  attr: { type: "string" },
                  op: { type: "string", enum: ["gt", "gte", "lt", "lte", "eq", "neq", "between", "in", "contains", "exists"] },
                  value: { type: "string" },
                },
              },
            },
            weight: { type: "number" },
            outcome: { type: "string", enum: ["none", "Auto clear", "AI calling", "Branch referral", "Block"] },
            readback: { type: "string" },
          },
        },
      },
    },
  },
};

export interface DraftRule {
  name: string;
  description: string;
  groupId: string;
  logic: "AND" | "OR";
  conditions: { attr: string; op: string; value: string }[];
  weight: number;
  outcome: "none" | "Auto clear" | "AI calling" | "Branch referral" | "Block";
  readback: string;
}

export const draftRulesFromText = createServerFn({ method: "POST" })
  .inputValidator((input: { text: string; catalogue: CatalogueItem[]; groups: { id: string; name: string; stage: string }[] }) => {
    if (!input.text?.trim() || input.text.length > 2000) throw new Error("Describe the rule in up to 2000 characters.");
    return input;
  })
  .handler(async ({ data }) => {
    const instructions = `You convert a bank fraud analyst's plain-English description into structured EDD decision rules.
Use ONLY attribute keys from the catalogue. Never invent keys. If the description needs data that no catalogue attribute provides, list it in missingData in plain words (e.g. "device fingerprint") and leave that condition out.
Operators: gt, gte, lt, lte, eq, neq, between (value "a..b"), in (comma-separated), contains, exists. Values are strings: numbers as digits, booleans as "true"/"false", money in rupees without symbols.
Split "otherwise" / "else" clauses into separate rules. Pick the best groupId: hard stops (G-LEA) for absolute blocks from LEA/government data, scoring groups (G-BEH, G-ID, G-NEG, G-VEL) for weighted signals with outcome "none", G-SEG for routing outcomes, G-OV for exceptions.
Scoring rules get a weight between 3 and 20. Routing rules get weight 0. The readback must restate the rule in one plain sentence.`;
    const input = JSON.stringify({ description: data.text, catalogue: data.catalogue, groups: data.groups });
    const raw = await callGateway(instructions, input, draftSchema);
    try {
      return JSON.parse(raw) as { rules: DraftRule[]; missingData: string[] };
    } catch {
      throw new Error("The AI response could not be read. Try rephrasing the rule.");
    }
  });

export const askRuleBase = createServerFn({ method: "POST" })
  .inputValidator((input: { question: string; context: string }) => {
    if (!input.question?.trim() || input.question.length > 1000) throw new Error("Ask a question of up to 1000 characters.");
    if (input.context.length > 60000) throw new Error("Rule base too large.");
    return input;
  })
  .handler(async ({ data }) => {
    const instructions = `You are the EDSquare Decision Manager assistant for bank fraud and compliance teams.
Answer questions about the rule base, data sources and alert evaluations using ONLY the provided JSON context.
Cite rule IDs (e.g. R-11, SG-02) and source names. Be concise: short paragraphs or bullets, no more than 180 words. If the context does not contain the answer, say so.
Remember: AI/ML prioritises, bank experts decide — never claim a final decision was made by AI.`;
    const answer = await callGateway(instructions, JSON.stringify({ question: data.question, context: JSON.parse(data.context) }));
    return { answer: answer.trim() };
  });

export const summariseFlowCase = createServerFn({ method: "POST" })
  .inputValidator((input: { context: string }) => {
    if (!input.context || input.context.length > 20000) throw new Error("Case context missing or too large.");
    return input;
  })
  .handler(async ({ data }) => {
    const instructions = `You write a short case summary for a bank EDD reviewer deciding whether to keep a suspected mule account blocked or unblock it.
Use ONLY the JSON context. Cover: alert, data check results with values, customer responses and mismatches against core banking, response flag and step outcomes.
Max 120 words, plain bullets. End with "Suggested: Block" or "Suggested: Unblock" plus one reason. Never state that a final decision has been made.`;
    const summary = await callGateway(instructions, data.context);
    return { summary: summary.trim() };
  });

export const extractCallAnswers = createServerFn({ method: "POST" })
  .inputValidator((input: { transcript: string; questions: { id: string; text: string; options: string[] }[]; profile: string }) => {
    if (!input.transcript || input.transcript.length > 30000) throw new Error("Transcript missing or too large.");
    if (!Array.isArray(input.questions) || input.questions.length > 12) throw new Error("Invalid questions.");
    return input;
  })
  .handler(async ({ data }) => {
    const ids = data.questions.map((q) => q.id);
    const schema = {
      name: "call_answers",
      schema: {
        type: "object", additionalProperties: false, required: ["answers"],
        properties: { answers: { type: "array", items: { type: "object", additionalProperties: false, required: ["id", "answer"], properties: { id: { type: "string", enum: ids }, answer: { type: "string" } } } } },
      },
    };
    const instructions = `You read a bank EDD voice-bot call transcript and map the customer's spoken answers to the script questions.
For each question return exactly one of its option labels, copied verbatim, or "" if the customer did not answer it.
For a pincode question, compare the pincode the customer said with the core banking profile pincode: "Matches our records" if equal, otherwise "Different pincode". Transcription can be noisy ("Seltos employed" = "self employed").`;
    const raw = await callGateway(instructions, JSON.stringify(data), schema);
    const parsed = JSON.parse(raw) as { answers: { id: string; answer: string }[] };
    const out: Record<string, string> = {};
    for (const a of parsed.answers) {
      const q = data.questions.find((x) => x.id === a.id);
      if (q && q.options.includes(a.answer)) out[a.id] = a.answer;
    }
    return { answers: out };
  });
