#!/usr/bin/env node
// Inventory of a single-file HTML proposal: the raw counts the analysis starts from.
//
//   node inventory-mock.mjs <proposal.html> [--json]
//
// Static and read-only: it evaluates nothing in the file. It lists CANDIDATES. Whether
// a screen is reachable, or a button does anything, is decided by reading the
// navigation code this prints, not by this script.
import fs from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("usage: inventory-mock.mjs <proposal.html> [--json]");
  process.exit(2);
}
const html = fs.readFileSync(file, "utf8");
const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
const js = scripts.join("\n");
const markup = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "");
const uniq = (xs) => [...new Set(xs)];
const count = (re, s = html) => (s.match(re) || []).length;

// --- screens: containers that look like a page, and whether anything navigates to them
const SCREEN = /<(?:section|div|main|article)\b[^>]*>/gi;
const screens = [];
for (const [tag] of markup.matchAll(SCREEN)) {
  const id = tag.match(/\bid="([^"]+)"/)?.[1];
  const cls = tag.match(/\bclass="([^"]+)"/)?.[1] ?? "";
  if (!id) continue;
  const byClass = /(^|\s)(screen|view|page|tab-panel|tela)(\s|$)/i.test(cls);
  const byId = /^(screen|view|page|tela)[-_]/i.test(id);
  if (!byClass && !byId) continue;
  const key = id.replace(/^(screen|view|page|tela)[-_]/i, "");
  const navRefs =
    count(new RegExp(`data-(?:screen|view|page|target)="${key}"`, "g"), markup) +
    count(new RegExp(`href="#${id}"`, "g"), markup) +
    count(new RegExp(`on\\w+="[^"]*['"]${key}['"]`, "g"), markup);
  screens.push({ id, active: /\bactive\b/.test(cls), nav_refs_in_markup: navRefs, mentions_in_js: count(new RegExp(`['"]${key}['"]`, "g"), js) });
}

// --- navigation functions: printed so a person (or the agent) reads the guards
const navFns = [];
for (const m of js.matchAll(/function\s+((?:show|go|nav|open|switch|set)\w*(?:Screen|View|Page|Tab|Tela)\w*)\s*\(([^)]*)\)\s*\{/g)) {
  const head = js.slice(m.index, m.index + 700).split("\n").slice(0, 8).join("\n");
  navFns.push({ name: m[1], first_lines: head });
}

// --- handlers: what the markup calls, and how often
const handlers = {};
// (searched in the whole file: mocks build most of their markup inside JS strings)
for (const m of html.matchAll(/\bon(click|change|input|submit|keydown)=\\?["']\s*([A-Za-z_$][\w$.]*)\s*\(/g)) {
  handlers[m[2]] = (handlers[m[2]] ?? 0) + 1;
}

// --- data: top-level literals, with their size (the fixture the back-end must own)
const data = [];
for (const m of js.matchAll(/^([ \t]*)(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=\s*([[{])/gm)) {
  const nested = m[1].length > 0;
  const open = m[3], close = open === "[" ? "]" : "}";
  let depth = 0, i = m.index + m[0].length - 1, quote = null;
  for (; i < js.length; i++) {
    const c = js[i];
    if (quote) { if (c === "\\") i++; else if (c === quote) quote = null; continue; }
    if (c === "'" || c === '"' || c === "`") { quote = c; continue; }
    if (c === open) depth++;
    else if (c === close && --depth === 0) break;
  }
  const body = js.slice(m.index + m[0].length - 1, i + 1);
  if (body.length < (nested ? 400 : 120)) continue;
  const items = open === "[" ? count(/^\s*[{[]/gm, body.slice(1)) || undefined : undefined;
  data.push({ name: m[2], nested, kind: open === "[" ? "array" : "object", bytes: body.length, approx_items: items });
}

// --- files named on screen: each one is a document the POC has to make real
const files = uniq([...html.matchAll(/([\wÀ-ÿ][\wÀ-ÿ.\- ]{0,60}[\wÀ-ÿ)]\.(?:pdf|xml|xlsx|xls|csv|eml|docx|json|zip))\b/gi)].map((m) => m[1].trim()))
  .filter((f) => !/^https?:/i.test(f)).sort();

const out = {
  file,
  bytes: html.length,
  inline_scripts: scripts.length,
  js_lines: js.split("\n").length,
  external_resources: uniq([...html.matchAll(/<(?:script|link|img)[^>]+(?:src|href)="(https?:[^"]+)"/gi)].map((m) => m[1])),
  screens,
  navigation_functions: navFns,
  handlers: Object.entries(handlers).sort((a, b) => b[1] - a[1]).map(([name, uses]) => ({ name, uses })),
  overlays: uniq([...markup.matchAll(/\bid="([^"]*(?:drawer|modal|dialog|viewer|lightbox|popover))"/gi)].map((m) => m[1])),
  data,
  files_named: files,
  listeners_in_js: count(/\.addEventListener\s*\(/g, js),
  functions: count(/\bfunction\s+[A-Za-z_$][\w$]*\s*\(/g, js),
  simulated_waits: count(/\bset(?:Timeout|Interval)\s*\(/g, js),
  network_calls: count(/\bfetch\s*\(|XMLHttpRequest/g, js),
  browser_storage: count(/\b(?:local|session)Storage\b/g, js),
};

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(out, null, 2));
} else {
  const kb = (n) => `${(n / 1024).toFixed(1)} kB`;
  console.log(`${out.file}\n  ${kb(out.bytes)} · ${out.inline_scripts} inline script(s), ${out.js_lines} lines of JS · ${out.functions} functions`);
  console.log(`  network calls: ${out.network_calls} · simulated waits (timers): ${out.simulated_waits} · browser storage: ${out.browser_storage}`);
  console.log(`\nSCREEN CANDIDATES (${screens.length}) — nav refs in markup / mentions in JS`);
  for (const s of screens) console.log(`  ${s.active ? "*" : " "} ${s.id.padEnd(28)} ${String(s.nav_refs_in_markup).padStart(2)} / ${s.mentions_in_js}`);
  console.log("  (* = the one open on load. 0 nav refs is a candidate for unreachable: read the functions below.)");
  console.log(`\nNAVIGATION FUNCTIONS (${navFns.length})`);
  for (const f of navFns) console.log(f.first_lines.split("\n").map((l) => "  | " + l).join("\n") + "\n");
  console.log(`HANDLERS CALLED FROM MARKUP (${out.handlers.length}) · listeners attached in JS: ${out.listeners_in_js}`);
  for (const h of out.handlers) console.log(`  ${h.name.padEnd(28)} ${h.uses}`);
  console.log(`\nOVERLAYS (${out.overlays.length}): ${out.overlays.join(" · ") || "none"}`);
  console.log(`\nDATA LITERALS (${data.length})`);
  for (const d of data) console.log(`  ${d.name.padEnd(20)} ${d.kind.padEnd(6)} ${kb(d.bytes).padStart(9)}${d.approx_items ? `  ~${d.approx_items} items` : ""}${d.nested ? "  (inside a function)" : ""}`);
  console.log(`\nFILES NAMED ON SCREEN (${files.length})`);
  for (const f of files) console.log(`  ${f}`);
  if (out.external_resources.length) console.log(`\nEXTERNAL RESOURCES (${out.external_resources.length})\n  ${out.external_resources.join("\n  ")}`);
}
