import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition, openBrowser } from "@remotion/renderer";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const stillFrames = args
  .filter((a) => a.startsWith("--still="))
  .flatMap((a) => a.replace("--still=", "").split(",").map(Number));
const out = (args.find((a) => a.startsWith("--out=")) ?? "--out=/tmp/clipper-raw.mp4").replace("--out=", "");

const bundled = await bundle({
  entryPoint: path.resolve(__dirname, "../src/index.ts"),
  webpackOverride: (c) => c,
});

const browser = await openBrowser("chrome", {
  browserExecutable: process.env.PUPPETEER_EXECUTABLE_PATH ?? "/bin/chromium",
  chromiumOptions: { args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] },
  chromeMode: "chrome-for-testing",
});

const composition = await selectComposition({ serveUrl: bundled, id: "main", puppeteerInstance: browser });
console.log("composition", composition.width, composition.height, composition.durationInFrames);

if (stillFrames.length) {
  for (const f of stillFrames) {
    await renderStill({
      composition,
      serveUrl: bundled,
      output: `/tmp/browser/still-${f}.png`,
      frame: f,
      puppeteerInstance: browser,
      overwrite: true,
    });
    console.log("still", f);
  }
} else {
  await renderMedia({
    composition,
    serveUrl: bundled,
    codec: "h264",
    crf: 18,
    outputLocation: out,
    puppeteerInstance: browser,
    muted: true,
    concurrency: 2,
    onProgress: ({ progress }) => {
      if (Math.round(progress * 100) % 20 === 0) console.log("progress", Math.round(progress * 100));
    },
  });
  console.log("rendered", out);
}

await browser.close({ silent: false });
