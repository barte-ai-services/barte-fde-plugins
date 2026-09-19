import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { dataDir } from "../paths";
import type { Document } from "../items/types";

/**
 * The agent's toolbox — and the border between what is DETERMINISTIC and what is
 * the model.
 *
 * Everything here is deterministic: registry lookup, approval limit, duplicate
 * check, amount mismatch, withholding rules. The model computes none of it — it
 * decides WHICH questions to ask and what to conclude from the answers. That
 * separation is what lets you tell a client, without hedging, that the number on
 * screen was not invented by an AI.
 *
 * Both engines call exactly these functions. That is what guarantees the offline
 * demo and the model-driven demo reach the same place.
 *
 * Note on language: the FIELDS of a document stay in Portuguese
 * (`valorTotal`, `emitente`, `chave`) because they are the client's data — a
 * Brazilian NF-e literally names them that way, and translating them would make
 * the sample data lie about the domain.
 */

export interface Counterparty {
  cnpj: string;
  name: string;
  cost_center: string;
  account: string;
  terms: string;
}

export interface Registry {
  counterparties: Counterparty[];
  auto_approval_limit: number;
  already_posted: string[];
}

export function loadRegistry(): Registry {
  return JSON.parse(readFileSync(resolve(dataDir(), "registry.json"), "utf8")) as Registry;
}

/** Digits only: the registry stores the mask, the document does not always. */
const digits = (v: string) => v.replace(/\D/g, "");

export function findCounterparty(registry: Registry, cnpj: string): Counterparty | null {
  return registry.counterparties.find((c) => digits(c.cnpj) === digits(cnpj)) ?? null;
}

export function isDuplicate(registry: Registry, key: string, knownKeys: string[]): boolean {
  return registry.already_posted.includes(key) || knownKeys.includes(key);
}

/** The document fields the rest of the flow uses, flattened into one place. */
export function extract(document: Document) {
  const c = document.content as Record<string, any>;
  const issuer = c.emitente ?? c.beneficiario ?? {};
  return {
    key: (c.chave as string) ?? (c.linhaDigitavel as string) ?? document.id,
    counterpartyName: (issuer.nome as string) ?? "não identificado",
    counterpartyCnpj: (issuer.cnpj as string) ?? "",
    amount: Number(c.valorTotal ?? 0),
    orderAmount: c.valorPedido == null ? null : Number(c.valorPedido),
    dueDate: (c.vencimento as string) ?? null,
    description: (c.descricao as string) ?? "",
    withholdings: (c.retencoes as Record<string, number>) ?? {},
  };
}

/**
 * The gap between invoice and purchase order, in reais.
 *
 * In floating point `14318.90 - 14300.00` gives 18.899999999999636, and a demo
 * that prints that on screen loses the meeting. Rounding to the cent is what
 * accounting does anyway.
 */
export function mismatch(amount: number, orderAmount: number | null): number | null {
  if (orderAmount == null) return null;
  return Math.round((amount - orderAmount) * 100) / 100;
}

/**
 * Services with labour assignment withhold INSS (11%) — and an invoice arriving
 * without that withholding stated is the most common tax exception there is. The
 * list is deliberately short: in a real demo it becomes the client's own words.
 */
const LABOUR_ASSIGNMENT = ["limpeza", "conservação", "vigilância", "portaria", "mão de obra"];

export function missingInssWithholding(
  description: string,
  withholdings: Record<string, number>,
): boolean {
  const target = description.toLowerCase();
  const isLabour = LABOUR_ASSIGNMENT.some((term) => target.includes(term));
  return isLabour && !(withholdings.inss > 0);
}
