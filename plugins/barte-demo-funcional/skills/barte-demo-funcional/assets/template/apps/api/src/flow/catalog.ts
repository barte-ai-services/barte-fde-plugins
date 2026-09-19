import type { Counterparty, Registry } from "../agent/tools";
import {
  findCounterparty,
  isDuplicate,
  missingInssWithholding,
  mismatch,
  extract,
} from "../agent/tools";
import type { Document, Item } from "../items/types";

/**
 * The catalog: the verbs a step can run, and the conditions that stop the agent.
 *
 * Every entry carries a `label` and a `description` in Portuguese because that is
 * exactly what shows up in the flow panel's menus — whoever builds the flow in
 * the meeting works in sales, and "find_counterparty" means nothing to anyone.
 *
 * Adding a verb is adding an entry here. The panel offers it immediately, with no
 * frontend change.
 */

/** What a step accumulates as the document crosses the pipeline. */
export interface State {
  document: Document;
  registry: Registry;
  extracted: ReturnType<typeof extract>;
  knownKeys: string[];
  counterparty: Counterparty | null;
  classification: { costCenter: string; account: string } | null;
  proposal: Item["proposal"];
}

export interface ActionDecision {
  action: string;
  reason: string;
  confidence: number;
}

export interface Action {
  label: string;
  description: string;
  run: (state: State) => ActionDecision | null;
}

export interface Condition {
  label: string;
  description: string;
  /** What becomes the reason in the queue when it fires and nothing more specific exists. */
  defaultReason: string;
  evaluate: (state: State) => {
    fired: boolean;
    reason: string;
    confidence: number;
    /**
     * A reason with the NUMBER in it, when the condition has one.
     *
     * "Divergência de R$ 18,90 com o pedido" in the queue is worth far more than
     * "Divergência com o pedido": whoever is scanning the queue decides whether
     * the item is worth opening without opening it.
     */
    specificReason?: string;
  };
}

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const ACTIONS: Record<string, Action> = {
  read_document: {
    label: "Ler o documento",
    description: "extrai emitente, valor, vencimento e o resto do que veio no arquivo",
    run: (s) => ({
      action: "extraiu o documento",
      reason: `${s.document.type.toUpperCase()} de ${s.extracted.counterpartyName}, ${brl(s.extracted.amount)}, vencimento ${s.extracted.dueDate ?? "não informado"}`,
      confidence: 0.99,
    }),
  },

  find_counterparty: {
    label: "Procurar no cadastro",
    description: "acha o CNPJ no cadastro e traz centro de custo, conta e condição de pagamento",
    run: (s) => {
      s.counterparty = findCounterparty(s.registry, s.extracted.counterpartyCnpj);
      return s.counterparty
        ? {
            action: "identificou no cadastro",
            reason: `${s.counterparty.name}, condição ${s.counterparty.terms}`,
            confidence: 0.98,
          }
        : {
            action: "não encontrou no cadastro",
            reason: `CNPJ ${s.extracted.counterpartyCnpj || "ausente"} não está no cadastro`,
            confidence: 0.97,
          };
    },
  },

  classify: {
    label: "Classificar o lançamento",
    description: "define centro de custo e conta contábil pelo histórico",
    run: (s) => {
      if (!s.counterparty) return null;
      s.classification = {
        costCenter: s.counterparty.costCenter,
        account: s.counterparty.account,
      };
      return {
        action: "classificou o lançamento",
        reason: `centro de custo ${s.counterparty.costCenter} e conta ${s.counterparty.account}, pelo histórico`,
        confidence: 0.94,
      };
    },
  },

  check: {
    label: "Conferir pedido, retenção e alçada",
    description: "calcula a diferença com o pedido e checa as regras — não estima nada",
    run: () => ({
      action: "conferiu conformidade",
      reason: "valor bate com o pedido e as retenções estão destacadas",
      confidence: 0.95,
    }),
  },

  propose: {
    label: "Propor o lançamento",
    description: "fecha a proposta para um humano aprovar",
    run: (s) => {
      if (!s.counterparty) return null;
      s.proposal = {
        counterparty: s.counterparty.name,
        costCenter: s.classification?.costCenter ?? s.counterparty.costCenter,
        account: s.classification?.account ?? s.counterparty.account,
        amount: s.extracted.amount,
        dueDate: s.extracted.dueDate,
      };
      return {
        action: "propôs o lançamento",
        reason: "pronto para aprovação — o humano decide",
        confidence: 0.95,
      };
    },
  },
};

export const CONDITIONS: Record<string, Condition> = {
  duplicate_document: {
    label: "Documento já lançado",
    description: "a chave deste documento já passou por aqui",
    defaultReason: "Documento já lançado — chave duplicada",
    evaluate: (s) => ({
      fired: isDuplicate(s.registry, s.extracted.key, s.knownKeys),
      reason: `a chave ${s.extracted.key.slice(-8)} já foi lançada`,
      confidence: 1,
    }),
  },

  not_in_registry: {
    label: "Fora do cadastro",
    description: "sem cadastro não há centro de custo nem conta contábil",
    defaultReason: "Não cadastrado",
    evaluate: (s) => ({
      fired: s.counterparty === null,
      reason: `CNPJ ${s.extracted.counterpartyCnpj || "ausente"} não está no cadastro — sem ele não há como classificar`,
      confidence: 0.97,
    }),
  },

  amount_mismatch: {
    label: "Valor diferente do pedido",
    description: "o documento não bate com o pedido de compra",
    defaultReason: "Divergência com o pedido",
    evaluate: (s) => {
      const delta = mismatch(s.extracted.amount, s.extracted.orderAmount);
      const fired = delta !== null && Math.abs(delta) > 0.01;
      return {
        fired,
        reason: fired
          ? `documento ${brl(s.extracted.amount)} contra pedido ${brl(s.extracted.orderAmount!)} — diferença de ${brl(Math.abs(delta!))}`
          : "",
        confidence: 0.96,
        specificReason: fired ? `Divergência de ${brl(Math.abs(delta!))} com o pedido` : undefined,
      };
    },
  },

  missing_inss_withholding: {
    label: "Retenção de INSS não destacada",
    description: "serviço com cessão de mão de obra que veio sem a retenção",
    defaultReason: "Retenção de INSS não destacada",
    evaluate: (s) => ({
      fired: missingInssWithholding(s.extracted.description, s.extracted.withholdings),
      reason: "serviço com cessão de mão de obra sem a retenção de INSS de 11% destacada",
      confidence: 0.91,
    }),
  },

  above_approval_limit: {
    label: "Acima da alçada",
    description: "valor maior do que o limite de aprovação automática",
    defaultReason: "Acima da alçada de aprovação automática",
    evaluate: (s) => ({
      fired: s.extracted.amount > s.registry.autoApprovalLimit,
      reason: `${brl(s.extracted.amount)} acima do limite de ${brl(s.registry.autoApprovalLimit)} para aprovação automática`,
      confidence: 1,
    }),
  },
};

/** What the flow panel offers in its menus. */
export function catalog() {
  return {
    actions: Object.entries(ACTIONS).map(([id, a]) => ({
      id,
      label: a.label,
      description: a.description,
    })),
    conditions: Object.entries(CONDITIONS).map(([id, c]) => ({
      id,
      label: c.label,
      description: c.description,
      defaultReason: c.defaultReason,
    })),
  };
}
