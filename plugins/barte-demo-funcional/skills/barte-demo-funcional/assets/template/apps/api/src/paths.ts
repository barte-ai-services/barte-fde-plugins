import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

/**
 * Where the demo's data lives (`data/`).
 *
 * Walks up from this file until it finds the folder, instead of counting from
 * `cwd`: `npm run dev` runs from `apps/api`, `make` runs from the repo root, and
 * the compiled Nest runs from `dist/` — three different working directories for
 * the same repository. A cwd-relative path gets one of the three right and fails
 * silently on the other two, with the demo coming up EMPTY, which is the worst
 * way to fail right before a meeting.
 */
export function dataDir(): string {
  const explicit = process.env.DATA_DIR;
  if (explicit) return explicit;

  let dir = __dirname;
  for (let i = 0; i < 8; i += 1) {
    const candidate = resolve(dir, "data");
    if (existsSync(resolve(candidate, "documents"))) return candidate;
    const up = dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error(`could not find the \`data/\` folder walking up from ${__dirname} — point DATA_DIR at it`);
}
