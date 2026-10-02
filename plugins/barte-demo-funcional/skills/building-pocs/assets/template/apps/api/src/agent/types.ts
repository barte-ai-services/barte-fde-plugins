import type { Decision, Document, Item } from "../items/types";
import type { Flow } from "../flow/types";

export interface Outcome {
  proposal: Item["proposal"];
  /** Set when the agent does NOT resolve it alone. Becomes the reason on screen. */
  review: string | null;
  decisions: Decision[];
}

/** What an engine needs to work, and how it reports what it did. */
export interface Context {
  document: Document;
  /**
   * The steps to walk. They come from the flow that is live — which may have been
   * edited in the panel five seconds ago — and not from a list in the code.
   */
  flow: Flow;
  /** Keys already on the pipeline — feeds the duplicate check. */
  knownKeys: string[];
  /** Lights a pipeline node on screen, live. `step` is the step id. */
  step: (step: string, state: "running" | "done" | "exception") => void;
  /** The agent accounting for itself: one decision, its reason, its confidence. */
  decide: (action: string, reason: string, confidence: number) => void;
}

export interface Engine {
  readonly name: string;
  process(ctx: Context): Promise<Outcome>;
}
