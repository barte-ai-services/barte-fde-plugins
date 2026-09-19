"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { readFlow, type Vocabulary } from "./api";

/**
 * The words the screen uses, shared by the whole shell.
 *
 * The sidebar, the breadcrumb, the table headers and the drawer all need them,
 * and they live in the flow — one fetch, one context, instead of every component
 * calling the API.
 *
 * The defaults matter: if the API is not up yet, the screen renders the accounts
 * payable wording instead of blank boxes. A demo that flashes empty labels on
 * load looks broken even when it is not.
 */
const DEFAULTS: Vocabulary = {
  client: "Cliente Demo",
  module: "Contas a Pagar",
  counterparty: "Fornecedor",
  incoming: "Documento",
  labels: {
    costCenter: "Centro de custo",
    account: "Conta contábil",
    amount: "Valor",
    dueDate: "Vencimento",
  },
  stats: {
    queued: "na fila",
    ready: "prontos para aprovação",
    review: "em revisão humana",
    amount: "valor na esteira",
  },
};

const VocabularyContext = createContext<Vocabulary>(DEFAULTS);

export function VocabularyProvider({ children }: { children: ReactNode }) {
  const [vocabulary, setVocabulary] = useState<Vocabulary>(DEFAULTS);

  useEffect(() => {
    let alive = true;
    const read = () =>
      readFlow()
        .then((flow) => {
          if (alive) setVocabulary({ ...DEFAULTS, ...flow.vocabulary });
        })
        .catch(() => undefined);
    void read();
    // Re-reads on an interval instead of listening to the event stream: the shell
    // would otherwise hold a second SSE connection open for the whole session to
    // catch a change that happens a couple of times per meeting.
    const t = setInterval(read, 10000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  return <VocabularyContext.Provider value={vocabulary}>{children}</VocabularyContext.Provider>;
}

export function useVocabulary(): Vocabulary {
  return useContext(VocabularyContext);
}

/** Initials for the client avatar, derived rather than configured. */
export function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase() || "CD"
  );
}
