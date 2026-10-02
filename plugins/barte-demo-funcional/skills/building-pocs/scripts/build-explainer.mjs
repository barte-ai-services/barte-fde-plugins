#!/usr/bin/env node
// Builds the explainer PDF from its HTML source, and checks every page.
//
//   node build-explainer.mjs explainer.html [--out como-a-poc-funciona.pdf]
//
// Next to the HTML it expects `brand/` (from extract-brand.mjs) and `fig/` (from
// capture-screens.mjs). It:
//   1. puts the logo where the source says {{LOGO}} and {{SYMBOL}};
//   2. measures each page and fails when the content runs past the footer, because
//      a page is a fixed sheet and what overflows is cut, silently;
//   3. prints the PDF;
//   4. renders each page to `pages/pNN.jpg`, to be looked at before it is sent.
//
// Exit code 1 means a page overflowed or an image did not load. The PDF is not
// written in that case.

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { launch } from "./lib/browser.mjs";

const args = process.argv.slice(2);
const sourceArg = args.find((a) => !a.startsWith("--"));
if (!sourceArg) {
  console.error("usage: node build-explainer.mjs explainer.html [--out file.pdf]");
  process.exit(2);
}
const source = resolve(sourceArg);
const dir = dirname(source);
const outFlag = args.indexOf("--out");
const pdfFile = resolve(outFlag >= 0 ? args[outFlag + 1] : join(dir, "como-a-poc-funciona.pdf"));
const MIN_GAP_PX = 12; // closer than this to the footer reads as a collision

let html = readFileSync(source, "utf8");
for (const [mark, file] of [["{{LOGO}}", "brand/logo.svg"], ["{{SYMBOL}}", "brand/symbol.svg"]]) {
  if (!html.includes(mark)) continue;
  const path = join(dir, file);
  if (!existsSync(path)) {
    console.error(`${file} is missing next to the source: run extract-brand.mjs first.`);
    process.exit(1);
  }
  html = html.replaceAll(mark, readFileSync(path, "utf8"));
}
const built = join(dir, ".explainer.build.html");
writeFileSync(built, html);

// A4 at 96 dpi. The page boxes are sized in millimetres, so this matches print.
const page = await launch({ width: 794, height: 1123, scale: 1.5 });
let problems = 0;
try {
  await page.cdp("Emulation.setEmulatedMedia", { media: "print" });
  await page.goto(pathToFileURL(built).href);
  await page.evaluate("document.fonts.ready.then(() => true)");
  await page.sleep(600);

  const broken = await page.evaluate(`[...document.images].filter((i) => !i.complete || !i.naturalWidth).map((i) => i.getAttribute("src"))`);
  for (const src of broken) { console.error(`image did not load: ${src}`); problems++; }

  const sheets = await page.evaluate(`[...document.querySelectorAll(".page")].map((sheet, index) => {
    const box = sheet.getBoundingClientRect();
    const footer = sheet.querySelector(".foot");
    const limit = (footer ? footer.getBoundingClientRect().top : box.bottom) - box.top;
    let bottom = 0;
    for (const el of sheet.querySelectorAll(":scope > *:not(.foot)")) bottom = Math.max(bottom, el.getBoundingClientRect().bottom - box.top);
    return { n: index + 1, y: box.top + scrollY, width: box.width, height: box.height, gap: Math.round(limit - bottom) };
  })`);
  if (!sheets.length) throw new Error('the source has no element with class "page"');

  for (const sheet of sheets) {
    const tight = sheet.gap < MIN_GAP_PX;
    if (tight) problems++;
    console.log(`page ${String(sheet.n).padStart(2)}  ${tight ? "OVERFLOWS" : "ok"}  ${sheet.gap} px to spare`);
  }

  const pagesDir = join(dir, "pages");
  rmSync(pagesDir, { recursive: true, force: true });
  mkdirSync(pagesDir, { recursive: true });
  for (const sheet of sheets) {
    const shot = await page.cdp("Page.captureScreenshot", {
      format: "jpeg", quality: 82, captureBeyondViewport: true,
      clip: { x: 0, y: sheet.y, width: sheet.width, height: sheet.height, scale: 1 },
    });
    writeFileSync(join(pagesDir, `p${String(sheet.n).padStart(2, "0")}.jpg`), Buffer.from(shot.data, "base64"));
  }

  if (problems) {
    console.error(`\n${problems} problem(s): fix the source and build again. Look at pages/ to see where. No PDF written.`);
  } else {
    const pdf = await page.cdp("Page.printToPDF", { printBackground: true, preferCSSPageSize: true, displayHeaderFooter: false });
    const bytes = Buffer.from(pdf.data, "base64");
    writeFileSync(pdfFile, bytes);
    console.log(`\nok  ${pdfFile}  ${sheets.length} pages, ${(bytes.length / 1048576).toFixed(1)} MB`);
    console.log(`    look at every page in ${pagesDir} before sending it.`);
  }
} catch (error) {
  console.error(`FAILED: ${error.message}`);
  problems++;
} finally {
  await page.close();
  rmSync(built, { force: true });
}
process.exit(problems ? 1 : 0);
