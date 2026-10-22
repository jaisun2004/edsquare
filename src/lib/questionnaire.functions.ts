import { createServerFn } from "@tanstack/react-start";
import type { Json } from "@/integrations/supabase/types";
import { makeShortCode, shortCodeOk, SHORT_LINK_DAYS } from "@/lib/whatsapp";

export interface QHeader { bank: string; amount: number; last4: string; name: string }
export interface QQuestion { id: string; text: string; options: string[] }

const tokenOk = (t: string) => /^[A-Za-z0-9]{16,64}$/.test(t ?? "");

export const createQuestionnaire = createServerFn({ method: "POST" })
  .inputValidator((input: { header: QHeader; questions: QQuestion[] }) => {
    if (!Array.isArray(input.questions) || input.questions.length < 1 || input.questions.length > 12) throw new Error("Invalid questions.");
    if (JSON.stringify(input).length > 8000) throw new Error("Questionnaire too large.");
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const bytes = crypto.getRandomValues(new Uint8Array(18));
    const token = Array.from(bytes, (b) => "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 56]).join("");
    let error: { message: string } | null = null;
    for (let i = 0; i < 3; i++) {
      const code = makeShortCode();
      ({ error } = await supabaseAdmin.from("questionnaire_sessions").insert({ token, short_code: code, header: data.header as unknown as Json, questions: data.questions as unknown as Json }));
      if (!error) return { token, code };
    }
    throw new Error(`Could not create questionnaire: ${error?.message}`);
  });

export const getQuestionnaire = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string }) => {
    if (!tokenOk(input.token)) throw new Error("Invalid link.");
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.from("questionnaire_sessions").select("header, questions, answers, status, submitted_at").eq("token", data.token).maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    return { header: row.header as unknown as QHeader, questions: row.questions as unknown as QQuestion[], answers: (row.answers ?? null) as Record<string, string> | null, status: row.status, submittedAt: row.submitted_at };
  });

export const submitQuestionnaire = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string; answers: Record<string, string> }) => {
    if (!tokenOk(input.token)) throw new Error("Invalid link.");
    if (!input.answers || typeof input.answers !== "object" || JSON.stringify(input.answers).length > 2000) throw new Error("Invalid answers.");
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin.from("questionnaire_sessions").select("questions, status").eq("token", data.token).maybeSingle();
    if (!row) throw new Error("This link is no longer valid.");
    if (row.status === "submitted") return { ok: true, already: true };
    const qs = row.questions as unknown as QQuestion[];
    const clean: Record<string, string> = {};
    for (const q of qs) {
      const a = data.answers[q.id];
      if (!a || !q.options.includes(a)) throw new Error("Please answer every question.");
      clean[q.id] = a;
    }
    const { error } = await supabaseAdmin.from("questionnaire_sessions").update({ answers: clean, status: "submitted", submitted_at: new Date().toISOString() }).eq("token", data.token);
    if (error) throw new Error(error.message);
    return { ok: true, already: false };
  });

/** Resolves a short link code to its questionnaire token; null if unknown or older than the link lifetime. */
export const resolveShortLink = createServerFn({ method: "POST" })
  .inputValidator((input: { code: string }) => {
    if (!shortCodeOk(input.code)) throw new Error("Invalid link.");
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.from("questionnaire_sessions").select("token, created_at").eq("short_code", data.code).maybeSingle();
    if (error) throw new Error(error.message);
    if (!row || Date.now() - new Date(row.created_at).getTime() > SHORT_LINK_DAYS * 86400_000) return null;
    return { token: row.token };
  });
