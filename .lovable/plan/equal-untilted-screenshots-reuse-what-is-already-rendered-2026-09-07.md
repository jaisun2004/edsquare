# Equal, untilted screenshots — reuse what is already rendered

## Where things stand (checked just now)

- A render job is still running in the background. It has finished 10 of 14 pieces (frames 0–2499) and is stuck on piece 11 (second attempt after a 7-minute timeout). I will stop it first.
- Those finished pieces used the current layout, where the second screen is 60px smaller, pushed down 60px and tilted 0.8 degrees. That is exactly what you want gone.
- Only three scenes show two screens side by side: Detection (dashboard + alert inbox), Investigation (workbench + case detail) and Enforcement/Reports. Everything else (opening, Outcomes, the single Engagement screen, closing) is unaffected and can be kept as already rendered.

## The change (only this)

In the three two-screen scenes:
- both screens the same width (830px each, which fills the 1700px content area with a 40px gap between them);
- both aligned to the same top edge, no downward offset on the second one;
- no tilt on either.

No other visual, narration or timing changes. The Engagement single-screen scene stays as is.

## Most economical render path

Instead of re-rendering the whole video, re-render only the stretches that contain a two-screen layout, and stitch them with the pieces that already exist:

```text
frames     0-707    keep   (already rendered: p1, p2, first part of p3)
frames   708-1070   RENDER (Detection screenshots)
frames  1071-2449   keep   (already rendered: p5 tail, p6-p9, first part of p10)
frames  2450-3104   RENDER (Investigation + Enforcement/Reports screenshots)
frames  3105-3347   RENDER (closing scene; was never finished)
```

That is about 1,260 new frames instead of 3,348 — roughly 5 short pieces, around 12–15 minutes of unattended rendering, in one background job with the existing retry logic. The two "keep" ranges that end mid-piece are trimmed with a quick 5-second cut, not re-rendered.

## Check-ins

Two at most: one when the job is started, one when the file is ready (with three stills from the two-screen scenes so you can confirm the framing). No polling in between.

## Technical details

- Stop the running job: `pkill -f render-all.sh; pkill -f render-remotion; pkill -f chromium`.
- `Flow1.tsx`, `Flow3.tsx`, `Results.tsx`: set both `Shot` widths to 830, remove `tilt={0.8}`, remove the `marginTop: 60` wrapper on the second shot, keep `alignItems: "flex-start"` and `gap: 40`. `Ui.tsx` and `Flow2.tsx` unchanged.
- New chunk list in `render-all.sh` (existing 420s timeout and 3 retries kept): `708-957 q1`, `958-1070 q2`, `2450-2699 q3`, `2700-2949 q4`, `2950-3104 q5`, `3105-3347 q6`.
- Reused material: `p1`, `p2`, `p3` trimmed to its first 208 frames (500–707), `p5` from its 71st frame (1071–1249), `p6`–`p9`, `p10` trimmed to its first 200 frames (2250–2449). Trims are done with ffmpeg on those few seconds only, same H.264 settings.
- Concat in order p1, p2, p3-trim, q1, q2, p5-trim, p6, p7, p8, p9, p10-trim, q3, q4, q5, q6; then the same narration + music mix as before.
- Output: `/mnt/documents/EDSquare-explainer.mp4` and `remotion/out/EDSquare-explainer.mp4`.
