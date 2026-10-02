import { Inject, Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { QUEUE } from "../cloud/cloud.module";
import type { Queue } from "../cloud/ports";
import { ItemsService } from "../items/items.service";
import { EventsService } from "../events/events.service";
import { ProvisioningService } from "../provisioning/provisioning.service";
import { TelemetryService } from "../telemetry/telemetry.service";
import { FlowService } from "../flow/flow.service";
import { RulesEngine } from "./engine-rules";
import { ClaudeEngine } from "./engine-claude";
import type { Engine } from "./types";
import { extract } from "./tools";
import type { Decision } from "../items/types";

@Injectable()
export class AgentService implements OnApplicationBootstrap {
  private readonly log = new Logger(AgentService.name);
  private readonly engine: Engine;

  constructor(
    @Inject(QUEUE) private readonly queue: Queue,
    private readonly items: ItemsService,
    private readonly events: EventsService,
    private readonly provisioning: ProvisioningService,
    private readonly telemetry: TelemetryService,
    private readonly flow: FlowService,
  ) {
    // The choice is environment, not code: the screen does not know which engine
    // ran, and switching between them is one line in `.env`.
    this.engine = process.env.AGENT_ENGINE === "claude" ? new ClaudeEngine() : new RulesEngine();
    this.log.log(`agent engine: ${this.engine.name}`);
  }

  async onApplicationBootstrap() {
    // The order matters and is the only one that works: provisioning creates what
    // exists, import brings what storage holds, and only then does the loop have
    // anything to consume.
    await this.provisioning.provision();
    await this.items.import();
    void this.consume();
  }

  /** Queues every pending item. This is what the "run pipeline" button triggers. */
  async run(): Promise<number> {
    const pending = (await this.items.list()).filter((i) => i.state === "pending");
    for (const item of pending) {
      await this.telemetry.measure("queue", "send work", () => this.queue.send(item.id));
    }
    return pending.length;
  }

  /**
   * The worker loop, in the same process as the API.
   *
   * In a real installation this is a separate service — and that is exactly the
   * conversation the demo opens: work already arrives through a queue, so
   * splitting it is changing where the process runs, not rewriting the flow.
   */
  private async consume(): Promise<void> {
    for (;;) {
      try {
        // The 10s wait is NOT measured: it hangs by design, and recording it
        // would fill the telemetry with 10,000 ms lines that are not work.
        const messages = await this.queue.receive(10);
        for (const message of messages) {
          await this.telemetry.measure("agent", `process ${message.body}`, () =>
            this.process(message.body),
          );
          // The acknowledgement comes AFTER processing: if the process dies
          // midway, the message returns to the queue instead of taking the work
          // with it.
          await this.telemetry.measure("queue", "ack", () => message.ack());
        }
      } catch (error) {
        this.log.error(`worker loop: ${(error as Error).message}`);
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }

  private async process(itemId: string): Promise<void> {
    const item = await this.items.find(itemId);
    if (!item || item.state !== "pending") return;

    await this.items.save({ ...item, state: "processing" });
    this.events.publish({ type: "item", item_id: itemId });

    const decisions: Decision[] = [];
    const knownKeys = (await this.items.list())
      .filter((i) => i.id !== itemId && i.state === "ready")
      .map((i) => extract(i.document).key);

    // The flow is read for EVERY document, not once at startup: whoever edited
    // the panel in front of the client expects the NEXT document to follow the
    // new flow — and expects that without restarting anything.
    const flow = await this.flow.current();

    const outcome = await this.engine.process({
      document: item.document,
      flow,
      knownKeys,
      step: (step, state) => this.events.publish({ type: "step", item_id: itemId, step, state }),
      decide: (action, reason, confidence) => {
        const decision: Decision = {
          agent: this.engine.name,
          action,
          reason,
          confidence,
          at: new Date().toISOString(),
        };
        decisions.push(decision);
        this.events.publish({
          type: "decision",
          item_id: itemId,
          agent: decision.agent,
          action,
          reason,
          confidence,
        });
      },
    });

    if (outcome.review) this.events.publish({ type: "exception", item_id: itemId, reason: outcome.review });

    await this.items.save({
      ...item,
      state: outcome.review ? "review" : "ready",
      proposal: outcome.proposal,
      review_reason: outcome.review,
      decisions,
      updated_at: new Date().toISOString(),
    });
    this.events.publish({ type: "item", item_id: itemId });
  }
}
