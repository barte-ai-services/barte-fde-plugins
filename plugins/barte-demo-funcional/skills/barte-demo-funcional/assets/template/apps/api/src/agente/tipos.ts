import type { Decisao, Documento, Item } from "../itens/tipos";
import type { Fluxo } from "../fluxo/tipos";

export interface Resultado {
  proposta: Item["proposta"];
  /** Preenchido quando o agente NÃO resolve sozinho. Vira o motivo na tela. */
  revisao: string | null;
  decisoes: Decisao[];
}

/** O que um motor precisa receber para trabalhar, e como ele conta o que faz. */
export interface Contexto {
  documento: Documento;
  /**
   * As etapas a percorrer. Vêm do fluxo que está no ar — que pode ter sido
   * editado no painel cinco segundos atrás —, e não de uma lista no código.
   */
  fluxo: Fluxo;
  /** Chaves já na esteira — entra no teste de duplicidade. */
  chavesConhecidas: string[];
  /** Acende um nó da esteira na tela, ao vivo. O `no` é o id da etapa. */
  no: (no: string, estado: "executando" | "concluido" | "excecao") => void;
  /** O agente prestando contas: uma decisão, a razão dela e a confiança. */
  decidir: (acao: string, razao: string, confianca: number) => void;
}

export interface Motor {
  readonly nome: string;
  processar(ctx: Contexto): Promise<Resultado>;
}
