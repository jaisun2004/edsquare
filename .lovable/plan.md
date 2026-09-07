# Finish the EDSquare video without burning more credits

## What went wrong

- The earlier attempts tried to render all 3,348 frames (2 minutes) in a single run. That run kept hitting the 10-minute command limit and, when the workspace reset, all progress was lost — so every retry started from zero and cost a full round of credits for nothing.
- The fix was already proven in the last attempt: rendering in **chunks** works. The first chunk (frames 0-1099, the first 36.7 seconds) rendered successfully and is saved at `/tmp/vo/p1.mp4`. The narration, music, logo and app screenshots are all safely in the project (`remotion/public/`), so nothing needs to be regenerated.

## What I'll do (one background job, minimal check-ins)

1. Keep the finished first chunk as-is.
2. Start **one** background script that, without any further prompting from me:
   - renders the remaining three chunks in sequence (frames 1100-1849, 1850-2599, 2600-3347), each well inside the time limit;
   - joins the four chunks into one silent video;
   - mixes narration (full volume) and music (lowered under the voice) onto it;
   - writes the final `EDSquare-explainer.mp4` to your project files.
3. Check on it only twice, with long waits in between (each check is a single command that waits up to 10 minutes), instead of many short polls. If a chunk fails, the script logs which one so only that chunk is retried, never the whole video.
4. Spot-check three frames and the audio sync, then hand you the file.

Expected wall time: roughly 25-30 minutes of render, about 3 messages from me total.

## Cheaper fallback (only if a chunk fails again)

Drop the output to 1280x720 and slightly lower picture quality. That roughly halves render time per chunk. Same script, one setting change; I'd tell you before doing it.

## Technical details

- Existing `remotion/scripts/render-remotion.mjs` already accepts `start end out`; the new wrapper `remotion/scripts/render-all.sh` loops over the chunk list, skips chunks whose `.mp4` already exists (so a retry never re-renders finished work), then runs:
  - `ffmpeg -f concat` to join `p1..p4.mp4` (stream copy, no re-encode);
  - `ffmpeg` mix: narration at 0 dB, music at about -18 dB with `amix`, AAC audio, video stream copied.
- Concurrency stays at 12 (16 cores, 32 GB free); the chunk size of 750 frames is sized from the measured speed of chunk 1 (1,100 frames in under 8 minutes).
- Output: `/mnt/documents/EDSquare-explainer.mp4` (also copied to `remotion/out/` in the project so it survives a workspace reset).
- No changes to the app source, scenes, or audio assets.
