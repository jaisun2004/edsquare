# Targeted fix: screenshot framing + flow naming in the narration

## What's wrong (confirmed)

1. **Screenshots are cropped and float small inside their frames.** Every screenshot is 2880x1800 (ratio 1.6), but each frame in the video is given a fixed height (470-620px) and the picture is drawn "fill and crop" at 62-68% size, anchored to the top-left, plus a slow zoom. Result: part of the screen is cut off and there's dead space below it.
2. **The voice says "Flow 1", "Flow 2", "Flow 3".** These labels come from the narration lines for those three sections (and matching purple "FLOW 1/2/3" badges on screen).

## The fix

**Screens (all scenes that show app screenshots: detection, engagement, investigation, enforcement/reporting)**
- Show the whole screen, uncropped: frame height derived from the real 1.6 picture ratio, picture fitted rather than cropped, no shrink offset.
- Keep both screens per scene side by side, sized to fill the space evenly so nothing is left half-empty; keep the gentle zoom but re-anchor it to the centre so it never slices an edge.
- Same look otherwise: browser chrome, shadow, slight tilt on the second screen, same entry timing.

**Narration and labels**
- Re-record only the three lines that say "Flow 1/2/3", replacing them with the flow names: "Initial detection and decision", "AI-led customer engagement", "Human and branch investigation". Each new line is fitted to the exact same slot length as the old one (padded or trimmed with silence), so nothing after it shifts and no scene timing changes.
- On-screen badges change from "FLOW 1/2/3" to "DETECTION", "ENGAGEMENT", "INVESTIGATION".

**Re-render scope (not the whole video)**
- Untouched and reused as-is: the opening scene and the closing scene.
- Re-rendered: the four stretches that contain screenshots, in short chunks, then joined with the existing pieces and re-mixed with the corrected narration and the same music bed.
- Estimated time: about 15 minutes of rendering, done in one background job with the same chunk-and-retry script that worked last time.

## Technical details

- `remotion/src/components/Ui.tsx` `Shot`: replace `objectFit: "cover"` + `scale` + `transformOrigin: "left top"` with `objectFit: "contain"`, `transformOrigin: "center center"`, and compute the inner height from `width / 1.6` when no explicit height is given; keep the push-in at 1.0-1.03.
- `Flow1.tsx`, `Flow2.tsx`, `Flow3.tsx`, `Results.tsx`: drop the per-shot `scale`/`height` overrides, set consistent widths (approx. 900 and 830 for two-up layouts, 1500 for the single engagement shot), and nudge the top offsets so the captions are never overlapped.
- Narration: regenerate segments s2, s4 and s5 with ElevenLabs (same voice `nPczCjzI2devNBz1zQrb`, `eleven_multilingual_v2`), then `ffmpeg apad`/`atrim` each to its original duration before re-concatenating with the untouched segments, keeping `SCENES` in `theme.ts` unchanged.
- Re-render frame ranges 408-1070 and 1443-3104 in 250-frame chunks via `remotion/scripts/render-remotion.mjs`; reuse existing rendered material for 0-407, 1071-1442 and 3105-3347 by re-cutting from the current final MP4 with stream-copy-safe re-encode, then concat + audio mix as before.
- Output overwrites `/mnt/documents/EDSquare-explainer.mp4` and `remotion/out/EDSquare-explainer.mp4`.
