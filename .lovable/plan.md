# EDSquare — 60 Second Explainer Video

A rendered MP4 (1920x1080, 30fps, ~60s) that walks through the three risk-resolution flows, using real screenshots of the app and the mFilterIt logo, with AI narration and a light music bed.

## What you'll get

- `EDSquare-explainer.mp4` in your project files, ready to download and present.
- Narrated, captioned walkthrough of Flow 1 (detection and decision), Flow 2 (AI-led customer engagement), Flow 3 (human/branch investigation), ending on outcomes and reporting.
- Real app screens on screen: Dashboard, Alert Inbox, Engagement Center, Investigations, Case Detail, Enforcement Log, Reports.
- mFilterIt logo on the opening and closing frames, EDSquare as the product name throughout.

## Needed from you

The mFilterIt logo file (PNG or SVG, transparent background preferred). Everything else is ready.

## Storyboard (~60s)

1. 0-6s — Logo in, product name lands: "EDSquare — Intelligent Pre-EDD Triage".
2. 6-20s — Flow 1: alerts and alternate data feed the Decision Manager; outcomes Block / Unblock / Further Investigation. Dashboard + Alert Inbox screens.
3. 20-38s — Flow 2: further-investigation cases go to the orchestration engine and agentic AI outreach (call, WhatsApp/SMS/email, self-service); responses return to the Decision Manager. Engagement Center screens.
4. 38-50s — Flow 3: unresolved cases go to branch/human investigation, then back for the final Block or Unblock. Investigations + Case Detail screens.
5. 50-60s — Enforcement Log and Reports, closing line "AI/ML prioritises. Bank experts decide." with logo.

## Narration and audio

- ~150-word script, AI voiceover via ElevenLabs (voice: Brian or Sarah — professional enterprise tone), plus a subtle music bed and on-screen captions so it also reads muted.
- ElevenLabs will be connected for the voiceover; nothing to set up on your side.

## Technical approach

- Capture app screenshots headlessly from the running preview at 1440x900 (Dashboard, Alerts, Engagement, Investigations, Case Detail, Enforcement, Reports), framed in subtle device/browser chrome.
- Build the video with Remotion in a `remotion/` folder in the project: one scene component per flow, `TransitionSeries` for scene cuts, all motion frame-based (`interpolate`/`spring`).
- Visual direction matches the app: violet/indigo palette, white/near-white surfaces, one display + one body font; animated connector lines and node cards mirroring the flow diagram, screenshots parallaxing in behind them.
- Generate the voiceover MP3, mix with music, render to MP4 via a programmatic Remotion render script, then spot-check frames and the audio before delivering.

## Notes

- Video length is fixed at ~60s; if the narration runs long the script gets trimmed, not the pacing.
- Source files stay in the project so the video can be re-rendered or edited later.
