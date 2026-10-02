import { Controller, Get, Inject } from "@nestjs/common";
import type { Pool } from "pg";
import { QUEUE, STORAGE } from "../cloud/cloud.module";
import { currentCloud, type Queue, type Storage } from "../cloud/ports";
import { PG } from "../db/db.module";
import { TelemetryService } from "../telemetry/telemetry.service";
import { FlowService } from "../flow/flow.service";

/**
 * The same Postgres, under the name it carries in each cloud. Not cosmetic: a
 * client on GCP needs to hear "Cloud SQL", not "Aurora".
 */
const DATABASE = {
  aws: "PostgreSQL 17 (Aurora)",
  gcp: "PostgreSQL 17 (Cloud SQL)",
  azure: "PostgreSQL 17 (Azure Database)",
} as const;

/**
 * The demo's stack, component by component — this is what the sidebar panel
 * shows.
 *
 * Every line is a CALL to that dependency, not an inherited status: that is what
 * turns "the demo is down" into the dependency that did not answer. Same
 * principle as the gatekeeper's diagnosis.
 *
 * The `role` field exists for the client: nobody in a commercial meeting knows
 * what "SQS" is, and the sentence next to it is what turns a list into an
 * explanation of the architecture. Those strings are in Portuguese because they
 * are read on screen.
 */
@Controller("health")
export class HealthController {
  constructor(
    @Inject(STORAGE) private readonly files: Storage,
    @Inject(QUEUE) private readonly queue: Queue,
    @Inject(PG) private readonly pg: Pool,
    private readonly telemetry: TelemetryService,
    private readonly flow: FlowService,
  ) {}

  @Get()
  async health() {
    const check = async (name: string, technology: string, role: string, f: () => Promise<unknown>) => {
      const start = Date.now();
      try {
        await f();
        return { name, technology, role, ok: true, ms: Date.now() - start, detail: null as string | null };
      } catch (error) {
        return { name, technology, role, ok: false, ms: Date.now() - start, detail: (error as Error).message };
      }
    };

    const engine = process.env.AGENT_ENGINE === "claude" ? "claude" : "rules";
    const vocabulary = (await this.flow.current()).vocabulary;

    return {
      engine,
      cloud: currentCloud(),
      components: await Promise.all([
        check("Banco de dados", DATABASE[currentCloud()], "guarda os documentos, as propostas e a trilha de decisões", () =>
          this.pg.query("SELECT 1"),
        ),
        check(
          "Armazenamento",
          this.files.technology,
          `recebe ${vocabulary.incoming.toLowerCase()}s como eles chegam — NF-e, boleto, anexo de e-mail`,
          () => this.files.health(),
        ),
        check(
          "Fila de trabalho",
          this.queue.technology,
          "distribui o trabalho para o agente processar, um a um",
          () => this.queue.health(),
        ),
        check(
          "Agente",
          engine === "claude" ? "Claude (Tool Runner)" : "motor determinístico",
          engine === "claude"
            ? "lê, consulta o cadastro, confere e propõe — sem calcular valor por conta própria"
            : "as mesmas regras do agente, sem chamar modelo — para rodar offline e sempre igual",
          async () => true,
        ),
      ]),
      telemetry: this.telemetry.summary(),
    };
  }
}
