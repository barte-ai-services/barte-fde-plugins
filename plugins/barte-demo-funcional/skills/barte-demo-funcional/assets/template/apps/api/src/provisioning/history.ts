import { loadRegistry, type Counterparty } from "../agent/tools";
import type { Item } from "../items/types";

/**
 * The history the demo is BORN with.
 *
 * A screen that opens at zero does not look like an installed product, it looks
 * like a blank form — and the client needs two seconds to understand the value,
 * not a whole run. So the pipeline arrives with weeks of work behind it, and
 * today's batch is what runs in front of them.
 *
 * Generated rather than hand-written, because forty plausible items by hand cost
 * an afternoon and go stale — but generated with a FIXED SEED: the same demo, on
 * the second pass, shows the same numbers. Real randomness would make the figure
 * on screen change between the rehearsal and the meeting, and that is exactly
 * when someone asks "where did that number come from?".
 *
 * When the client sends a spreadsheet, it replaces this: convert it into
 * `data/documents/` and the generated history stops being needed.
 *
 * The generated CONTENT is Portuguese because it mimics Brazilian tax documents.
 */

/** mulberry32 — small, deterministic and plenty for seeding a demo. */
function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const REASONS = [
  "Divergência com o pedido",
  "Não cadastrado",
  "Retenção de INSS não destacada",
  "Acima da alçada de aprovação automática",
  "Documento já lançado — chave duplicada",
];

const SERVICES = [
  "Prestação de serviço de transporte rodoviário de carga",
  "Licenciamento de software e suporte técnico",
  "Manutenção preventiva predial",
  "Serviço de limpeza e conservação",
  "Materiais de escritório e consumo",
  "Consultoria técnica contratada",
];

/**
 * `days` of work backwards from today. `today` is a parameter so the generator
 * stays deterministic in a test.
 */
export function generateHistory(count = 38, seed = 20260915, today = new Date()): Item[] {
  const random = rng(seed);
  const registry = loadRegistry();
  const items: Item[] = [];

  for (let i = 0; i < count; i += 1) {
    const counterparty = registry.counterparties[
      Math.floor(random() * registry.counterparties.length)
    ] as Counterparty;
    const service = SERVICES[Math.floor(random() * SERVICES.length)];
    // Between 1 and 21 days ago, never today: today is the batch the agent runs
    // live, and mixing the two robs the client of the sense of what just ran.
    const daysAgo = 1 + Math.floor(random() * 21);
    const received = new Date(today.getTime() - daysAgo * 86400000);
    const amount = Math.round((800 + random() * 24000) * 100) / 100;
    // A little over a fifth in review. A 100% green pipeline convinces nobody who
    // has ever worked in accounts payable.
    const review = random() < 0.22;
    const reason = REASONS[Math.floor(random() * REASONS.length)];
    const number = 10000 + Math.floor(random() * 89999);
    const dueDate = new Date(received.getTime() + 30 * 86400000);

    items.push({
      id: `hist-${String(i + 1).padStart(4, "0")}`,
      document: {
        id: `hist-${String(i + 1).padStart(4, "0")}`,
        type: "nfe",
        subject: `NF-e ${number} - ${counterparty.name.split(" ")[0]}`,
        receivedAt: received.toISOString(),
        sender: `faturamento@${counterparty.name.split(" ")[0].toLowerCase()}.com.br`,
        content: {
          chave: `3526${String(number).padStart(8, "0")}${String(Math.floor(random() * 1e12)).padStart(12, "0")}`,
          numero: String(number),
          emitente: { nome: counterparty.name, cnpj: counterparty.cnpj },
          emissao: received.toISOString().slice(0, 10),
          vencimento: dueDate.toISOString().slice(0, 10),
          valorTotal: amount,
          descricao: `${service} - ${received.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}`,
          valorPedido: amount,
          retencoes: { iss: 0, irrf: Math.round(amount * 0.015 * 100) / 100, inss: 0 },
        },
      },
      state: review ? "review" : "ready",
      proposal: review
        ? null
        : {
            counterparty: counterparty.name,
            costCenter: counterparty.costCenter,
            account: counterparty.account,
            amount,
            dueDate: dueDate.toISOString().slice(0, 10),
          },
      reviewReason: review ? reason : null,
      decisions: trail(counterparty, amount, review, reason, received),
      updatedAt: received.toISOString(),
    });
  }

  return items;
}

/**
 * The history's trail exists for the same reason the live batch's does: the
 * client will click an old item, and an item with no trail gives away that the
 * rest is staging.
 */
function trail(
  counterparty: Counterparty,
  amount: number,
  review: boolean,
  reason: string,
  when: Date,
): Item["decisions"] {
  const at = (s: number) => new Date(when.getTime() + s * 1000).toISOString();
  const brl = amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const base = [
    { agent: "rules", action: "extraiu o documento", reason: `NFE de ${counterparty.name}, ${brl}`, confidence: 0.99, at: at(2) },
    {
      agent: "rules",
      action: "identificou no cadastro",
      reason: `${counterparty.name}, condição ${counterparty.terms}`,
      confidence: 0.98,
      at: at(5),
    },
    {
      agent: "rules",
      action: "classificou o lançamento",
      reason: `centro de custo ${counterparty.costCenter} e conta ${counterparty.account}, pelo histórico`,
      confidence: 0.94,
      at: at(9),
    },
  ];
  return review
    ? [...base, { agent: "rules", action: "escalou para revisão", reason: reason.toLowerCase(), confidence: 0.93, at: at(12) }]
    : [
        ...base,
        { agent: "rules", action: "conferiu conformidade", reason: "valor bate com o pedido e as retenções estão destacadas", confidence: 0.95, at: at(12) },
        { agent: "rules", action: "propôs o lançamento", reason: "pronto para aprovação — o humano decide", confidence: 0.95, at: at(14) },
      ];
}
