/**
 * The shapes that cross the wire.
 *
 * Their KEYS are snake_case because they are the API's and the YAML's contract,
 * not TypeScript identifiers — the same split the Anthropic SDK makes
 * (`max_tokens`, `stop_reason`) and the same one the database columns already
 * used. Variables and functions stay camelCase; React components stay
 * PascalCase.
 */

/** The document as it arrives — this is what sits in storage. */
export interface Document {
  id: string;
  type: "nfe" | "boleto" | string;
  subject: string;
  received_at: string;
  sender: string;
  /**
   * The client's own format, left untouched. Its field names are Portuguese
   * because they name a Brazilian tax document (`chave`, `valorTotal`) — that is
   * data, not code.
   */
  content: Record<string, unknown>;
}

export interface Decision {
  agent: string;
  action: string;
  reason: string;
  confidence: number;
  at: string;
}

export interface Proposal {
  counterparty: string | null;
  cost_center: string | null;
  account: string | null;
  amount: number;
  due_date: string | null;
}

/** An item on the pipeline — this is what sits in Postgres, and what the screen lists. */
export interface Item {
  id: string;
  document: Document;
  state: "pending" | "processing" | "ready" | "review";
  /** Filled in by the agent. `null` until it has been through here. */
  proposal: Proposal | null;
  review_reason: string | null;
  decisions: Decision[];
  updated_at: string;
}
