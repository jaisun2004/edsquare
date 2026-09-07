import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition, openBrowser } from "@remotion/renderer";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const [start, end, out] = process.argv.slice(2);

const bundled = await bundle({ entryPoint: path.resolve(__dirname, "../src/index.ts"), webpackOverride: (c) => c });
const browser = await openBrowser("chrome", {
  browserExecutable: process.env.PUPPETEER_EXECUTABLE_PATH ?? "/bin/chromium",
  chromiumOptions: { args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] },
  chromeMode: "chrome-for-testing",
});
const composition = await selectComposition({ serveUrl: bundled, id: "main", puppeteerInstance: browser });

let last = -1;
await renderMedia({
  composition,
  serveUrl: bundled,
  codec: "h264",
  imageFormat: "jpeg",
  jpegQuality: 90,
  frameRange: [Number(start), Number(end)],
  outputLocation: out,
  puppeteerInstance: browser,
  muted: true,
  concurrency: 12,
  onProgress: ({ progress }) => {
    const p = Math.round(progress * 100);
    if (p !== last && p % 5 === 0) { last = p; console.log("progress", p); }
  },
});
await browser.close({ silent: false });
console.log("done", out);
