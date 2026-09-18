import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import * as z from "zod/v4";
import type { Contexto, Motor, Resultado } from "./tipos";
import {
  carregarCadastro,
  consultarFornecedor,
  divergencia,
  exigeRetencaoInss,
  extrair,
  verificarDuplicidade,
} from "./ferramentas";

/**
 * O motor de verdade: o modelo conduz o trabalho chamando as ferramentas.
 *
 * As ferramentas são as MESMAS do motor simulado — cadastro, duplicidade,
 * política, divergência. O modelo não calcula valor nem inventa conta contábil;
 * ele decide o que perguntar e o que concluir. Quando o cliente perguntar "e se
 * a IA errar o número?", a resposta está nesta linha: o número não passa por
 * ela.
 *
 * `concluir` e `escalar` existem como ferramentas porque é assim que se arranca
 * uma saída estruturada de um laço de agente sem depender de o modelo devolver
 * JSON no texto — ele chama uma das duas, e o laço acaba.
 */
/**
 * De onde vem o modelo.
 *
 * `anthropic` (padrão) fala com a API da Anthropic. `bedrock` fala com o Amazon
 * Bedrock na conta AWS de quem está rodando — que é o que alguns clientes
 * exigem, porque aí o prompt não sai da nuvem deles.
 *
 * O Floci emula `bedrock-runtime`, e é tentador apontar a demo para lá: NÃO
 * funciona para o que interessa. O emulador devolve um texto fixo
 * ("Floci stub response") com o formato certo — serve para provar que a
 * credencial e a rota estão de pé, e não para mostrar um agente decidindo. Uma
 * demo local com inteligência de verdade usa o motor `simulado`; uma demo com
 * Bedrock aponta para o Bedrock de verdade.
 *
 * O cliente do Bedrock vem do pacote `@anthropic-ai/bedrock-sdk`, que não é
 * instalado por padrão:
 *
 *   npm install --workspace @demo/api @anthropic-ai/bedrock-sdk
 *
 * e no Bedrock o `model` é o ID de lá (`anthropic.claude-...`), não o da API da
 * Anthropic — por isso `AGENTE_MODELO` existe.
 */
function criarCliente(): Anthropic {
  if ((process.env.AGENTE_PROVEDOR ?? "anthropic") !== "bedrock") return new Anthropic();
  // `require` com o nome numa variável, pela mesma razão dos adaptadores de
  // nuvem: sem o pacote instalado, um import estático quebraria a compilação de
  // toda demo que não usa Bedrock.
  const pacote = "@anthropic-ai/bedrock-sdk";
  const { AnthropicBedrockMantle } = require(pacote);
  return new AnthropicBedrockMantle({
    awsRegion: process.env.AWS_REGION ?? "us-east-1",
  }) as Anthropic;
}

export class MotorClaude implements Motor {
  readonly nome = "claude";
  private readonly cliente = criarCliente();

  async processar(ctx: Contexto): Promise<Resultado> {
    const cadastro = carregarCadastro();
    const d = extrair(ctx.documento);
    let saida: Resultado | null = null;

    ctx.no("leitura", "executando");

    const ferramentas = [
      betaZodTool({
        name: "consultar_fornecedor",
        description:
          "Procura o CNPJ no cadastro de fornecedores. Devolve nome, centro de custo, conta contábil e condição de pagamento, ou informa que não existe.",
        inputSchema: z.object({ cnpj: z.string().describe("CNPJ do emitente, com ou sem máscara") }),
        run: ({ cnpj }) => {
          ctx.no("leitura", "concluido");
          ctx.no("cadastro", "executando");
          const f = consultarFornecedor(cadastro, cnpj);
          return f ? JSON.stringify(f) : "fornecedor não cadastrado";
        },
      }),
      betaZodTool({
        name: "verificar_duplicidade",
        description: "Diz se a chave do documento já foi lançada ou já está na esteira.",
        inputSchema: z.object({ chave: z.string() }),
        run: ({ chave }) =>
          verificarDuplicidade(cadastro, chave, ctx.chavesConhecidas)
            ? "duplicado: esta chave já foi lançada"
            : "não há lançamento com esta chave",
      }),
      betaZodTool({
        name: "conferir_conformidade",
        description:
          "Confere o documento contra o pedido, as regras de retenção e a alçada de aprovação automática. É esta ferramenta que calcula — não estime valores por conta própria.",
        inputSchema: z.object({}),
        run: () => {
          ctx.no("cadastro", "concluido");
          ctx.no("conformidade", "executando");
          return JSON.stringify({
            divergenciaComPedido: divergencia(d.valor, d.valorPedido),
            retencaoInssAusente: exigeRetencaoInss(d.descricao, d.retencoes),
            alcada: cadastro.alcadaAprovacaoAutomatica,
            acimaDaAlcada: d.valor > cadastro.alcadaAprovacaoAutomatica,
          });
        },
      }),
      betaZodTool({
        name: "registrar_decisao",
        description:
          "Registra uma decisão na trilha que o humano vai ler. Chame a cada conclusão parcial, com a razão em uma frase e a confiança de 0 a 1.",
        inputSchema: z.object({
          acao: z.string().describe("o que você decidiu, no passado: 'identificou o fornecedor'"),
          razao: z.string().describe("por que, em uma frase, citando o número que sustenta"),
          confianca: z.number().min(0).max(1),
        }),
        run: ({ acao, razao, confianca }) => {
          ctx.decidir(acao, razao, confianca);
          return "registrado";
        },
      }),
      betaZodTool({
        name: "propor_lancamento",
        description: "Encerra com uma proposta de lançamento para o humano aprovar.",
        inputSchema: z.object({
          fornecedor: z.string(),
          centroCusto: z.string(),
          contaContabil: z.string(),
        }),
        run: ({ fornecedor, centroCusto, contaContabil }) => {
          ctx.no("conformidade", "concluido");
          ctx.no("proposta", "concluido");
          saida = {
            proposta: { fornecedor, centroCusto, contaContabil, valor: d.valor, vencimento: d.vencimento },
            revisao: null,
            decisoes: [],
          };
          return "proposta registrada";
        },
      }),
      betaZodTool({
        name: "escalar_para_humano",
        description:
          "Encerra devolvendo o documento para revisão humana. Use sempre que a conferência apontar algo que você não pode resolver sozinho.",
        inputSchema: z.object({ motivo: z.string().describe("uma linha curta, do jeito que apareceria numa fila") }),
        run: ({ motivo }) => {
          ctx.no("conformidade", "excecao");
          saida = { proposta: null, revisao: motivo, decisoes: [] };
          return "escalado";
        },
      }),
    ];

    const runner = this.cliente.beta.messages.toolRunner({
      model: process.env.AGENTE_MODELO ?? "claude-opus-5",
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      // `low` porque o trabalho é curto e as contas já vêm prontas das
      // ferramentas — o que se quer do modelo aqui é condução, não deliberação.
      // Numa demo isso também é latência na frente do cliente.
      output_config: { effort: "low" },
      max_iterations: 12,
      system: SISTEMA,
      tools: ferramentas,
      messages: [
        {
          role: "user",
          content: `Documento recebido de ${ctx.documento.remetente} em ${ctx.documento.recebidoEm}:\n\n${JSON.stringify(ctx.documento.conteudo, null, 2)}`,
        },
      ],
    });

    await runner.runUntilDone();

    // O laço pode terminar sem o modelo ter chamado nenhuma das duas ferramentas
    // de encerramento — teto de iterações, ou ele simplesmente responde em texto.
    // Nesse caso o item vai para revisão humana: é o único desfecho honesto, e é
    // o mesmo que o produto faria.
    return saida ?? { proposta: null, revisao: "Agente encerrou sem conclusão", decisoes: [] };
  }
}

const SISTEMA = `Você processa documentos de contas a pagar para o time financeiro.

Conduza assim, sempre: verifique duplicidade, consulte o fornecedor pelo CNPJ,
confira a conformidade, e encerre com propor_lancamento ou escalar_para_humano.

Regras que não se negociam:
- Nunca calcule nem estime valores. A ferramenta conferir_conformidade é a fonte
  de qualquer número — se ela não disser, você não sabe.
- Registre uma decisão com registrar_decisao a cada conclusão parcial, antes de
  seguir. É essa trilha que o humano lê.
- Fornecedor fora do cadastro, divergência com o pedido, retenção ausente ou
  valor acima da alçada são motivos de escalar_para_humano, não de propor.
- Você recomenda; quem aprova é uma pessoa.

Escreva em português do Brasil, uma frase por razão, sempre citando o número que
a sustenta.`;
