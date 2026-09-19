/** The document as it arrives — this is what sits in storage. */
export interface Document {
  id: string;
  type: "nfe" | "boleto" | string;
  subject: string;
  receivedAt: string;
  sender: string;
  content: Record<string, unknown>;
}

export interface Decision {
  agent: string;
  action: string;
  reason: string;
  confidence: number;
  at: string;
}

/** An item on the pipeline — this is what sits in Postgres, and what the screen lists. */
export interface Item {
  id: string;
  document: Document;
  state: "pending" | "processing" | "ready" | "review";
  /** Filled in by the agent. `null` until it has been through here. */
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
