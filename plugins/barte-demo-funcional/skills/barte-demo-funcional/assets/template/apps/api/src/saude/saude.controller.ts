import { Controller, Get, Inject } from "@nestjs/common";
import type { Pool } from "pg";
import { ARMAZENAMENTO, FILA_TRABALHO } from "../nuvem/nuvem.module";
import { nuvemAtual, type Armazenamento, type Fila } from "../nuvem/portas";
import { PG } from "../db/db.module";
import { TelemetriaService } from "../telemetria/telemetria.service";

/**
 * A stack da demo, peça por peça — é o que o painel da barra lateral mostra.
 *
 * Cada linha é uma CHAMADA àquela dependência, não um status herdado: é o que
 * transforma "a demo está fora" na dependência que não respondeu. Mesmo
 * princípio do diagnóstico do gatekeeper.
 *
 * O campo `papel` existe para o cliente: ninguém numa reunião comercial sabe o
 * que é "SQS", e a frase ao lado é o que transforma a lista numa explicação da
 * arquitetura.
 */
/**
 * O mesmo Postgres, com o nome que ele tem em cada nuvem. Não é cosmético: o
 * cliente que usa GCP precisa ouvir "Cloud SQL", não "Aurora".
 */
const BANCO = {
  aws: "PostgreSQL 17 (Aurora)",
  gcp: "PostgreSQL 17 (Cloud SQL)",
  azure: "PostgreSQL 17 (Azure Database)",
} as const;

@Controller("saude")
export class SaudeController {
  constructor(
    @Inject(ARMAZENAMENTO) private readonly arquivos: Armazenamento,
    @Inject(FILA_TRABALHO) private readonly fila: Fila,
    @Inject(PG) private readonly pg: Pool,
    private readonly telemetria: TelemetriaService,
  ) {}

  @Get()
  async saude() {
    const checar = async (
      nome: string,
      tecnologia: string,
      papel: string,
      f: () => Promise<unknown>,
    ) => {
      const inicio = Date.now();
      try {
        await f();
        return { nome, tecnologia, papel, ok: true, ms: Date.now() - inicio, detalhe: null as string | null };
      } catch (erro) {
        return { nome, tecnologia, papel, ok: false, ms: Date.now() - inicio, detalhe: (erro as Error).message };
      }
    };

    const motor = process.env.AGENTE_MOTOR === "claude" ? "claude" : "simulado";

    return {
      motor,
      nuvem: nuvemAtual(),
      pecas: await Promise.all([
        checar("Banco de dados", BANCO[nuvemAtual()], "guarda os documentos, as propostas e a trilha de decisões", () =>
          this.pg.query("SELECT 1"),
        ),
        checar(
          "Armazenamento",
          this.arquivos.tecnologia,
          "recebe os documentos como eles chegam — NF-e, boleto, anexo de e-mail",
          () => this.arquivos.saude(),
        ),
        checar(
          "Fila de trabalho",
          this.fila.tecnologia,
          "distribui os documentos para o agente processar, um a um",
          () => this.fila.saude(),
        ),
        checar(
          "Agente",
          motor === "claude" ? "Claude (Tool Runner)" : "motor determinístico",
          motor === "claude"
            ? "lê, consulta o cadastro, confere e propõe — sem calcular valor por conta própria"
            : "as mesmas regras do agente, sem chamar modelo — para rodar offline e sempre igual",
          async () => true,
        ),
      ]),
      telemetria: this.telemetria.resumo(),
    };
  }
}
