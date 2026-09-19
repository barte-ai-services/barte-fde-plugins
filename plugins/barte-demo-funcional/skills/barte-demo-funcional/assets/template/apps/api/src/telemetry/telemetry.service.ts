import { Injectable } from "@nestjs/common";
import { EventsService } from "../events/events.service";

export interface Call {
  /**
   * The COMPONENT's name, not the product's: "storage" and "queue" still hold
   * when the demo runs on GCP or Azure. Which technology sits underneath shows
   * up in the stack panel, once, instead of on every line of the stream.
   */
  component: "postgres" | "storage" | "queue" | "agent";
  operation: string;
  ms: number;
  ok: boolean;
  at: string;
}

/**
 * The demo's telemetry: every trip to the database, the storage and the queue,
 * with how long it took.
 *
 * In a commercial demo this is an argument, not decoration. When the client asks
 * "is this actually running, or is it a screen?", the answer stops being a
 * claim: they watch the `SELECT` happen in 3 ms while the pipeline moves.
 *
 * What we do NOT do here is instrument everything with an interceptor. The list
 * is short and written by hand at the points that matter — what shows up on
 * screen is what someone chose to show, not the process's entire noise.
 */
@Injectable()
export class TelemetryService {
  /** The most recent calls. Enough for one meeting, and nothing beyond that. */
  private readonly recent: Call[] = [];

  constructor(private readonly events: EventsService) {}

  async measure<T>(component: Call["component"], operation: string, f: () => Promise<T>): Promise<T> {
    const start = process.hrtime.bigint();
    try {
      const r = await f();
      this.record(component, operation, start, true);
      return r;
    } catch (error) {
      // Record the failure BEFORE rethrowing: a call that blew up is exactly the
      // one you want to see on screen.
      this.record(component, operation, start, false);
      throw error;
    }
  }

  private record(component: Call["component"], operation: string, start: bigint, ok: boolean): void {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    const call: Call = {
      component,
      operation,
      ms: Math.round(ms * 10) / 10,
      ok,
      at: new Date().toISOString(),
    };
    this.recent.push(call);
    if (this.recent.length > 200) this.recent.shift();
    this.events.publish({ type: "telemetry", call });
  }

  /** Per component: how many calls, the median and the worst. */
  summary() {
    const byComponent = new Map<string, number[]>();
    for (const c of this.recent) {
      const list = byComponent.get(c.component) ?? [];
      list.push(c.ms);
      byComponent.set(c.component, list);
    }
    return [...byComponent.entries()].map(([component, ms]) => {
      const sorted = [...ms].sort((a, b) => a - b);
      return {
        component,
        calls: ms.length,
        median_ms: sorted[Math.floor(sorted.length / 2)] ?? 0,
        worst_ms: sorted.at(-1) ?? 0,
      };
    });
  }

  latest(n = 40): Call[] {
    return this.recent.slice(-n).reverse();
  }
}
