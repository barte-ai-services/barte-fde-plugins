/** O documento como ele chega — é o que está no S3. */
export interface Documento {
  id: string;
  tipo: "nfe" | "boleto" | string;
  assunto: string;
  recebidoEm: string;
  remetente: string;
  conteudo: Record<string, unknown>;
}

export interface Decisao {
  agente: string;
  acao: string;
  razao: string;
  confianca: number;
  em: string;
}

/** O item na esteira — é o que está no DynamoDB, e o que a tela lista. */
export interface Item {
  id: string;
  documento: Documento;
  estado: "pendente" | "processando" | "pronto" | "revisao";
  /** Preenchido pelo agente. `null` enquanto ele não passou por aqui. */
  proposta: {
    fornecedor: string | null;
    centroCusto: string | null;
    contaContabil: string | null;
    valor: number;
    vencimento: string | null;
  } | null;
  motivoRevisao: string | null;
  decisoes: Decisao[];
  atualizadoEm: string;
}
