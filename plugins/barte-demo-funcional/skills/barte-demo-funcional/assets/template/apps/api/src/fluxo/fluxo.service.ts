import { Inject, Injectable, Logger } from "@nestjs/common";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse, stringify } from "yaml";
import type { Pool } from "pg";
import { PG } from "../db/db.module";
import { dirDados } from "../raiz";
import { EventosService } from "../eventos/eventos.service";
import { ACOES, CONDICOES } from "./catalogo";
import { fluxoSchema, type Fluxo } from "./tipos";

/** O que a validação devolve quando o fluxo não serve. */
export class FluxoInvalido extends Error {
  constructor(readonly problemas: string[]) {
    super(problemas.join("; "));
  }
}

@Injectable()
export class FluxoService {
  private readonly log = new Logger(FluxoService.name);

  constructor(
    @Inject(PG) private readonly pg: Pool,
    private readonly eventos: EventosService,
  ) {}

  /** O fluxo do arquivo — a semente, e o destino do "voltar ao original". */
  doArquivo(): Fluxo {
    const texto = readFileSync(resolve(dirDados(), "fluxo.yaml"), "utf8");
    return this.validar(parse(texto));
  }

  async atual(): Promise<Fluxo> {
    const r = await this.pg.query<{ definicao: unknown }>(
      "SELECT definicao FROM fluxo WHERE id = 'atual'",
    );
    if (r.rows[0]) return r.rows[0].definicao as Fluxo;
    // Primeira subida: o banco ainda não viu fluxo nenhum.
    const doArquivo = this.doArquivo();
    await this.gravar(doArquivo);
    return doArquivo;
  }

  /**
   * Valida ANTES de gravar, e devolve os problemas em português.
   *
   * Quem edita isto está numa reunião, ao vivo, e provavelmente não é
   * desenvolvedor: um erro de validação não pode derrubar o fluxo que está
   * rodando nem falar em "ZodError". O que não passa aqui simplesmente não é
   * aplicado, e o que estava no ar continua no ar.
   */
  validar(bruto: unknown): Fluxo {
    const r = fluxoSchema.safeParse(bruto);
    if (!r.success) {
      throw new FluxoInvalido(
        r.error.issues.map((i) => {
          const onde = i.path.length ? `${i.path.join(".")}: ` : "";
          return `${onde}${i.message}`;
        }),
      );
    }

    const fluxo = r.data;
    const problemas: string[] = [];

    const vistos = new Set<string>();
    for (const etapa of fluxo.etapas) {
      if (vistos.has(etapa.id)) problemas.push(`a etapa "${etapa.id}" aparece duas vezes`);
      vistos.add(etapa.id);

      if (!ACOES[etapa.acao]) {
        problemas.push(
          `a etapa "${etapa.rotulo}" usa uma ação que não existe: "${etapa.acao}" (as que existem: ${Object.keys(ACOES).join(", ")})`,
        );
      }
      for (const condicao of etapa.escalaSe) {
        if (!CONDICOES[condicao]) {
          problemas.push(
            `a etapa "${etapa.rotulo}" usa uma regra que não existe: "${condicao}" (as que existem: ${Object.keys(CONDICOES).join(", ")})`,
          );
        }
      }
    }

    // Uma esteira sem a etapa que propõe nunca conclui nada: todo documento
    // acabaria em revisão humana, e a demo passaria a dizer que o agente não
    // resolve nada. Isso é aviso, não erro — pode ser exatamente o que se quer
    // mostrar num primeiro momento da narrativa.
    if (!fluxo.etapas.some((e) => e.acao === "propor")) {
      this.log.warn("fluxo sem a ação `propor`: nenhum documento vai concluir sozinho");
    }

    if (problemas.length) throw new FluxoInvalido(problemas);
    return fluxo;
  }

  /** Aplica um fluxo novo. Vale a partir do PRÓXIMO documento processado. */
  async salvar(bruto: unknown): Promise<Fluxo> {
    const fluxo = this.validar(bruto);
    await this.gravar(fluxo);
    // A tela redesenha a esteira sozinha quando recebe isto — sem recarregar a
    // página, que numa reunião é o momento em que alguém pergunta se quebrou.
    this.eventos.publicar({ tipo: "fluxo" });
    this.log.log(`fluxo atualizado: ${fluxo.etapas.length} etapa(s)`);
    return fluxo;
  }

  /** Aceita o YAML como texto — é o que o editor da aba "arquivo" manda. */
  async salvarTexto(texto: string): Promise<Fluxo> {
    let bruto: unknown;
    try {
      bruto = parse(texto);
    } catch (erro) {
      // A mensagem do parser de YAML é técnica, mas diz a LINHA — e numa
      // reunião isso é mais útil do que um "arquivo inválido" educado.
      throw new FluxoInvalido([`o arquivo não é um YAML válido — ${(erro as Error).message}`]);
    }
    return this.salvar(bruto);
  }

  async restaurar(): Promise<Fluxo> {
    return this.salvar(this.doArquivo());
  }

  /** O fluxo atual como texto, para abrir no editor. */
  async comoTexto(): Promise<string> {
    return stringify(await this.atual());
  }

  private async gravar(fluxo: Fluxo): Promise<void> {
    await this.pg.query(
      `INSERT INTO fluxo (id, definicao, atualizado_em) VALUES ('atual', $1, now())
       ON CONFLICT (id) DO UPDATE SET definicao = EXCLUDED.definicao, atualizado_em = now()`,
      [JSON.stringify(fluxo)],
    );
  }
}
