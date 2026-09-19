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

export interface Etapa {
  id: string;
  rotulo: string;
  legenda: string;
  acao: string;
  escalaSe: string[];
  motivo?: string;
}

export interface Fluxo {
  nome: string;
  etapas: Etapa[];
}

export interface Catalogo {
  acoes: { id: string; rotulo: string; descricao: string }[];
  condicoes: { id: string; rotulo: string; descricao: string; motivoPadrao: string }[];
}

export type Evento =
  | { tipo: "no"; itemId: string; no: string; estado: "executando" | "concluido" | "excecao"; em: string }
  | { tipo: "decisao"; itemId: string; agente: string; acao: string; razao: string; confianca: number; em: string }
  | { tipo: "excecao"; itemId: string; motivo: string; em: string }
  | { tipo: "item"; itemId: string; em: string }
  | { tipo: "telemetria"; chamada: Chamada; em: string }
  | { tipo: "fluxo"; em: string };

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

/**
 * O erro de validação vem do servidor como uma LISTA de problemas, e é assim que
 * ele chega à tela: quem está editando na frente do cliente precisa ver tudo o
 * que está errado de uma vez, em vez de corrigir um, tentar, e descobrir o
 * seguinte.
 */
export class ErroDeFluxo extends Error {
  constructor(readonly problemas: string[]) {
    super(problemas.join("; "));
  }
}

async function comProblemas<T>(r: Response): Promise<T> {
  if (r.ok) return r.json();
  const corpo = await r.json().catch(() => null);
  const problemas = corpo?.message?.problemas ?? corpo?.problemas;
  throw new ErroDeFluxo(
    Array.isArray(problemas) && problemas.length ? problemas : [`o servidor recusou (${r.status})`],
  );
}

export async function lerFluxo(): Promise<Fluxo> {
  const r = await fetch(`${API}/fluxo`, { cache: "no-store" });
  if (!r.ok) throw new Error(`fluxo: ${r.status}`);
  return r.json();
}

export async function lerCatalogo(): Promise<Catalogo> {
  const r = await fetch(`${API}/fluxo/catalogo`, { cache: "no-store" });
  if (!r.ok) throw new Error(`catalogo: ${r.status}`);
  return r.json();
}

export async function lerArquivoDoFluxo(): Promise<string> {
  const r = await fetch(`${API}/fluxo/arquivo`, { cache: "no-store" });
  if (!r.ok) throw new Error(`arquivo: ${r.status}`);
  return (await r.json()).texto;
}

export async function salvarFluxo(fluxo: Fluxo): Promise<Fluxo> {
  return comProblemas(
    await fetch(`${API}/fluxo`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fluxo),
    }),
  );
}

export async function salvarArquivoDoFluxo(texto: string): Promise<Fluxo> {
  return comProblemas(
    await fetch(`${API}/fluxo/arquivo`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto }),
    }),
  );
}

export async function restaurarFluxo(): Promise<Fluxo> {
  return comProblemas(await fetch(`${API}/fluxo/restaurar`, { method: "POST" }));
}

export async function saude(): Promise<Stack> {
  const r = await fetch(`${API}/saude`, { cache: "no-store" });
  if (!r.ok) throw new Error(`saude: ${r.status}`);
  return r.json();
}
