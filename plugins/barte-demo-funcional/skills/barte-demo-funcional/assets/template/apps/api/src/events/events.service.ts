import { Injectable } from "@nestjs/common";
import { ReplaySubject, Observable } from "rxjs";

/**
 * What the pipeline shows live.
 *
 * `step` is the pipeline stage that lit up; `decision` is the agent accounting
 * for itself (what it decided, why, how confident); `exception` is what it did
 * NOT resolve on its own and handed back to a human.
 */
export type Event =
  | { type: "step"; itemId: string; step: string; state: "running" | "done" | "exception"; at: string }
  | { type: "decision"; itemId: string; agent: string; action: string; reason: string; confidence: number; at: string }
  | { type: "exception"; itemId: string; reason: string; at: string }
  | { type: "item"; itemId: string; at: string }
  | { type: "telemetry"; call: { component: string; operation: string; ms: number; ok: boolean }; at: string }
  /** The flow changed: the screen redraws the pipeline without a page reload. */
  | { type: "flow"; at: string };

/**
 * The event as the publisher writes it: without the timestamp, which the service
 * stamps.
 *
 * `T extends unknown` is not decoration — it is what makes `Omit` walk EACH
 * member of the union. Without it `Omit` runs over the union as a whole and only
 * the fields common to every member survive, so publishing an event carrying
 * `step` or `reason` stops compiling.
 */
type Unstamped<T> = T extends unknown ? Omit<T, "at"> & { at?: string } : never;

@Injectable()
export class EventsService {
  /**
   * `ReplaySubject`, not `Subject`: whoever opens the screen in the middle of a
   * run has to see the pipeline that already lit up, otherwise the demo looks
   * frozen to whoever arrived late — which, in a meeting, is always someone. 500
   * events cover a full run with room to spare.
   */
  private readonly channel = new ReplaySubject<Event>(500);

  publish(event: Unstamped<Event>): void {
    this.channel.next({ ...event, at: event.at ?? new Date().toISOString() } as Event);
  }

  stream(): Observable<Event> {
    return this.channel.asObservable();
  }
}
