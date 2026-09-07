# EDSquare — 2 Minute Explainer Video

A rendered MP4 (1920x1080, 30fps, ~120s) that walks through the three risk-resolution flows, using real screenshots of the app and the mFilterIt logo you uploaded, with AI narration and a light music bed.

Why 2 minutes: one minute forces roughly 15 seconds per flow, which is too fast to show a real screen and explain it. Two minutes gives each flow about 30 seconds — enough for the diagram beat plus a live app screen — while staying short enough to hold attention.

## What you'll get

- `EDSquare-explainer.mp4` in your project files, ready to download and present.
- Narrated, captioned walkthrough of Flow 1 (detection and decision), Flow 2 (AI-led customer engagement), Flow 3 (human/branch investigation), ending on outcomes and reporting.
- Real app screens on screen: Dashboard, Alert Inbox, Engagement Center, Investigations, Case Detail, Enforcement Log, Reports.
- The uploaded mFilterIt logo on the opening and closing frames, EDSquare as the product name throughout.

## Storyboard (~120s)

1. 0-10s — Logo in, product name lands: "EDSquare — Intelligent Pre-EDD Triage for Risk Mapping & Account Resolution". One line on the problem: mule and digital-scam accounts.
2. 10-38s — Flow 1, Initial Detection & Decision: alerts/instances (CRM, models, rules) and alternate data feed the Decision Manager, which segments customers into Block, Unblock, or Further Investigation. Dashboard and Alert Inbox screens.
3. 38-70s — Flow 2, AI-Led Customer Engagement: further-investigation cases enter the HIVE orchestration engine; agentic AI calls the customer; no response falls back to WhatsApp/Email/SMS, mobile & internet banking, and self-service; responses return to the Decision Manager. Engagement Center screens.
4. 70-95s — Flow 3, Human / Branch Investigation: unresolved cases go to branch or human investigation, evidence is gathered, and the Decision Manager returns the final Block or Unblock. Investigations and Case Detail screens.
5. 95-112s — Outcomes in practice: Enforcement Log (block / unblock with reason and audit trail) and Reports.
6. 112-120s — Close on "AI/ML prioritises. Bank experts decide." with the EDSquare wordmark and mFilterIt logo.

## Narration and audio

- ~290-word script (natural pace for 2 minutes), AI voiceover via ElevenLabs in a professional enterprise tone, plus a subtle music bed and on-screen captions so it also reads muted.
- ElevenLabs gets connected for the voiceover; nothing to set up on your side.

## Technical approach

- Capture app screenshots headlessly from the running preview at 1440x900 (Dashboard, Alerts, Engagement, Investigations, Case Detail, Enforcement, Reports), framed in subtle browser chrome.
- Build the video with Remotion in a `remotion/` folder in the project: one scene component per flow, `TransitionSeries` for scene cuts, all motion frame-based (`interpolate`/`spring`).
- Visual direction matches the app and the mFilterIt brand: violet/indigo palette on near-white surfaces, one display + one body font; animated connector lines and node cards mirroring the flow diagram, screenshots parallaxing in behind them.
- Generate the voiceover MP3, mix with music, render to MP4 via a programmatic Remotion render script, then spot-check frames and listen to the audio before delivering.

## Notes

- The uploaded logo is used as-is (no redraw or recolour).
- Source files stay in the project so the video can be re-rendered or edited later.
