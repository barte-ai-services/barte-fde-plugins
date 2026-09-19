import { Inject, Injectable, Logger } from "@nestjs/common";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Pool } from "pg";
import { QUEUE, STORAGE } from "../cloud/cloud.module";
import type { Queue, Storage } from "../cloud/ports";
import { PG } from "../db/db.module";
import { dataDir } from "../paths";
import { generateHistory } from "./history";

/**
 * Creates bucket, queue and schema, then seeds documents and history.
 *
 * In a real installation this is Terraform plus a migration tool, and the process
 * would NEVER create its own infrastructure. Here somebody has to play that part
 * and it is this service — with no extra container and, above all, no bind mount:
 * mounting a repository file inside a container depends on Docker Desktop's file
 * sharing, and where the path is not shared it mounts an empty DIRECTORY and
 * startup dies with a message that does not say so.
 *
 * Idempotent end to end: runs on every boot and never erases what the agent has
 * already decided.
 */
@Injectable()
export class ProvisioningService {
  private readonly log = new Logger(ProvisioningService.name);

  constructor(
    @Inject(STORAGE) private readonly files: Storage,
    @Inject(QUEUE) private readonly queue: Queue,
    @Inject(PG) private readonly pg: Pool,
  ) {}

  async provision(): Promise<void> {
    await this.schema();
    await this.files.ensure();
    await this.queue.ensure();
    await this.seedDocuments();
    await this.seedHistory();
  }

  private async schema(): Promise<void> {
    // The `.sql` is read from `dist/db/` — TypeScript compiles `.ts` and IGNORES
    // everything else, so without someone copying the file the process boots and
    // dies on the first `readFileSync`, with the routes already mapped (which
    // makes the log look healthy until the very last line). The copy is done by
    // `assets` in `nest-cli.json`, with `watchAssets` so it holds in development
    // too.
    const sql = readFileSync(resolve(__dirname, "../db/schema.sql"), "utf8");
    await this.pg.query(sql);
  }

  private async seedDocuments(): Promise<void> {
    const dir = resolve(dataDir(), "documents");
    let files: string[];
    try {
      files = readdirSync(dir).filter((f) => f.endsWith(".json"));
    } catch {
      this.log.warn(`no documents in ${dir} — the pipeline will come up empty`);
      return;
    }
    for (const file of files) {
      // Overwriting the object is harmless: what the agent decided lives in the
      // database, and the import never recreates an item that already exists.
      await this.files.write(
        `documents/${file}`,
        readFileSync(resolve(dir, file)),
        "application/json",
      );
    }
    this.log.log(`${files.length} document(s) in storage`);
  }

  /**
   * Puts the history in the database — once only.
   *
   * The test is "is the table empty?", not "does item hist-0001 exist?": whoever
   * deleted an item on purpose during a rehearsal does not want the generator
   * putting it back on the next boot. To start from scratch, `make clean`.
   */
  private async seedHistory(): Promise<void> {
    const r = await this.pg.query<{ n: string }>("SELECT count(*)::text AS n FROM items");
    if (Number(r.rows[0]?.n ?? 0) > 0) return;

    const items = generateHistory();
    for (const item of items) {
      const amount = Number((item.document.content as Record<string, unknown>).valorTotal ?? 0);
      await this.pg.query(
        `INSERT INTO items (id, state, received_at, amount, review_reason, document, proposal, decisions, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          item.id,
          item.state,
          item.document.received_at,
          amount,
          item.review_reason,
          JSON.stringify(item.document),
          item.proposal ? JSON.stringify(item.proposal) : null,
          JSON.stringify(item.decisions),
          item.updated_at,
        ],
      );
    }
    this.log.log(`${items.length} history item(s) seeded`);
  }
}
