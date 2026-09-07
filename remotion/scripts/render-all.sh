#!/usr/bin/env bash
# Renders the chunks (skipping any that already exist), joins them,
# mixes narration + music, and writes the final MP4. Safe to re-run.
set -u
cd "$(dirname "$0")/.."
OUT=/tmp/vo
mkdir -p "$OUT" out
LOG=$OUT/render-all.log
echo "=== start $(date -u +%T)" >> "$LOG"

CHUNKS=("0 249 p1" "250 499 p2" "500 749 p3" "750 999 p4" "1000 1249 p5" "1250 1499 p6" "1500 1749 p7" "1750 1999 p8" "2000 2249 p9" "2250 2499 p10" "2500 2749 p11" "2750 2999 p12" "3000 3249 p13" "3250 3347 p14")
NAMES="p1 p2 p3 p4 p5 p6 p7 p8 p9 p10 p11 p12 p13 p14"

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
    for p in $(pgrep -f 'chrome-for-testing|chromium'); do kill -9 "$p" 2>/dev/null; done
    sleep 2
  done
  [ "$ok" = 1 ] || { echo "FAILED $3 after 3 attempts" >> "$LOG"; exit 1; }
done

: > "$OUT/list.txt"; for n in $NAMES; do echo "file '$OUT/$n.mp4'" >> "$OUT/list.txt"; done
echo "concat $(date -u +%T)" >> "$LOG"
ffmpeg -y -loglevel error -f concat -safe 0 -i "$OUT/list.txt" -c copy "$OUT/silent.mp4" || { echo "FAILED concat" >> "$LOG"; exit 1; }

echo "mix $(date -u +%T)" >> "$LOG"
ffmpeg -y -loglevel error -i "$OUT/silent.mp4" -i public/audio/narration.mp3 -i public/audio/music.mp3 \
  -filter_complex "[1:a]volume=1.0[vo];[2:a]volume=-18dB,afade=t=out:st=107:d=4[mu];[vo][mu]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest "$OUT/final.mp4" || { echo "FAILED mix" >> "$LOG"; exit 1; }

mkdir -p /mnt/documents
cp "$OUT/final.mp4" /mnt/documents/EDSquare-explainer-v2.mp4
cp "$OUT/final.mp4" out/EDSquare-explainer.mp4
echo "DONE $(date -u +%T)" >> "$LOG"
