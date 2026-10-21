import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { maskNumber, validateAccountBlocked } from "@/lib/whatsapp";
import { sendAccountBlockedWhatsApp } from "@/lib/whatsapp.functions";

const MAX_SENDS = 3;
const KEY = "edsquare.whatsapp.to";

export function WhatsAppSender({ account, onSent }: { account: string; onSent: (ok: boolean, text: string) => void }) {
  const send = useServerFn(sendAccountBlockedWhatsApp);
  const [to, setTo] = useState("");
  const [acct, setAcct] = useState(account);
  const [support, setSupport] = useState("1800123456");
  const [language, setLanguage] = useState<"en" | "hi">("en");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(0);
  const [result, setResult] = useState<{ ok: boolean; text: string }>();

  useEffect(() => setTo(sessionStorage.getItem(KEY) ?? ""), []);

  const input = { to: to.trim(), account_number: acct.trim(), support_number: support.trim(), language };
  const error = to ? validateAccountBlocked(input) : null;

  const go = async () => {
    if (validateAccountBlocked(input) || sent >= MAX_SENDS) return;
    if (!window.confirm(`Send a real WhatsApp message to +${input.to}?`)) return;
    sessionStorage.setItem(KEY, input.to);
    setBusy(true);
    try {
      const r = await send({ data: input });
      const text = r.ok ? `WhatsApp "account blocked" message sent to ${maskNumber(input.to)} (${language === "hi" ? "Hindi" : "English"}).` : `WhatsApp send failed (${r.status || "no connection"}): ${r.body}`;
      setResult({ ok: r.ok, text });
      setSent((n) => n + 1);
      onSent(r.ok, text);
    } catch (e) {
      setResult({ ok: false, text: e instanceof Error ? e.message : "Send failed." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2 rounded-md border border-dashed p-3">
      <p className="text-xs font-semibold">Send real WhatsApp (optional)</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1"><Label className="text-xs">Mobile (e.g. 919667335707)</Label><Input value={to} onChange={(e) => setTo(e.target.value.replace(/\s/g, ""))} placeholder="91XXXXXXXXXX" /></div>
        <div className="space-y-1"><Label className="text-xs">Account number</Label><Input value={acct} onChange={(e) => setAcct(e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-xs">Support number</Label><Input value={support} onChange={(e) => setSupport(e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-xs">Language</Label>
          <Select value={language} onValueChange={(v) => setLanguage(v as "en" | "hi")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="en">English</SelectItem><SelectItem value="hi">Hindi</SelectItem></SelectContent>
          </Select>
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{sent}/{MAX_SENDS} sends this run</span>
        <Button size="sm" onClick={go} disabled={busy || !to || !!error || sent >= MAX_SENDS}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Send WhatsApp
        </Button>
      </div>
      {result && <p className={`text-xs ${result.ok ? "text-success" : "text-destructive"}`}>{result.ok ? "Sent. " : ""}{result.text}</p>}
    </div>
  );
}
