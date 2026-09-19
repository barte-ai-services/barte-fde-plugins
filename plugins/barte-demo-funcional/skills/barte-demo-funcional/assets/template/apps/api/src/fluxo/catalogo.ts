import type { Cadastro, Fornecedor } from "../agente/ferramentas";
import {
  consultarFornecedor,
  divergencia,
  exigeRetencaoInss,
  extrair,
  verificarDuplicidade,
} from "../agente/ferramentas";
import type { Documento, Item } from "../itens/tipos";

/**
 * O catálogo: os verbos que uma etapa pode executar e as condições que fazem o
 * agente parar.
 *
 * Cada entrada carrega um `rotulo` e uma `descricao` em português porque é
 * exatamente isso que aparece no menu do painel de fluxo — quem monta o fluxo na
 * reunião é do comercial, e "consultar_fornecedor" não diz nada a ninguém.
 *
 * Acrescentar um verbo é acrescentar uma entrada aqui. O painel passa a
 * oferecê-lo no mesmo instante, sem tocar no front.
 */

/** O que uma etapa acumula enquanto o documento atravessa a esteira. */
export interface Estado {
  documento: Documento;
  cadastro: Cadastro;
  extraido: ReturnType<typeof extrair>;
  chavesConhecidas: string[];
  fornecedor: Fornecedor | null;
  classificacao: { centroCusto: string; contaContabil: string } | null;
  proposta: Item["proposta"];
}

export interface DecisaoDaAcao {
  acao: string;
  razao: string;
  confianca: number;
}

export interface Acao {
  rotulo: string;
  descricao: string;
  executar: (estado: Estado) => DecisaoDaAcao | null;
}

export interface Condicao {
  rotulo: string;
  descricao: string;
  /** O que vira o motivo na fila quando ela dispara e não há um mais específico. */
  motivoPadrao: string;
  avaliar: (estado: Estado) => {
    bate: boolean;
    razao: string;
    confianca: number;
    /**
     * Um motivo com o NÚMERO dentro, quando a condição tem um.
     *
     * "Divergência de R$ 18,90 com o pedido" na fila vale muito mais do que
     * "Divergência com o pedido": quem está olhando a fila decide se vale a pena
     * abrir o item sem precisar abrir o item.
     */
    motivo?: string;
  };
}

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const ACOES: Record<string, Acao> = {
  extrair: {
    rotulo: "Ler o documento",
    descricao: "extrai emitente, valor, vencimento e o resto do que veio no arquivo",
    executar: (e) => ({
      acao: "extraiu o documento",
      razao: `${e.documento.tipo.toUpperCase()} de ${e.extraido.fornecedorNome}, ${brl(e.extraido.valor)}, vencimento ${e.extraido.vencimento ?? "não informado"}`,
      confianca: 0.99,
    }),
  },

  consultar_fornecedor: {
    rotulo: "Procurar o fornecedor no cadastro",
    descricao: "acha o CNPJ no cadastro e traz centro de custo, conta e condição de pagamento",
    executar: (e) => {
      e.fornecedor = consultarFornecedor(e.cadastro, e.extraido.fornecedorCnpj);
      return e.fornecedor
        ? {
            acao: "identificou o fornecedor",
            razao: `${e.fornecedor.nome}, condição ${e.fornecedor.condicao}`,
            confianca: 0.98,
          }
        : {
            acao: "não encontrou o fornecedor",
            razao: `CNPJ ${e.extraido.fornecedorCnpj || "ausente"} não está no cadastro`,
            confianca: 0.97,
          };
    },
  },

  classificar: {
    rotulo: "Classificar o lançamento",
    descricao: "define centro de custo e conta contábil pelo histórico do fornecedor",
    executar: (e) => {
      if (!e.fornecedor) return null;
      e.classificacao = {
        centroCusto: e.fornecedor.centroCusto,
        contaContabil: e.fornecedor.contaContabil,
      };
      return {
        acao: "classificou o lançamento",
        razao: `centro de custo ${e.fornecedor.centroCusto} e conta ${e.fornecedor.contaContabil}, pelo histórico do fornecedor`,
        confianca: 0.94,
      };
    },
  },

  conferir: {
    rotulo: "Conferir contra pedido, retenção e alçada",
    descricao: "calcula a diferença com o pedido e checa as regras — não estima nada",
    executar: (e) => ({
      acao: "conferiu conformidade",
      razao: "valor bate com o pedido e as retenções estão destacadas",
      confianca: 0.95,
    }),
  },

  propor: {
    rotulo: "Propor o lançamento",
    descricao: "fecha a proposta para um humano aprovar",
    executar: (e) => {
      if (!e.fornecedor) return null;
      e.proposta = {
        fornecedor: e.fornecedor.nome,
        centroCusto: e.classificacao?.centroCusto ?? e.fornecedor.centroCusto,
        contaContabil: e.classificacao?.contaContabil ?? e.fornecedor.contaContabil,
        valor: e.extraido.valor,
        vencimento: e.extraido.vencimento,
      };
      return {
        acao: "propôs o lançamento",
        razao: "pronto para aprovação — o humano decide",
        confianca: 0.95,
      };
    },
  },
};

export const CONDICOES: Record<string, Condicao> = {
  documento_duplicado: {
    rotulo: "Documento já lançado",
    descricao: "a chave desta nota já passou por aqui",
    motivoPadrao: "Documento já lançado — chave duplicada",
    avaliar: (e) => ({
      bate: verificarDuplicidade(e.cadastro, e.extraido.chave, e.chavesConhecidas),
      razao: `a chave ${e.extraido.chave.slice(-8)} já foi lançada`,
      confianca: 1,
    }),
  },

  fornecedor_ausente: {
    rotulo: "Fornecedor fora do cadastro",
    descricao: "sem cadastro não há centro de custo nem conta contábil",
    motivoPadrao: "Fornecedor não cadastrado",
    avaliar: (e) => ({
      bate: e.fornecedor === null,
      razao: `CNPJ ${e.extraido.fornecedorCnpj || "ausente"} não está no cadastro — sem ele não há como classificar`,
      confianca: 0.97,
    }),
  },

  divergencia_pedido: {
    rotulo: "Valor diferente do pedido",
    descricao: "a nota não bate com o pedido de compra",
    motivoPadrao: "Divergência com o pedido",
    avaliar: (e) => {
      const delta = divergencia(e.extraido.valor, e.extraido.valorPedido);
      const bate = delta !== null && Math.abs(delta) > 0.01;
      return {
        bate,
        razao: bate
          ? `nota ${brl(e.extraido.valor)} contra pedido ${brl(e.extraido.valorPedido!)} — diferença de ${brl(Math.abs(delta!))}`
          : "",
        confianca: 0.96,
        motivo: bate ? `Divergência de ${brl(Math.abs(delta!))} com o pedido` : undefined,
      };
    },
  },

  retencao_inss_ausente: {
    rotulo: "Retenção de INSS não destacada",
    descricao: "serviço com cessão de mão de obra que veio sem a retenção",
    motivoPadrao: "Retenção de INSS não destacada",
    avaliar: (e) => ({
      bate: exigeRetencaoInss(e.extraido.descricao, e.extraido.retencoes),
      razao: "serviço com cessão de mão de obra sem a retenção de INSS de 11% destacada",
      confianca: 0.91,
    }),
  },

  acima_alcada: {
    rotulo: "Acima da alçada",
    descricao: "valor maior do que o limite de aprovação automática",
    motivoPadrao: "Acima da alçada de aprovação automática",
    avaliar: (e) => ({
      bate: e.extraido.valor > e.cadastro.alcadaAprovacaoAutomatica,
      razao: `${brl(e.extraido.valor)} acima do limite de ${brl(e.cadastro.alcadaAprovacaoAutomatica)} para aprovação automática`,
      confianca: 1,
    }),
  },
};

/** O que o painel de fluxo oferece nos menus. */
export function catalogo() {
  return {
    acoes: Object.entries(ACOES).map(([id, a]) => ({
      id,
      rotulo: a.rotulo,
      descricao: a.descricao,
    })),
    condicoes: Object.entries(CONDICOES).map(([id, c]) => ({
      id,
      rotulo: c.rotulo,
      descricao: c.descricao,
      motivoPadrao: c.motivoPadrao,
    })),
  };
}
