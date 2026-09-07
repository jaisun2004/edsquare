# Straighten the opening screenshot only

## What will change

- Keep the opening screen print in place.
- Remove its tilt so it sits straight and level.
- Leave the opening text, logo, caption, narration, music, timing, and all other scenes unchanged.

## Economical render path

The tilt is only in the opening scene, which occupies frames `0-407`. The rest of the current video can be reused.

```text
frames    0-407   RENDER   opening scene only, with straight screenshot
frames  408-end   KEEP     existing fixed video content
```

This avoids rebuilding the full video and avoids touching the two-screen fixes that are already done.

## Technical details

- Edit `remotion/src/scenes/Intro.tsx` only: change the opening dashboard `Shot` from `tilt={-1.2}` to `tilt={0}` or remove the tilt prop.
- Render only frames `0-407` into a new intro piece.
- Extract the existing final video from frame `408` onward without re-rendering it.
- Concatenate the new straight intro with the kept remainder.
- Copy the result to `/mnt/documents/EDSquare-explainer.mp4` and `remotion/out/EDSquare-explainer.mp4`.
- Verify the opening frame visually and confirm the MP4 still has audio, 1080p video, and the same overall duration.
