import { carregarCadastro, type Fornecedor } from "../agente/ferramentas";
import type { Item } from "../itens/tipos";

/**
 * O histórico com que a demo NASCE.
 *
 * Uma tela que abre zerada não parece um produto instalado, parece um formulário
 * em branco — e o cliente precisa de dois segundos para entender o valor, não de
 * uma execução inteira. Então a esteira já chega com semanas de trabalho feito
 * atrás dela, e o lote do dia é o que roda na frente dele.
 *
 * Gerado, e não escrito à mão, porque quarenta itens plausíveis à mão custam uma
 * tarde e envelhecem — mas gerado com SEMENTE FIXA: a mesma demo, na segunda
 * passada, tem os mesmos números. Aleatório de verdade faria o valor na tela
 * mudar entre a preparação e a reunião, e é exatamente aí que alguém pergunta
 * "esse número saiu de onde?".
 *
 * Quando o cliente manda uma planilha, ela substitui isto: converta para
 * `dados/documentos/` e o histórico gerado deixa de ser necessário.
 */

/** mulberry32 — pequeno, determinístico e suficiente para semear uma demo. */
function rng(semente: number): () => number {
  let a = semente;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MOTIVOS = [
  "Divergência com o pedido",
  "Fornecedor não cadastrado",
  "Retenção de INSS não destacada",
  "Acima da alçada de aprovação automática",
  "Documento já lançado — chave duplicada",
];

const SERVICOS = [
  "Prestação de serviço de transporte rodoviário de carga",
  "Licenciamento de software e suporte técnico",
  "Manutenção preventiva predial",
  "Serviço de limpeza e conservação",
  "Materiais de escritório e consumo",
  "Consultoria técnica contratada",
];

export interface Historico {
  itens: Item[];
}

/**
 * `dias` de trabalho para trás, a partir de hoje. O `hoje` entra por parâmetro
 * para o gerador continuar determinístico num teste.
 */
export function gerarHistorico(quantidade = 38, semente = 20260915, hoje = new Date()): Item[] {
  const aleatorio = rng(semente);
  const cadastro = carregarCadastro();
  const itens: Item[] = [];

  for (let i = 0; i < quantidade; i += 1) {
    const fornecedor = cadastro.fornecedores[Math.floor(aleatorio() * cadastro.fornecedores.length)] as Fornecedor;
    const servico = SERVICOS[Math.floor(aleatorio() * SERVICOS.length)];
    // Entre 1 e 21 dias atrás, e nunca hoje: hoje é o lote que o agente roda ao
    // vivo, e misturar os dois tira do cliente a noção do que acabou de rodar.
    const diasAtras = 1 + Math.floor(aleatorio() * 21);
    const recebido = new Date(hoje.getTime() - diasAtras * 86400000);
    const valor = Math.round((800 + aleatorio() * 24000) * 100) / 100;
    // Pouco mais de um quinto em revisão. Uma esteira 100% verde não convence
    // ninguém que já trabalhou com contas a pagar.
    const revisao = aleatorio() < 0.22;
    const motivo = MOTIVOS[Math.floor(aleatorio() * MOTIVOS.length)];
    const numero = 10000 + Math.floor(aleatorio() * 89999);
    const vencimento = new Date(recebido.getTime() + 30 * 86400000);

    itens.push({
      id: `hist-${String(i + 1).padStart(4, "0")}`,
      documento: {
        id: `hist-${String(i + 1).padStart(4, "0")}`,
        tipo: "nfe",
        assunto: `NF-e ${numero} - ${fornecedor.nome.split(" ")[0]}`,
        recebidoEm: recebido.toISOString(),
        remetente: `faturamento@${fornecedor.nome.split(" ")[0].toLowerCase()}.com.br`,
        conteudo: {
          chave: `3526${String(numero).padStart(8, "0")}${String(Math.floor(aleatorio() * 1e12)).padStart(12, "0")}`,
          numero: String(numero),
          emitente: { nome: fornecedor.nome, cnpj: fornecedor.cnpj },
          emissao: recebido.toISOString().slice(0, 10),
          vencimento: vencimento.toISOString().slice(0, 10),
          valorTotal: valor,
          descricao: `${servico} - ${recebido.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}`,
          valorPedido: valor,
          retencoes: { iss: 0, irrf: Math.round(valor * 0.015 * 100) / 100, inss: 0 },
        },
      },
      estado: revisao ? "revisao" : "pronto",
      proposta: revisao
        ? null
        : {
            fornecedor: fornecedor.nome,
            centroCusto: fornecedor.centroCusto,
            contaContabil: fornecedor.contaContabil,
            valor,
            vencimento: vencimento.toISOString().slice(0, 10),
          },
      motivoRevisao: revisao ? motivo : null,
      decisoes: trilha(fornecedor, valor, revisao, motivo, recebido),
      atualizadoEm: recebido.toISOString(),
    });
  }

  return itens;
}

/**
 * A trilha do histórico existe pelo mesmo motivo que a do lote ao vivo: o
 * cliente vai clicar num item antigo, e um item sem trilha denuncia que o resto
 * é encenação.
 */
function trilha(
  fornecedor: Fornecedor,
  valor: number,
  revisao: boolean,
  motivo: string,
  quando: Date,
): Item["decisoes"] {
  const em = (s: number) => new Date(quando.getTime() + s * 1000).toISOString();
  const brl = valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const base = [
    { agente: "simulado", acao: "extraiu o documento", razao: `NFE de ${fornecedor.nome}, ${brl}`, confianca: 0.99, em: em(2) },
    {
      agente: "simulado",
      acao: "identificou o fornecedor",
      razao: `${fornecedor.nome}, condição ${fornecedor.condicao}`,
      confianca: 0.98,
      em: em(5),
    },
    {
      agente: "simulado",
      acao: "classificou o lançamento",
      razao: `centro de custo ${fornecedor.centroCusto} e conta ${fornecedor.contaContabil}, pelo histórico do fornecedor`,
      confianca: 0.94,
      em: em(9),
    },
  ];
  return revisao
    ? [...base, { agente: "simulado", acao: "escalou para revisão", razao: motivo.toLowerCase(), confianca: 0.93, em: em(12) }]
    : [
        ...base,
        { agente: "simulado", acao: "conferiu conformidade", razao: "valor bate com o pedido e as retenções estão destacadas", confianca: 0.95, em: em(12) },
        { agente: "simulado", acao: "propôs o lançamento", razao: "pronto para aprovação — o humano decide", confianca: 0.95, em: em(14) },
      ];
}
