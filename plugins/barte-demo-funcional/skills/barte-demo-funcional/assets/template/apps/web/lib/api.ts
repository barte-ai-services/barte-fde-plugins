/** The API runs alongside, on another port. In production both would share a domain. */
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
    receivedAt: string;
    sender: string;
    content: Record<string, unknown>;
  };
  state: "pending" | "processing" | "ready" | "review";
  proposal: {
    counterparty: string | null;
    costCenter: string | null;
    account: string | null;
    amount: number;
    dueDate: string | null;
  } | null;
  reviewReason: string | null;
  decisions: Decision[];
  updatedAt: string;
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
  telemetry: { component: string; calls: number; medianMs: number; worstMs: number }[];
}

export interface Step {
  id: string;
  label: string;
  hint: string;
  action: string;
  escalateIf: string[];
  reason?: string;
}

/** The screen's words. Values are Portuguese — the client reads them. */
export interface Vocabulary {
  client: string;
  module: string;
  counterparty: string;
  incoming: string;
  labels: { costCenter: string; account: string; amount: string; dueDate: string };
  stats: { queued: string; ready: string; review: string; amount: string };
}

export interface Flow {
  name: string;
  vocabulary: Vocabulary;
  steps: Step[];
}

export interface Catalog {
  actions: { id: string; label: string; description: string }[];
  conditions: { id: string; label: string; description: string; defaultReason: string }[];
}

export type Event =
  | { type: "step"; itemId: string; step: string; state: "running" | "done" | "exception"; at: string }
  | { type: "decision"; itemId: string; agent: string; action: string; reason: string; confidence: number; at: string }
  | { type: "exception"; itemId: string; reason: string; at: string }
  | { type: "item"; itemId: string; at: string }
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
