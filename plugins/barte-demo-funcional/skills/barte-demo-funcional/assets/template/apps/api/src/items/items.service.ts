import { Inject, Injectable, Logger } from "@nestjs/common";
import type { Pool } from "pg";
import { STORAGE } from "../cloud/cloud.module";
import type { Storage } from "../cloud/ports";
import { PG } from "../db/db.module";
import { TelemetryService } from "../telemetry/telemetry.service";
import type { Document, Item } from "./types";
import { rebase } from "./rebase";

@Injectable()
export class ItemsService {
  private readonly log = new Logger(ItemsService.name);

  constructor(
    @Inject(STORAGE) private readonly files: Storage,
    @Inject(PG) private readonly pg: Pool,
    private readonly telemetry: TelemetryService,
  ) {}

  /**
   * Brings every document in storage that has not become an item yet.
   *
   * Never overwrites an existing item: what the agent already decided survives a
   * restart — which is what lets you close the laptop after a meeting and reopen
   * at the same point.
   */
  async import(): Promise<number> {
    const keys = await this.telemetry.measure("storage", "list documents/", () =>
      this.files.list("documents/"),
    );

    // Two passes: the first one only to find the most recent document in the
    // batch, which is what defines the shift for ALL of them. Rebasing each by
    // its own timestamp would make the whole batch arrive at the same instant and
    // erase the order in which things happened.
    const documents: Document[] = [];
    for (const key of keys) {
      if (!key.endsWith(".json")) continue;
      const body = await this.telemetry.measure("storage", `read ${key}`, () => this.files.read(key));
      documents.push(JSON.parse(body) as Document);
    }
    const mostRecent = documents
      .map((d) => d.receivedAt)
      .sort()
      .at(-1);

    let added = 0;
    for (const raw of documents) {
      if (await this.find(raw.id)) continue;
      const document = mostRecent ? rebase(raw, mostRecent) : raw;
      await this.save({
        id: document.id,
        document,
        state: "pending",
        proposal: null,
        reviewReason: null,
        decisions: [],
        updatedAt: new Date().toISOString(),
      });
      added += 1;
    }
    if (added) this.log.log(`${added} document(s) imported from storage`);
    return added;
  }

  async list(): Promise<Item[]> {
    // Most recent first: today's batch — what the agent will process in front of
    // the client — has to open at the top, above the seeded history.
    const r = await this.telemetry.measure("postgres", "SELECT items", () =>
      this.pg.query("SELECT * FROM items ORDER BY received_at DESC"),
    );
    return r.rows.map(fromRow);
  }

  async find(id: string): Promise<Item | null> {
    const r = await this.telemetry.measure("postgres", "SELECT item by id", () =>
      this.pg.query("SELECT * FROM items WHERE id = $1", [id]),
    );
    return r.rows[0] ? fromRow(r.rows[0]) : null;
  }

  async save(item: Item): Promise<void> {
    const amount = Number((item.document.content as Record<string, unknown>).valorTotal ?? 0);
    await this.telemetry.measure("postgres", "UPSERT item", () =>
      this.pg.query(
        `INSERT INTO items (id, state, received_at, amount, review_reason, document, proposal, decisions, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
         ON CONFLICT (id) DO UPDATE SET
           state = EXCLUDED.state,
           amount = EXCLUDED.amount,
           review_reason = EXCLUDED.review_reason,
           document = EXCLUDED.document,
           proposal = EXCLUDED.proposal,
           decisions = EXCLUDED.decisions,
           updated_at = now()`,
        [
          item.id,
          item.state,
          item.document.receivedAt,
          amount,
          item.reviewReason,
          JSON.stringify(item.document),
          item.proposal ? JSON.stringify(item.proposal) : null,
          JSON.stringify(item.decisions),
        ],
      ),
    );
  }
}

/**
 * Database row to application item.
 *
 * `jsonb` comes back from `pg` already deserialized, so there is no `JSON.parse`
 * here — calling it on an object is the mistake that yields
 * "[object Object] is not valid JSON" at runtime and sails through compilation.
 */
function fromRow(row: Record<string, unknown>): Item {
  return {
    id: row.id as string,
    document: row.document as Item["document"],
    state: row.state as Item["state"],
    proposal: (row.proposal as Item["proposal"]) ?? null,
    reviewReason: (row.review_reason as string | null) ?? null,
    decisions: (row.decisions as Item["decisions"]) ?? [],
    updatedAt: new Date(row.updated_at as string).toISOString(),
  };
}
