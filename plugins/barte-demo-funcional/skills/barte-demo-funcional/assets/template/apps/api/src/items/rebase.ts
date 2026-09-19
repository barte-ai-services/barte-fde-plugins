import type { Document } from "./types";

/**
 * Moves the curated batch to TODAY, preserving the gaps between dates.
 *
 * The documents in `data/` carry fixed dates, and a demo saved in September
 * opens in January saying the invoice arrived four months ago and was due three
 * months back — which ruins the first impression before any conversation. Here
 * the most recent document in the batch becomes today's and every other one
 * moves by the SAME number of days: an invoice due 30 days after issue is still
 * due 30 days after issue.
 *
 * Runs once, on import. After that the date is stored on the item and never
 * changes again — otherwise the pipeline would shift under whoever is looking
 * at it.
 */
export function rebase(document: Document, mostRecent: string, today = new Date()): Document {
  const days = Math.round((today.getTime() - new Date(mostRecent).getTime()) / 86400000);
  if (days === 0) return document;

  const shift = (iso: string): string => {
    const d = new Date(iso);
    d.setDate(d.getDate() + days);
    // A plain date (`2026-09-12`) comes back plain; a full timestamp comes back full.
    return iso.length === 10 ? d.toISOString().slice(0, 10) : d.toISOString();
  };

  const content = { ...document.content };
  for (const field of ["issueDate", "dueDate", "emissao", "vencimento"]) {
    const value = content[field];
    if (typeof value === "string" && value) content[field] = shift(value);
  }

  return { ...document, receivedAt: shift(document.receivedAt), content };
}
