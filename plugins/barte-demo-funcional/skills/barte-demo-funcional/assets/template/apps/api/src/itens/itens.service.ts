import { Inject, Injectable, Logger } from "@nestjs/common";
import type { Pool } from "pg";
import { ARMAZENAMENTO } from "../nuvem/nuvem.module";
import type { Armazenamento } from "../nuvem/portas";
import { PG } from "../db/db.module";
import { TelemetriaService } from "../telemetria/telemetria.service";
import type { Documento, Item } from "./tipos";
import { rebasear } from "./rebase";

@Injectable()
export class ItensService {
  private readonly log = new Logger(ItensService.name);

  constructor(
    @Inject(ARMAZENAMENTO) private readonly arquivos: Armazenamento,
    @Inject(PG) private readonly pg: Pool,
    private readonly telemetria: TelemetriaService,
  ) {}

  /**
   * Traz para a esteira todo documento do armazenamento que ainda não virou item.
   *
   * Não sobrescreve item existente: o que o agente já decidiu sobrevive a um
   * `make up` — que é o que permite fechar o notebook depois da reunião e
   * reabrir no mesmo ponto.
   */
  async importar(): Promise<number> {
    const chaves = await this.telemetria.medir("armazenamento", "listar documentos/", () =>
      this.arquivos.listar("documentos/"),
    );

    // Duas passadas: a primeira só para achar o documento mais recente do lote,
    // que é o que define o deslocamento de TODOS. Rebasear cada um pelo próprio
    // carimbo faria o lote inteiro chegar no mesmo instante e sumir com a ordem
    // em que as coisas aconteceram.
    const documentos: Documento[] = [];
    for (const chave of chaves) {
      if (!chave.endsWith(".json")) continue;
      const corpo = await this.telemetria.medir("armazenamento", `ler ${chave}`, () =>
        this.arquivos.ler(chave),
      );
      documentos.push(JSON.parse(corpo) as Documento);
    }
    const maisRecente = documentos
      .map((d) => d.recebidoEm)
      .sort()
      .at(-1);

    let novos = 0;
    for (const bruto of documentos) {
      if (await this.buscar(bruto.id)) continue;
      const documento = maisRecente ? rebasear(bruto, maisRecente) : bruto;
      await this.gravar({
        id: documento.id,
        documento,
        estado: "pendente",
        proposta: null,
        motivoRevisao: null,
        decisoes: [],
        atualizadoEm: new Date().toISOString(),
      });
      novos += 1;
    }
    if (novos) this.log.log(`${novos} documento(s) importado(s) do armazenamento`);
    return novos;
  }

  async listar(): Promise<Item[]> {
    // Mais recente primeiro: o lote do dia — o que o agente vai processar na
    // frente do cliente — tem de abrir no topo, acima do histórico semeado.
    const r = await this.telemetria.medir("postgres", "SELECT itens", () =>
      this.pg.query("SELECT * FROM itens ORDER BY recebido_em DESC"),
    );
    return r.rows.map(daLinha);
  }

  async buscar(id: string): Promise<Item | null> {
    const r = await this.telemetria.medir("postgres", "SELECT item por id", () =>
      this.pg.query("SELECT * FROM itens WHERE id = $1", [id]),
    );
    return r.rows[0] ? daLinha(r.rows[0]) : null;
  }

  async gravar(item: Item): Promise<void> {
    const valor = Number((item.documento.conteudo as Record<string, unknown>).valorTotal ?? 0);
    await this.telemetria.medir("postgres", "UPSERT item", () =>
      this.pg.query(
        `INSERT INTO itens (id, estado, recebido_em, valor, motivo_revisao, documento, proposta, decisoes, atualizado_em)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
         ON CONFLICT (id) DO UPDATE SET
           estado = EXCLUDED.estado,
           valor = EXCLUDED.valor,
           motivo_revisao = EXCLUDED.motivo_revisao,
           documento = EXCLUDED.documento,
           proposta = EXCLUDED.proposta,
           decisoes = EXCLUDED.decisoes,
           atualizado_em = now()`,
        [
          item.id,
          item.estado,
          item.documento.recebidoEm,
          valor,
          item.motivoRevisao,
          JSON.stringify(item.documento),
          item.proposta ? JSON.stringify(item.proposta) : null,
          JSON.stringify(item.decisoes),
        ],
      ),
    );
  }

  async contar(): Promise<number> {
    const r = await this.telemetria.medir("postgres", "COUNT itens", () =>
      this.pg.query<{ n: string }>("SELECT count(*)::text AS n FROM itens"),
    );
    return Number(r.rows[0]?.n ?? 0);
  }
}

/**
 * Linha do banco → item da aplicação.
 *
 * `jsonb` volta do `pg` já desserializado, então nada de `JSON.parse` aqui —
 * chamá-lo sobre um objeto é o erro que dá "[object Object] is not valid JSON"
 * em runtime e passa reto na compilação.
 */
function daLinha(linha: Record<string, unknown>): Item {
  return {
    id: linha.id as string,
    documento: linha.documento as Item["documento"],
    estado: linha.estado as Item["estado"],
    proposta: (linha.proposta as Item["proposta"]) ?? null,
    motivoRevisao: (linha.motivo_revisao as string | null) ?? null,
    decisoes: (linha.decisoes as Item["decisoes"]) ?? [],
    atualizadoEm: new Date(linha.atualizado_em as string).toISOString(),
  };
}
