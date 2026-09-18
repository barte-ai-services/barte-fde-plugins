import { Inject, Injectable, Logger } from "@nestjs/common";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Pool } from "pg";
import { ARMAZENAMENTO, FILA_TRABALHO } from "../nuvem/nuvem.module";
import type { Armazenamento, Fila } from "../nuvem/portas";
import { PG } from "../db/db.module";
import { dirDados } from "../raiz";
import { gerarHistorico } from "./historico";

/**
 * Cria bucket, fila e esquema, e semeia documentos e histórico.
 *
 * Numa instalação de verdade isto é Terraform mais uma ferramenta de migração, e
 * o processo NUNCA criaria a própria infraestrutura. Aqui alguém tem de fazer
 * esse papel e é este serviço — sem um contêiner a mais e, sobretudo, sem bind
 * mount: montar arquivo do repositório dentro de contêiner depende do
 * compartilhamento do Docker Desktop, e onde o caminho não está compartilhado
 * ele monta um diretório vazio e a subida morre com uma mensagem que não diz
 * isso.
 *
 * Idempotente de ponta a ponta: roda a cada subida e nunca apaga o que o agente
 * já decidiu.
 */
@Injectable()
export class ProvisionamentoService {
  private readonly log = new Logger(ProvisionamentoService.name);

  constructor(
    @Inject(ARMAZENAMENTO) private readonly arquivos: Armazenamento,
    @Inject(FILA_TRABALHO) private readonly fila: Fila,
    @Inject(PG) private readonly pg: Pool,
  ) {}

  async provisionar(): Promise<void> {
    await this.esquema();
    await this.arquivos.garantir();
    await this.fila.garantir();
    await this.semear();
    await this.historico();
  }

  private async esquema(): Promise<void> {
    // O `.sql` é lido de `dist/db/` — o TypeScript compila `.ts` e IGNORA
    // qualquer outra coisa, então sem alguém copiando o arquivo o processo sobe
    // e morre no primeiro `readFileSync`, já com as rotas mapeadas (o que faz o
    // log parecer saudável até a última linha). Quem copia é o `assets` do
    // `nest-cli.json`, com `watchAssets` para valer também em desenvolvimento.
    const sql = readFileSync(resolve(__dirname, "../db/esquema.sql"), "utf8");
    await this.pg.query(sql);
  }

  private async semear(): Promise<void> {
    const dir = resolve(dirDados(), "documentos");
    let arquivos: string[];
    try {
      arquivos = readdirSync(dir).filter((f) => f.endsWith(".json"));
    } catch {
      this.log.warn(`sem documentos em ${dir} — a esteira sobe vazia`);
      return;
    }
    for (const arquivo of arquivos) {
      // Sobrescrever o objeto é inofensivo: o que o agente decidiu vive no
      // banco, e a importação não recria item que já existe.
      await this.arquivos.gravar(
        `documentos/${arquivo}`,
        readFileSync(resolve(dir, arquivo)),
        "application/json",
      );
    }
    this.log.log(`${arquivos.length} documento(s) no armazenamento`);
  }

  /**
   * Põe o histórico no banco — uma vez só.
   *
   * O teste é "a tabela está vazia?", e não "existe o item hist-0001?": quem
   * apagou um item de propósito durante a preparação não quer o gerador
   * repondo aquele item na próxima subida. Para começar do zero, `make clean`.
   */
  private async historico(): Promise<void> {
    const r = await this.pg.query<{ n: string }>("SELECT count(*)::text AS n FROM itens");
    if (Number(r.rows[0]?.n ?? 0) > 0) return;

    const itens = gerarHistorico();
    for (const item of itens) {
      const valor = Number((item.documento.conteudo as Record<string, unknown>).valorTotal ?? 0);
      await this.pg.query(
        `INSERT INTO itens (id, estado, recebido_em, valor, motivo_revisao, documento, proposta, decisoes, atualizado_em)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          item.id,
          item.estado,
          item.documento.recebidoEm,
          valor,
          item.motivoRevisao,
          JSON.stringify(item.documento),
          item.proposta ? JSON.stringify(item.proposta) : null,
          JSON.stringify(item.decisoes),
          item.atualizadoEm,
        ],
      );
    }
    this.log.log(`${itens.length} item(ns) de histórico semeados`);
  }
}
