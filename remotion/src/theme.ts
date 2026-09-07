import { loadFont as loadSora } from "@remotion/google-fonts/Sora";
import { loadFont as loadManrope } from "@remotion/google-fonts/Manrope";

export const display = loadSora("normal", { weights: ["600", "700"], subsets: ["latin"] }).fontFamily;
export const body = loadManrope("normal", { weights: ["400", "500", "600"], subsets: ["latin"] }).fontFamily;

export const C = {
  ink: "#1B0B33",
  violet: "#5B10A8",
  violetDeep: "#2E0A52",
  violetSoft: "#EDE4FA",
  accent: "#8B2FD6",
  bg: "#F6F3FB",
  card: "#FFFFFF",
  line: "#DCD0EE",
  muted: "#6B5B85",
  red: "#D92D20",
  green: "#0E9F6E",
  amber: "#F0A202",
};

export const FPS = 30;

/** scene boundaries in frames (30fps), matched to the narration track */
export const SCENES = {
  intro: { from: 0, dur: 408 },
  flow1: { from: 408, dur: 663 },
  outcomes: { from: 1071, dur: 372 },
  flow2: { from: 1443, dur: 747 },
  flow3: { from: 2190, dur: 549 },
  results: { from: 2739, dur: 366 },
  close: { from: 3105, dur: 243 },
};

export const TOTAL = 3348;
