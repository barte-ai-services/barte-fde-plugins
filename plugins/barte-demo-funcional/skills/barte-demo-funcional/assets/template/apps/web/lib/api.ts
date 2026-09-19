/**
 * The API runs alongside, on another port. In production both would share a
 * domain.
 *
 * The types below mirror the wire format, so their KEYS are snake_case — the same
 * split the Anthropic SDK makes (`max_tokens`, `stop_reason`). Variables,
 * functions and React components keep the language's conventions.
 */
export const API = process.env.NEXT_PUBLIC_API ?? "http://127.0.0.1:8080/api";

export interface Decision {
  agent: string;
  action: string;
  reason: string;
  confidence: number;
  at: string;
}

export interface Item {
  id: string;
  document: {
    id: string;
    type: string;
    subject: string;
    received_at: string;
    sender: string;
    content: Record<string, unknown>;
  };
  state: "pending" | "processing" | "ready" | "review";
  proposal: {
    counterparty: string | null;
    cost_center: string | null;
    account: string | null;
    amount: number;
    due_date: string | null;
  } | null;
  review_reason: string | null;
  decisions: Decision[];
  updated_at: string;
}

export interface Component {
  name: string;
  technology: string;
  role: string;
  ok: boolean;
  ms: number;
  detail: string | null;
}

export interface Call {
  component: string;
  operation: string;
  ms: number;
  ok: boolean;
  at: string;
}

export interface Stack {
  engine: string;
  cloud: string;
  components: Component[];
  telemetry: { component: string; calls: number; median_ms: number; worst_ms: number }[];
}

export interface Step {
  id: string;
  label: string;
  hint: string;
  action: string;
  escalate_if: string[];
  reason?: string;
}

/** The screen's words. Values are Portuguese — the client reads them. */
export interface Vocabulary {
  client: string;
  module: string;
  counterparty: string;
  incoming: string;
  labels: { cost_center: string; account: string; amount: string; due_date: string };
  stats: { queued: string; ready: string; review: string; amount: string };
}

export interface Flow {
  name: string;
  vocabulary: Vocabulary;
  steps: Step[];
}

export interface Catalog {
  actions: { id: string; label: string; description: string }[];
  conditions: { id: string; label: string; description: string; default_reason: string }[];
}

export type Event =
  | { type: "step"; item_id: string; step: string; state: "running" | "done" | "exception"; at: string }
  | { type: "decision"; item_id: string; agent: string; action: string; reason: string; confidence: number; at: string }
  | { type: "exception"; item_id: string; reason: string; at: string }
  | { type: "item"; item_id: string; at: string }
  | { type: "telemetry"; call: Call; at: string }
  | { type: "flow"; at: string };

export async function listItems(): Promise<Item[]> {
  const r = await fetch(`${API}/items`, { cache: "no-store" });
  if (!r.ok) throw new Error(`items: ${r.status}`);
  return r.json();
}

export async function runPipeline(): Promise<{ queued: number }> {
  const r = await fetch(`${API}/pipeline/run`, { method: "POST" });
  if (!r.ok) throw new Error(`run: ${r.status}`);
  return r.json();
}

export async function health(): Promise<Stack> {
  const r = await fetch(`${API}/health`, { cache: "no-store" });
  if (!r.ok) throw new Error(`health: ${r.status}`);
  return r.json();
}

/**
 * The validation error arrives from the server as a LIST of problems, and that is
 * how it reaches the screen: whoever is editing in front of the client needs to
 * see everything that is wrong at once, instead of fixing one, retrying, and
 * discovering the next.
 */
export class FlowError extends Error {
  constructor(readonly problems: string[]) {
    super(problems.join("; "));
  }
}

async function withProblems<T>(r: Response): Promise<T> {
  if (r.ok) return r.json();
  const body = await r.json().catch(() => null);
  const problems = body?.message?.problems ?? body?.problems;
  throw new FlowError(
    Array.isArray(problems) && problems.length ? problems : [`o servidor recusou (${r.status})`],
  );
}

export async function readFlow(): Promise<Flow> {
  const r = await fetch(`${API}/flow`, { cache: "no-store" });
  if (!r.ok) throw new Error(`flow: ${r.status}`);
  return r.json();
}

export async function readCatalog(): Promise<Catalog> {
  const r = await fetch(`${API}/flow/catalog`, { cache: "no-store" });
  if (!r.ok) throw new Error(`catalog: ${r.status}`);
  return r.json();
}

export async function readFlowFile(): Promise<string> {
  const r = await fetch(`${API}/flow/file`, { cache: "no-store" });
  if (!r.ok) throw new Error(`file: ${r.status}`);
  return (await r.json()).text;
}

export async function saveFlow(flow: Flow): Promise<Flow> {
  return withProblems(
    await fetch(`${API}/flow`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(flow),
    }),
  );
}

export async function saveFlowFile(text: string): Promise<Flow> {
  return withProblems(
    await fetch(`${API}/flow/file`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    }),
  );
}

export async function restoreFlow(): Promise<Flow> {
  return withProblems(await fetch(`${API}/flow/restore`, { method: "POST" }));
}
