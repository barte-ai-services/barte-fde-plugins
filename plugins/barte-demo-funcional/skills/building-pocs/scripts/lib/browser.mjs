// Drives a headless Chromium-based browser over the DevTools protocol.
//
// No dependency: Node 22+ ships the WebSocket client, and the browser is the one
// already on the machine (Chrome, Edge, Chromium or Brave). Set BROWSER_BIN to
// point at another one.

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CANDIDATES = {
  darwin: [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
  ],
  linux: ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/microsoft-edge"],
  win32: [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  ],
};

export function findBrowser() {
  const given = process.env.BROWSER_BIN;
  if (given) {
    if (!existsSync(given)) throw new Error(`BROWSER_BIN points at a file that does not exist: ${given}`);
    return given;
  }
  const found = (CANDIDATES[process.platform] ?? []).find((path) => existsSync(path));
  if (!found) throw new Error("no Chromium-based browser found: install Chrome or Edge, or set BROWSER_BIN");
  return found;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Starts the browser and returns a small page driver.
 * `scale` is the device pixel ratio: 2 gives screenshots sharp enough for print.
 */
export async function launch({ width = 1440, height = 900, scale = 1 } = {}) {
  const profile = mkdtempSync(join(tmpdir(), "poc-browser-"));
  const child = spawn(findBrowser(), [
    "--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`,
    `--window-size=${width},${height}`, "--hide-scrollbars", "--no-first-run", "--disable-gpu", "about:blank",
  ], { stdio: ["ignore", "ignore", "pipe"] });

  // With port 0 the browser picks a free port and announces it on stderr.
  const port = await new Promise((resolve, reject) => {
    let seen = "";
    const timer = setTimeout(() => reject(new Error("the browser did not open its debugging port in 20 s")), 20000);
    child.stderr.on("data", (chunk) => {
      seen += chunk;
      const match = seen.match(/DevTools listening on ws:\/\/[^:]+:(\d+)\//);
      if (match) { clearTimeout(timer); resolve(Number(match[1])); }
    });
    child.on("exit", (code) => { clearTimeout(timer); reject(new Error(`the browser exited with code ${code}`)); });
  });

  let target;
  for (let i = 0; i < 40 && !target; i++) {
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === "page"); } catch {}
    if (!target) await sleep(250);
  }
  if (!target) throw new Error("the browser opened no page");

  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let sequence = 0;
  const pending = new Map();
  socket.onmessage = (message) => {
    const data = JSON.parse(message.data);
    if (data.id && pending.has(data.id)) { pending.get(data.id)(data); pending.delete(data.id); }
  };

  const cdp = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, (data) => (data.error ? reject(new Error(`${method}: ${data.error.message}`)) : resolve(data.result)));
    socket.send(JSON.stringify({ id, method, params }));
  });

  const evaluate = async (expression) => {
    const out = await cdp("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (out.exceptionDetails) throw new Error(`page script failed: ${out.exceptionDetails.exception?.description ?? out.exceptionDetails.text}`);
    return out.result?.value;
  };

  const waitFor = async (selector, timeout = 20000) => {
    const query = `!!document.querySelector(${JSON.stringify(selector)})`;
    for (let waited = 0; waited < timeout; waited += 200) {
      if (await evaluate(query)) return;
      await sleep(200);
    }
    throw new Error(`nothing matched ${selector} within ${timeout / 1000} s`);
  };

  await cdp("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: scale, mobile: false });

  return {
    cdp, evaluate, waitFor, sleep,
    async goto(url) { await cdp("Page.navigate", { url }); await sleep(800); },
    async click(selector) { await waitFor(selector); await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`); },
    async close() {
      try { socket.close(); } catch {}
      child.kill();
      await sleep(300);
      try { rmSync(profile, { recursive: true, force: true }); } catch {}
    },
  };
}
