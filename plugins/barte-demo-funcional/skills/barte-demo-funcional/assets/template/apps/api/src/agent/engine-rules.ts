import type { Context, Engine, Outcome } from "./types";
import { loadRegistry, extract } from "./tools";
import { ACTIONS, CONDITIONS, type State } from "../flow/catalog";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * The engine that runs in the meeting.
 *
 * No API key, no internet, and the SAME input produces the SAME output — down to
 * the order of the decisions. This is not a poor man's version of the real
 * engine: it is a stage requirement. A demo that depends on hotel wifi, or that
 * decides differently on the second pass, breaks in front of the client — and it
 * breaks precisely when someone asks you to "run it again".
 *
 * It knows no steps: it walks the FLOW it was handed. Reordering steps, adding
 * one, or switching on another escalation rule does not go through this file — it
 * goes through the panel, or through `data/flow.yaml`.
 *
 * The pause between steps is deliberate: without it the nodes light up in the
 * same frame and nobody sees the work happen.
 */
export class RulesEngine implements Engine {
  readonly name = "rules";

  async process(ctx: Context): Promise<Outcome> {
    const state: State = {
      document: ctx.document,
      registry: loadRegistry(),
      extracted: extract(ctx.document),
      knownKeys: ctx.knownKeys,
      counterparty: null,
      classification: null,
      proposal: null,
    };

    for (const step of ctx.flow.steps) {
      ctx.step(step.id, "running");
      await wait(420);

      const action = ACTIONS[step.action];
      // An action outside the catalog should never reach this point — validation
      // refuses it before storing. If it did, the step is skipped rather than
      // taking processing down in the middle of a meeting.
      const decision = action ? action.run(state) : null;
      if (decision) ctx.decide(decision.action, decision.reason, decision.confidence);

      // Conditions are evaluated AFTER the action: the action is what discovers
      // the counterparty, and the condition is what judges what it found.
      for (const id of step.escalateIf) {
        const condition = CONDITIONS[id];
        if (!condition) continue;
        const verdict = condition.evaluate(state);
        if (!verdict.fired) continue;

        ctx.decide(
          "escalou para revisão",
          verdict.reason || condition.defaultReason.toLowerCase(),
          verdict.confidence,
        );
        ctx.step(step.id, "exception");
        // Order: what whoever built the flow wrote, then the reason carrying the
        // number the condition computed, and only then its generic text.
        return {
          proposal: null,
          review: step.reason ?? verdict.specificReason ?? condition.defaultReason,
          decisions: [],
        };
      }

      ctx.step(step.id, "done");
    }

    return { proposal: state.proposal, review: null, decisions: [] };
  }
}
