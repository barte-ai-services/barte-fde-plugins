import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { dirDados } from "../raiz";
import type { Documento } from "../itens/tipos";

/**
 * A caixa de ferramentas do agente — e a fronteira entre o que é DETERMINÍSTICO
 * e o que é LLM.
 *
 * Tudo aqui é determinístico: consulta de cadastro, política de alçada, teste de
 * duplicidade, cálculo de divergência. O modelo não calcula nada disso — ele
 * decide QUAIS perguntas fazer e o que concluir a partir das respostas. É essa
 * separação que permite dizer ao cliente, sem ressalva, que o número na tela não
 * foi inventado por uma IA.
 *
 * Os dois motores (simulado e claude) chamam exatamente estas funções. É o que
 * garante que a demo offline e a demo com o modelo cheguem ao mesmo lugar.
 */

export interface Fornecedor {
  cnpj: string;
  nome: string;
  centroCusto: string;
  contaContabil: string;
  condicao: string;
}

export interface Cadastro {
  fornecedores: Fornecedor[];
  alcadaAprovacaoAutomatica: number;
  lancados: string[];
}

export function carregarCadastro(): Cadastro {
  return JSON.parse(readFileSync(resolve(dirDados(), "cadastro.json"), "utf8")) as Cadastro;
}

/** Só dígitos: o cadastro guarda com máscara e o documento nem sempre. */
const so = (v: string) => v.replace(/\D/g, "");

export function consultarFornecedor(cadastro: Cadastro, cnpj: string): Fornecedor | null {
  return cadastro.fornecedores.find((f) => so(f.cnpj) === so(cnpj)) ?? null;
}

export function verificarDuplicidade(cadastro: Cadastro, chave: string, jaNaEsteira: string[]): boolean {
  return cadastro.lancados.includes(chave) || jaNaEsteira.includes(chave);
}

/** Campos do documento que o resto do fluxo usa, achatados num lugar só. */
export function extrair(documento: Documento) {
  const c = documento.conteudo as Record<string, any>;
  const emitente = c.emitente ?? c.beneficiario ?? {};
  return {
    chave: (c.chave as string) ?? (c.linhaDigitavel as string) ?? documento.id,
    fornecedorNome: (emitente.nome as string) ?? "não identificado",
    fornecedorCnpj: (emitente.cnpj as string) ?? "",
    valor: Number(c.valorTotal ?? 0),
    valorPedido: c.valorPedido == null ? null : Number(c.valorPedido),
    vencimento: (c.vencimento as string) ?? null,
    descricao: (c.descricao as string) ?? "",
    retencoes: (c.retencoes as Record<string, number>) ?? {},
  };
}

/**
 * A diferença entre nota e pedido, em reais.
 *
 * Em ponto flutuante `14318.90 - 14300.00` dá 18.899999999999636, e uma demo que
 * escreve isso na tela perde a reunião. Arredondar no centavo é o que a
 * contabilidade faz de qualquer forma.
 */
export function divergencia(valor: number, valorPedido: number | null): number | null {
  if (valorPedido == null) return null;
  return Math.round((valor - valorPedido) * 100) / 100;
}

/**
 * Serviço com cessão de mão de obra retém INSS (11%) — e a nota que chega sem a
 * retenção destacada é a exceção fiscal mais comum que existe. A lista é curta
 * de propósito: numa demo real ela vira as palavras do cliente.
 */
const CESSAO = ["limpeza", "conservação", "vigilância", "portaria", "mão de obra"];

export function exigeRetencaoInss(descricao: string, retencoes: Record<string, number>): boolean {
  const alvo = descricao.toLowerCase();
  const eCessao = CESSAO.some((termo) => alvo.includes(termo));
  return eCessao && !(retencoes.inss > 0);
}
