import { Inject, Injectable, Logger } from "@nestjs/common";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse, stringify } from "yaml";
import type { Pool } from "pg";
import { PG } from "../db/db.module";
import { dataDir } from "../paths";
import { EventsService } from "../events/events.service";
import { ACTIONS, CONDITIONS } from "./catalog";
import { flowSchema, type Flow } from "./types";

/** What validation throws when the flow will not do. */
export class InvalidFlow extends Error {
  constructor(readonly problems: string[]) {
    super(problems.join("; "));
  }
}

@Injectable()
export class FlowService {
  private readonly log = new Logger(FlowService.name);

  constructor(
    @Inject(PG) private readonly pg: Pool,
    private readonly events: EventsService,
  ) {}

  /** The flow in the file — the seed, and where "back to original" goes. */
  fromFile(): Flow {
    const text = readFileSync(resolve(dataDir(), "flow.yaml"), "utf8");
    return this.validate(parse(text));
  }

  async current(): Promise<Flow> {
    const r = await this.pg.query<{ definition: unknown }>(
      "SELECT definition FROM flow WHERE id = 'current'",
    );
    if (r.rows[0]) return r.rows[0].definition as Flow;
    // First boot: the database has never seen a flow.
    const fromFile = this.fromFile();
    await this.store(fromFile);
    return fromFile;
  }

  /**
   * Validates BEFORE storing, and returns the problems in Portuguese.
   *
   * Whoever edits this is in a meeting, live, and probably not a developer: a
   * validation error must not take down the running flow nor talk about
   * "ZodError". What does not pass simply is not applied, and what was on the air
   * stays on the air.
   */
  validate(raw: unknown): Flow {
    const r = flowSchema.safeParse(raw);
    if (!r.success) {
      throw new InvalidFlow(
        r.error.issues.map((i) => {
          const where = i.path.length ? `${i.path.join(".")}: ` : "";
          return `${where}${i.message}`;
        }),
      );
    }

    const flow = r.data;
    const problems: string[] = [];

    const seen = new Set<string>();
    for (const step of flow.steps) {
      if (seen.has(step.id)) problems.push(`a etapa "${step.id}" aparece duas vezes`);
      seen.add(step.id);

      if (!ACTIONS[step.action]) {
        problems.push(
          `a etapa "${step.label}" usa uma ação que não existe: "${step.action}" (as que existem: ${Object.keys(ACTIONS).join(", ")})`,
        );
      }
      for (const condition of step.escalate_if) {
        if (!CONDITIONS[condition]) {
          problems.push(
            `a etapa "${step.label}" usa uma regra que não existe: "${condition}" (as que existem: ${Object.keys(CONDITIONS).join(", ")})`,
          );
        }
      }
    }

    // A pipeline without the step that proposes never concludes anything: every
    // document would end in human review, and the demo would start claiming the
    // agent solves nothing. This is a warning, not an error — it may be exactly
    // what you want to show at one point in the narrative.
    if (!flow.steps.some((s) => s.action === "propose")) {
      this.log.warn("flow has no `propose` action: no document will conclude on its own");
    }

    if (problems.length) throw new InvalidFlow(problems);
    return flow;
  }

  /** Applies a new flow. Takes effect from the NEXT document processed. */
  async save(raw: unknown): Promise<Flow> {
    const flow = this.validate(raw);
    await this.store(flow);
    // The screen redraws the pipeline on its own when it sees this — no page
    // reload, which in a meeting is the moment someone asks whether it broke.
    this.events.publish({ type: "flow" });
    this.log.log(`flow updated: ${flow.steps.length} step(s)`);
    return flow;
  }

  /** Takes the YAML as text — that is what the file tab's editor sends. */
  async saveText(text: string): Promise<Flow> {
    let raw: unknown;
    try {
      raw = parse(text);
    } catch (error) {
      // The YAML parser's message is technical, but it names the LINE — and in a
      // meeting that is more useful than a polite "invalid file".
      throw new InvalidFlow([`o arquivo não é um YAML válido — ${(error as Error).message}`]);
    }
    return this.save(raw);
  }

  async restore(): Promise<Flow> {
    return this.save(this.fromFile());
  }

  /** The current flow as text, to open in the editor. */
  async asText(): Promise<string> {
    return stringify(await this.current());
  }

  private async store(flow: Flow): Promise<void> {
    await this.pg.query(
      `INSERT INTO flow (id, definition, updated_at) VALUES ('current', $1, now())
       ON CONFLICT (id) DO UPDATE SET definition = EXCLUDED.definition, updated_at = now()`,
      [JSON.stringify(flow)],
    );
  }
}
