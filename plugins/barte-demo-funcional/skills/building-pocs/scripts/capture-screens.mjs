#!/usr/bin/env node
// Photographs a running POC for the explainer document.
//
//   node capture-screens.mjs shots.json [--out fig]
//
// The shot list is a script of what a person would do: click, wait, photograph.
// It uses the same hooks the guided demonstration uses (data-tour, data-lanc…),
// so a figure can be retaken after any change to the screen.
//
//   {
//     "url": "http://127.0.0.1:3210/",
//     "viewport": { "width": 1440, "height": 1500, "scale": 2 },
//     "ready": "[data-tour=\"nav-despesas\"]",
//     "steps": [
//       { "click": "[data-lanc=\"4476\"]" },
//       { "shot": "overview", "of": "#content", "maxHeight": 1000 },
//       { "click": ".inbox .ev-hd.click" }, { "waitFor": ".mail" }, { "wait": 800 },
//       { "shot": "panel", "of": ".agent-col" }
//     ]
//   }
//
// Steps: click, waitFor, wait (ms), eval (page script), resize ({width, height})
// and shot. A shot with `of` is cut to that element; without it, the whole window.
// The output is PNG at `scale` times the window size. Take the photographs from
// the opening state: restart the POC first.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { launch } from "./lib/browser.mjs";

const args = process.argv.slice(2);
const listFile = args.find((a) => !a.startsWith("--"));
if (!listFile) {
  console.error("usage: node capture-screens.mjs shots.json [--out fig]");
  process.exit(2);
}
const outFlag = args.indexOf("--out");
const outDir = resolve(outFlag >= 0 ? args[outFlag + 1] : join(dirname(listFile), "fig"));
const list = JSON.parse(readFileSync(listFile, "utf8"));
const viewport = { width: 1440, height: 900, scale: 2, ...(list.viewport ?? {}) };
const SETTLE_MS = 700; // transitions and drawers finish sliding before a photograph or the next click

mkdirSync(outDir, { recursive: true });
const page = await launch(viewport);
let failed = false;
try {
  await page.goto(list.url);
  if (list.ready) await page.waitFor(list.ready, 60000);
  await page.sleep(1200);

  for (const [index, step] of list.steps.entries()) {
    const where = `step ${index + 1}`;
    if (step.click) {
      await page.click(step.click);
      await page.sleep(SETTLE_MS);
    } else if (step.waitFor) {
      await page.waitFor(step.waitFor, step.timeout ?? 20000);
    } else if (step.wait) {
      await page.sleep(step.wait);
    } else if (step.eval) {
      await page.evaluate(step.eval);
    } else if (step.resize) {
      // A tall window shows a whole column; a short one keeps a drawer's footer in the picture.
      Object.assign(viewport, step.resize);
      await page.cdp("Emulation.setDeviceMetricsOverride", { width: viewport.width, height: viewport.height, deviceScaleFactor: viewport.scale, mobile: false });
      await page.sleep(SETTLE_MS);
    } else if (step.shot) {
      await page.sleep(SETTLE_MS);
      let clip;
      if (step.of) {
        await page.waitFor(step.of);
        const box = await page.evaluate(`(() => { const r = document.querySelector(${JSON.stringify(step.of)}).getBoundingClientRect();
          return { x: r.left, y: r.top, width: r.width, height: r.height }; })()`);
        if (!box.width || !box.height) throw new Error(`${where}: ${step.of} has no size (is it hidden?)`);
        clip = { ...box, height: step.maxHeight ? Math.min(box.height, step.maxHeight) : box.height, scale: 1 };
      } else if (step.clip) {
        clip = { ...step.clip, scale: 1 };
      }
      const shot = await page.cdp("Page.captureScreenshot", { format: "png", ...(clip ? { clip } : {}) });
      const file = join(outDir, `${step.shot}.png`);
      writeFileSync(file, Buffer.from(shot.data, "base64"));
      console.log(`ok  ${step.shot}.png${clip ? `  ${Math.round(clip.width)}×${Math.round(clip.height)} px` : ""}`);
    } else {
      throw new Error(`${where}: unknown step ${JSON.stringify(step)}`);
    }
  }
} catch (error) {
  console.error(`FAILED: ${error.message}`);
  failed = true;
} finally {
  await page.close();
}
process.exit(failed ? 1 : 0);
