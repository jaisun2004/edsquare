import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PUBLIC_PREFIXES = ["/q/", "/s/"];

export function AuthGate({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isPublic = PUBLIC_PREFIXES.some((p) => path.startsWith(p));
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    return () => data.subscription.unsubscribe();
  }, []);

  if (isPublic) return <>{children}</>;
  if (session === undefined) return <div className="min-h-screen bg-background" />;
  if (!session) return <LoginScreen />;
  return <>{children}</>;
}

function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        if (error.code === "invalid_credentials") {
          setError("Wrong email or password.");
        } else if (error.code === "email_not_confirmed") {
          setError("Please confirm your email before signing in.");
        } else if (!error.status || error.status >= 500) {
          setError("Unable to connect to sign-in. Check your connection and try again.");
        } else if (error.status === 429) {
          setError("Too many sign-in attempts. Please wait a moment and try again.");
        } else {
          setError("Sign-in is unavailable right now. Please try again.");
        }
      }
    } catch {
      setError("Unable to connect to sign-in. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-5 rounded-xl border bg-card p-8 shadow-sm">
        <div className="flex items-center gap-3">
          <img src="/favicon.png" alt="mFilterIt" className="h-9 w-9" />
          <div>
            <h1 className="text-lg font-semibold text-foreground">EDSquare</h1>
            <p className="text-xs text-muted-foreground">Sign in to continue</p>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
