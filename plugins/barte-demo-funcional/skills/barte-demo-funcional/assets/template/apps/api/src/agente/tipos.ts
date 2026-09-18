import type { Decisao, Documento, Item } from "../itens/tipos";

/** As etapas da esteira, na ordem. A tela desenha exatamente esta lista. */
export const NOS = ["leitura", "cadastro", "classificacao", "conformidade", "proposta"] as const;
export type No = (typeof NOS)[number];

export interface Resultado {
  proposta: Item["proposta"];
  /** Preenchido quando o agente NÃO resolve sozinho. Vira o motivo na tela. */
  revisao: string | null;
  decisoes: Decisao[];
}

/** O que um motor precisa receber para trabalhar, e como ele conta o que faz. */
export interface Contexto {
  documento: Documento;
  /** Chaves já na esteira — entra no teste de duplicidade. */
  chavesConhecidas: string[];
  /** Acende um nó da esteira na tela, ao vivo. */
  no: (no: No, estado: "executando" | "concluido" | "excecao") => void;
  /** O agente prestando contas: uma decisão, a razão dela e a confiança. */
  decidir: (acao: string, razao: string, confianca: number) => void;
}

export interface Motor {
  readonly nome: string;
  processar(ctx: Contexto): Promise<Resultado>;
}
