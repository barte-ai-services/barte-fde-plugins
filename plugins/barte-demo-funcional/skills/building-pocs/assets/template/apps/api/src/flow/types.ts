import { z } from "zod";

/**
 * The demo's flow as DATA.
 *
 * Keys are snake_case: this schema defines both the YAML file and the API's
 * contract, and those are wire formats, not TypeScript identifiers.
 *
 * The steps used to live in two places — a constant in the backend and a list in
 * the frontend — and the rules sat loose inside the engine. Touching one without
 * the other broke the pipeline silently, and adapting the demo to a new client
 * meant editing code in three files.
 *
 * Here it is one structure, read by both sides: the engine runs the steps in
 * order, the screen draws the nodes from it, and whoever is presenting edits it
 * in front of the client.
 *
 * What it is NOT: a general rules engine. `action` and `escalate_if` point at a
 * closed catalog implemented in TypeScript. Adding a step, reordering, changing
 * text and switching on a rule that already exists take no code; a brand-new
 * rule does — and that is the right trade, because the alternative would be
 * inventing an expression language nobody asked for.
 */

export const stepSchema = z.object({
  /** Stable identifier. Events light up the node on screen by it. */
  id: z
    .string()
    .min(1, "a etapa precisa de um id")
    .regex(/^[a-z0-9-]+$/, "o id aceita só letras minúsculas, números e hífen"),
  label: z.string().min(1, "a etapa precisa de um rótulo"),
  /** The small line under the label, on the pipeline. */
  hint: z.string().default(""),
  action: z.string().min(1, "escolha o que a etapa faz"),
  /**
   * The conditions that make the agent STOP at this step and hand the item back
   * to a human. Empty means the step never blocks.
   */
  escalate_if: z.array(z.string()).default([]),
  /** Overrides the default reason of whichever condition fired. Optional. */
  reason: z.string().optional(),
});

/**
 * What this demo CALLS things.
 *
 * The pipeline is the same for accounts payable, accounts receivable,
 * reconciliation and classification — what changes is the vocabulary: the
 * counterparty is a supplier or a customer, what arrives is an invoice or a
 * receivable, and the proposal carries a cost center or a profit center. This
 * used to be hardcoded in JSX, and switching modules meant editing four files;
 * here it is configuration, and it changes live.
 *
 * What is NOT here is the structure of the screen. When a demo needs a different
 * shape — a P&L dashboard, a bank-file pipeline with a transformation terminal —
 * that is a new screen, and you write code. Declaring layout in YAML would mean
 * building a screen editor nobody asked for.
 *
 * Everything has a default: a demo that declares no vocabulary at all is still
 * the accounts payable one, exactly as before.
 *
 * The VALUES are in Portuguese on purpose — they are what the client reads.
 */
export const vocabularySchema = z.object({
  /** Shows up in the sidebar, the breadcrumb and the tab title. */
  client: z.string().default("Cliente Demo"),
  /** The module name: "Contas a Pagar", "Contas a Receber", "Conciliação". */
  module: z.string().default("Contas a Pagar"),
  /** Who is on the other side: fornecedor, cliente, sacado, prestador. */
  counterparty: z.string().default("Fornecedor"),
  /** What arrives on the pipeline: documento, nota, título, boleto, extrato. */
  incoming: z.string().default("Documento"),
  /**
   * Labels for the fields the agent fills in.
   *
   * `.prefault({})` and not `.default({})`: a default value SKIPS parsing, so an
   * empty object would come out empty and the screen would render blank labels.
   * `prefault` feeds `{}` through the schema, and each field falls back to its
   * own default. (Zod 4 also rejects `.default({})` at compile time here, for the
   * same reason.)
   */
  labels: z
    .object({
      cost_center: z.string().default("Centro de custo"),
      account: z.string().default("Conta contábil"),
      amount: z.string().default("Valor"),
      due_date: z.string().default("Vencimento"),
    })
    .prefault({}),
  /** What each number in the stat band means for THIS client. */
  stats: z
    .object({
      queued: z.string().default("na fila"),
      ready: z.string().default("prontos para aprovação"),
      review: z.string().default("em revisão humana"),
      amount: z.string().default("valor na esteira"),
    })
    .prefault({}),
});

export const flowSchema = z.object({
  name: z.string().min(1, "o fluxo precisa de um nome"),
  vocabulary: vocabularySchema.prefault({}),
  steps: z.array(stepSchema).min(1, "o fluxo precisa de pelo menos uma etapa"),
});

export type Step = z.infer<typeof stepSchema>;
export type Vocabulary = z.infer<typeof vocabularySchema>;
export type Flow = z.infer<typeof flowSchema>;
