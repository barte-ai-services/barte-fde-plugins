/** A API roda ao lado, em outra porta. Em produção seriam o mesmo domínio. */
export const API = process.env.NEXT_PUBLIC_API ?? "http://127.0.0.1:8080/api";

export interface Decisao {
  agente: string;
  acao: string;
  razao: string;
  confianca: number;
  em: string;
}

export interface Item {
  id: string;
  documento: {
    id: string;
    tipo: string;
    assunto: string;
    recebidoEm: string;
    remetente: string;
    conteudo: Record<string, unknown>;
  };
  estado: "pendente" | "processando" | "pronto" | "revisao";
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

export interface Peca {
  nome: string;
  tecnologia: string;
  papel: string;
  ok: boolean;
  ms: number;
  detalhe: string | null;
}

export interface Chamada {
  peca: string;
  operacao: string;
  ms: number;
  ok: boolean;
  em: string;
}

export interface Stack {
  motor: string;
  endpointAws: string;
  pecas: Peca[];
  telemetria: { peca: string; chamadas: number; medianaMs: number; piorMs: number }[];
}

export type Evento =
  | { tipo: "no"; itemId: string; no: string; estado: "executando" | "concluido" | "excecao"; em: string }
  | { tipo: "decisao"; itemId: string; agente: string; acao: string; razao: string; confianca: number; em: string }
  | { tipo: "excecao"; itemId: string; motivo: string; em: string }
  | { tipo: "item"; itemId: string; em: string }
  | { tipo: "telemetria"; chamada: Chamada; em: string };

export async function listarItens(): Promise<Item[]> {
  const r = await fetch(`${API}/itens`, { cache: "no-store" });
  if (!r.ok) throw new Error(`itens: ${r.status}`);
  return r.json();
}

export async function executarEsteira(): Promise<{ enfileirados: number }> {
  const r = await fetch(`${API}/esteira/executar`, { method: "POST" });
  if (!r.ok) throw new Error(`executar: ${r.status}`);
  return r.json();
}

export async function saude(): Promise<Stack> {
  const r = await fetch(`${API}/saude`, { cache: "no-store" });
  if (!r.ok) throw new Error(`saude: ${r.status}`);
  return r.json();
}
