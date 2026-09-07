#!/usr/bin/env bash
# Targeted re-render: renders only the two-screen stretches + closing (q1..q6),
# reuses already-rendered p-chunks (trimming two of them), joins, mixes audio.
# Safe to re-run: skips any chunk whose .mp4 already exists.
set -u
cd "$(dirname "$0")/.."
OUT=/tmp/vo
mkdir -p "$OUT" out
LOG=$OUT/render-all.log
echo "=== start $(date -u +%T)" >> "$LOG"

CHUNKS=("708 957 q1" "958 1070 q2" "2450 2699 q3" "2700 2949 q4" "2950 3104 q5" "3105 3347 q6")

for c in "${CHUNKS[@]}"; do
  set -- $c
  if [ -s "$OUT/$3.mp4" ]; then echo "skip $3 (exists)" >> "$LOG"; continue; fi
  ok=0
  for attempt in 1 2 3; do
    echo "render $3 [$1-$2] attempt $attempt $(date -u +%T)" >> "$LOG"
    if timeout 420 node scripts/render-remotion.mjs "$1" "$2" "$OUT/$3.mp4" > "$OUT/$3.log" 2>&1 && [ -s "$OUT/$3.mp4" ]; then
      ok=1; echo "ok $3 $(date -u +%T)" >> "$LOG"; break
    fi
    echo "retry $3: attempt $attempt timed out/failed $(date -u +%T)" >> "$LOG"
    rm -f "$OUT/$3.mp4"
    for p in $(pgrep -f 'libexec/chromium/chromiu[m]'); do kill -9 "$p" 2>/dev/null; done
    sleep 2
  done
  [ "$ok" = 1 ] || { echo "FAILED $3 after 3 attempts" >> "$LOG"; exit 1; }
done

# Trims of reused chunks (frame-accurate re-encode of a few seconds only)
echo "trim $(date -u +%T)" >> "$LOG"
ENC="-c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -r 30 -an"
ffmpeg -y -loglevel error -i "$OUT/p3.mp4"  -vf "select=lt(n\,208),setpts=N/30/TB" -vsync cfr $ENC "$OUT/p3t.mp4"  || { echo "FAILED trim p3" >> "$LOG"; exit 1; }
ffmpeg -y -loglevel error -i "$OUT/p5.mp4"  -vf "select=gte(n\,71),setpts=N/30/TB" -vsync cfr $ENC "$OUT/p5t.mp4"  || { echo "FAILED trim p5" >> "$LOG"; exit 1; }
ffmpeg -y -loglevel error -i "$OUT/p10.mp4" -vf "select=lt(n\,200),setpts=N/30/TB" -vsync cfr $ENC "$OUT/p10t.mp4" || { echo "FAILED trim p10" >> "$LOG"; exit 1; }

NAMES="p1 p2 p3t q1 q2 p5t p6 p7 p8 p9 p10t q3 q4 q5 q6"
: > "$OUT/list.txt"; for n in $NAMES; do echo "file '$OUT/$n.mp4'" >> "$OUT/list.txt"; done
echo "concat $(date -u +%T)" >> "$LOG"
ffmpeg -y -loglevel error -f concat -safe 0 -i "$OUT/list.txt" -c copy "$OUT/silent.mp4" || { echo "FAILED concat" >> "$LOG"; exit 1; }
ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of csv=p=0 "$OUT/silent.mp4" >> "$LOG"

echo "mix $(date -u +%T)" >> "$LOG"
ffmpeg -y -loglevel error -i "$OUT/silent.mp4" -i public/audio/narration.mp3 -i public/audio/music.mp3 \
  -filter_complex "[1:a]volume=1.0[vo];[2:a]volume=-18dB,afade=t=out:st=107:d=4[mu];[vo][mu]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest "$OUT/final.mp4" || { echo "FAILED mix" >> "$LOG"; exit 1; }

mkdir -p /mnt/documents
cp "$OUT/final.mp4" /mnt/documents/EDSquare-explainer.mp4
cp "$OUT/final.mp4" out/EDSquare-explainer.mp4
echo "DONE $(date -u +%T)" >> "$LOG"
