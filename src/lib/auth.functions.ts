import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Sign-in runs on the app's own server so it works even when a visitor's
// network blocks direct browser calls to the backend address.

function authClient() {
  return import("@supabase/supabase-js").then(({ createClient }) => {
    const url = process.env["SUPABASE_URL"]!;
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const shim: typeof fetch = (input, init) => {
      const headers = new Headers(init?.headers);
      if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
      headers.set("apikey", key);
      return fetch(input, { ...init, headers });
    };
    return createClient(url, key, {
      global: { fetch: shim },
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });
  });
}

export type AppSession = { email: string; refreshToken: string; expiresAt: number };
type Result = { ok: true; session: AppSession } | { ok: false; code: string };

export const signInServer = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ email: z.string().trim().email().max(255), password: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }): Promise<Result> => {
    try {
      const sb = await authClient();
      const { data: res, error } = await sb.auth.signInWithPassword({ email: data.email, password: data.password });
      if (error || !res.session) return { ok: false, code: error?.code ?? (error?.status === 429 ? "rate_limited" : "invalid_credentials") };
      return { ok: true, session: { email: res.session.user.email ?? data.email, refreshToken: res.session.refresh_token, expiresAt: res.session.expires_at ?? 0 } };
    } catch (e) {
      console.error("sign-in failed", e);
      return { ok: false, code: "unavailable" };
    }
  });

export const refreshServer = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ refreshToken: z.string().min(1).max(500) }).parse(d))
  .handler(async ({ data }): Promise<Result> => {
    try {
      const sb = await authClient();
      const { data: res, error } = await sb.auth.refreshSession({ refresh_token: data.refreshToken });
      if (error || !res.session) return { ok: false, code: error?.code ?? "expired" };
      return { ok: true, session: { email: res.session.user.email ?? "", refreshToken: res.session.refresh_token, expiresAt: res.session.expires_at ?? 0 } };
    } catch {
      return { ok: false, code: "unavailable" };
    }
  });
