import { Inject, Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { FILA_TRABALHO } from "../nuvem/nuvem.module";
import type { Fila } from "../nuvem/portas";
import { ItensService } from "../itens/itens.service";
import { EventosService } from "../eventos/eventos.service";
import { ProvisionamentoService } from "../provisionamento/provisionamento.service";
import { TelemetriaService } from "../telemetria/telemetria.service";
import { MotorSimulado } from "./motor-simulado";
import { MotorClaude } from "./motor-claude";
import type { Motor, No } from "./tipos";
import { extrair } from "./ferramentas";
import type { Decisao } from "../itens/tipos";

@Injectable()
export class AgenteService implements OnApplicationBootstrap {
  private readonly log = new Logger(AgenteService.name);
  private readonly motor: Motor;

  constructor(
    @Inject(FILA_TRABALHO) private readonly fila: Fila,
    private readonly itens: ItensService,
    private readonly eventos: EventosService,
    private readonly provisionamento: ProvisionamentoService,
    private readonly telemetria: TelemetriaService,
  ) {
    // A escolha é de ambiente, não de código: a tela não sabe qual motor rodou,
    // e trocar de um para o outro é uma linha no .env.
    this.motor = process.env.AGENTE_MOTOR === "claude" ? new MotorClaude() : new MotorSimulado();
    this.log.log(`motor do agente: ${this.motor.nome}`);
  }

  async onApplicationBootstrap() {
    // A ordem importa e é a única que funciona: provisionar cria o que existe,
    // importar traz o que o S3 tem, e só então o laço tem o que consumir.
    await this.provisionamento.provisionar();
    await this.itens.importar();
    void this.consumir();
  }

  /** Enfileira todo item pendente. É o que o botão "executar esteira" dispara. */
  async executar(): Promise<number> {
    const pendentes = (await this.itens.listar()).filter((i) => i.estado === "pendente");
    for (const item of pendentes) {
      await this.telemetria.medir("fila", "enviar trabalho", () => this.fila.enviar(item.id));
    }
    return pendentes.length;
  }

  /**
   * O laço do worker, no mesmo processo da API.
   *
   * Numa instalação de verdade isto é um serviço à parte, e é exatamente essa a
   * conversa que a demo abre — o trabalho já chega por fila, então separar é
   * mudar onde o processo roda, não reescrever o fluxo.
   *
   * `WaitTimeSeconds: 10` é long polling: sem ele o laço gira contra o emulador
   * o tempo todo e o ventilador do notebook entra na reunião junto.
   */
  private async consumir(): Promise<void> {
    for (;;) {
      try {
        // A espera de 10s NÃO é medida: ela fica pendurada por projeto, e
        // registrar isso encheria a telemetria de linhas de 10.000 ms que não
        // são trabalho nenhum.
        const mensagens = await this.fila.receber(10);
        for (const msg of mensagens) {
          await this.telemetria.medir("agente", `processar ${msg.corpo}`, () => this.processar(msg.corpo));
          // A confirmação vem DEPOIS de processar: se o processo morrer no
          // meio, a mensagem volta para a fila em vez de sumir com o trabalho.
          await this.telemetria.medir("fila", "confirmar", () => msg.confirmar());
        }
      } catch (erro) {
        this.log.error(`laço do worker: ${(erro as Error).message}`);
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }

  private async processar(itemId: string): Promise<void> {
    const item = await this.itens.buscar(itemId);
    if (!item || item.estado !== "pendente") return;

    await this.itens.gravar({ ...item, estado: "processando" });
    this.eventos.publicar({ tipo: "item", itemId });

    const decisoes: Decisao[] = [];
    const chavesConhecidas = (await this.itens.listar())
      .filter((i) => i.id !== itemId && i.estado === "pronto")
      .map((i) => extrair(i.documento).chave);

    const resultado = await this.motor.processar({
      documento: item.documento,
      chavesConhecidas,
      no: (no: No, estado) => this.eventos.publicar({ tipo: "no", itemId, no, estado }),
      decidir: (acao, razao, confianca) => {
        const decisao: Decisao = { agente: this.motor.nome, acao, razao, confianca, em: new Date().toISOString() };
        decisoes.push(decisao);
        this.eventos.publicar({ tipo: "decisao", itemId, agente: decisao.agente, acao, razao, confianca });
      },
    });

    if (resultado.revisao) this.eventos.publicar({ tipo: "excecao", itemId, motivo: resultado.revisao });

    await this.itens.gravar({
      ...item,
      estado: resultado.revisao ? "revisao" : "pronto",
      proposta: resultado.proposta,
      motivoRevisao: resultado.revisao,
      decisoes,
      atualizadoEm: new Date().toISOString(),
    });
    this.eventos.publicar({ tipo: "item", itemId });
  }
}
