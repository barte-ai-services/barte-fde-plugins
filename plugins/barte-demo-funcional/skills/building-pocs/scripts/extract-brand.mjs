#!/usr/bin/env node
// Takes Barte's logo and typeface from a running POC, for the explainer document.
//
//   node extract-brand.mjs http://127.0.0.1:3210/ brand
//
// The POC's web app already carries the real brand through the design system: the
// logo as inline SVG and Inter as embedded font files. Reading them from there
// keeps the document on the same brand as the screen, with nothing downloaded and
// nothing redrawn. Writes `logo.svg`, `symbol.svg` and `inter.css`.
//
// It reads Barte's brand only. The client's logo is never extracted or redrawn:
// in the document the client is a name in plain text.

import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const [url, outArg] = process.argv.slice(2);
if (!url) {
  console.error("usage: node extract-brand.mjs <url of the running POC> [out dir]");
  process.exit(2);
}
const outDir = resolve(outArg ?? "brand");

const get = async (address) => {
  const response = await fetch(address);
  if (!response.ok) throw new Error(`${address} answered ${response.status}`);
  return response.text();
};

const html = await get(url);

// The design system's <Logo type="full"> renders two SVGs side by side inside one
// element labelled "Barte": the symbol, then the wordmark.
const logoBlock = html.match(/aria-label="Barte"[^>]*>((?:\s*<svg[\s\S]*?<\/svg>){1,2})/);
if (!logoBlock) {
  console.error('no <Logo> labelled "Barte" in the page: is the web app using the design system? See references/branding.md.');
  process.exit(1);
}
const svgs = logoBlock[1].match(/<svg[\s\S]*?<\/svg>/g);
const symbol = svgs[0];
const wordmark = svgs[1] ?? "";

const sheets = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]*>/g)]
  .map((tag) => tag[0].match(/href="([^"]+)"/)?.[1])
  .filter(Boolean);
let css = "";
for (const href of sheets) css += await get(new URL(href, url));

// Latin and Latin Extended cover Portuguese. The heaviest weight is not used in print.
const seen = new Set();
const faces = [];
for (const face of css.match(/@font-face\{[^}]*\}/g) ?? []) {
  if (!/font-family:\s*"?Inter"?/.test(face)) continue;
  const weight = face.match(/font-weight:(\d+)/)?.[1] ?? "400";
  const range = face.match(/unicode-range:([^;}]*)/)?.[1] ?? "";
  const latin = range === "" || range.startsWith("U+??") || range.startsWith("U+0000") || range.startsWith("U+100-");
  if (!latin || Number(weight) > 800 || seen.has(weight + range)) continue;
  seen.add(weight + range);
  faces.push(face);
}
if (!faces.length) {
  console.error("no embedded Inter font in the page's stylesheets: the document would fall back to a system font.");
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "symbol.svg"), symbol);
writeFileSync(join(outDir, "logo.svg"), symbol + wordmark);
writeFileSync(join(outDir, "inter.css"), faces.join("\n"));
const weights = [...new Set(faces.map((f) => f.match(/font-weight:(\d+)/)?.[1]))].sort().join(", ");
console.log(`ok  ${outDir}: logo.svg, symbol.svg, inter.css (Inter ${weights})`);
