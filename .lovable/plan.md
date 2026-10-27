# Send "HI" for Hindi on AI calls

- When Hindi is chosen, the voice call request sends `preferred_language: "HI"` instead of `"HINDI"`. English stays `"ENGLISH"` (unchanged unless the team wants `"EN"` too).
- Applies to calls from the simulator and from a case page. The dropdown and saved case contact are unchanged.

## Technical details
- `src/lib/voice.ts`: add `voiceLang(lang)` mapping `HINDI -> "HI"`, else `"ENGLISH"`; session type becomes `"ENGLISH" | "HI"`; validation accepts those.
- `RealChannels.tsx` dispatch uses `voiceLang(lang)`.
- Add a test in `src/lib/voice.test.ts`: Hindi maps to `"HI"`, English to `"ENGLISH"`.
