import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInServer, refreshServer, type AppSession } from "@/lib/auth.functions";

const PUBLIC_PREFIXES = ["/q/", "/s/"];
const KEY = "edsquare-session";
const SIGNED_OUT_EVENT = "edsquare-signed-out";

function readStored(): AppSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AppSession) : null;
  } catch {
    return null;
  }
}

export function signOutApp() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(SIGNED_OUT_EVENT));
}

export function AuthGate({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isPublic = PUBLIC_PREFIXES.some((p) => path.startsWith(p));
  const [session, setSession] = useState<AppSession | null | undefined>(undefined);

  useEffect(() => {
    const onOut = () => setSession(null);
    window.addEventListener(SIGNED_OUT_EVENT, onOut);
    const stored = readStored();
    const now = Date.now() / 1000;
    if (!stored) setSession(null);
    else if (stored.expiresAt > now + 60) setSession(stored);
    else {
      refreshServer({ data: { refreshToken: stored.refreshToken } })
        .then((r) => {
          if (r.ok) {
            localStorage.setItem(KEY, JSON.stringify(r.session));
            setSession(r.session);
          } else {
            localStorage.removeItem(KEY);
            setSession(null);
          }
        })
        .catch(() => setSession(null));
    }
    return () => window.removeEventListener(SIGNED_OUT_EVENT, onOut);
  }, []);

  if (isPublic) return <>{children}</>;
  if (session === undefined) return <div className="min-h-screen bg-background" />;
  if (!session)
    return (
      <LoginScreen
        onSignedIn={(s) => {
          localStorage.setItem(KEY, JSON.stringify(s));
          setSession(s);
        }}
      />
    );
  return <>{children}</>;
}

function LoginScreen({ onSignedIn }: { onSignedIn: (s: AppSession) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await signInServer({ data: { email: email.trim(), password } });
      if (r.ok) return onSignedIn(r.session);
      if (r.code === "invalid_credentials") setError("Wrong email or password.");
      else if (r.code === "email_not_confirmed") setError("Please confirm your email before signing in.");
      else if (r.code === "rate_limited" || r.code === "over_request_rate_limit")
        setError("Too many sign-in attempts. Please wait a moment and try again.");
      else setError("Sign-in is unavailable right now. Please try again.");
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
