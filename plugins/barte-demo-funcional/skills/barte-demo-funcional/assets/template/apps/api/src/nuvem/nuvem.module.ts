import { Global, Module } from "@nestjs/common";
import type { Armazenamento, Fila } from "./portas";
import { nuvemAtual } from "./portas";

/**
 * Escolhe o adaptador de nuvem a partir de UMA variável de ambiente.
 *
 * O resto da aplicação injeta `ARMAZENAMENTO` e `FILA` e não sabe qual nuvem
 * está por baixo. É isso que permite a mesma demo rodar com Floci (AWS), com os
 * emuladores do Google ou com o Azurite — e, trocando o endereço, contra a conta
 * de verdade do cliente.
 *
 * O `require` do adaptador acontece DEPOIS de escolher: só o módulo da nuvem
 * ativa é carregado, então uma demo AWS não precisa ter os pacotes do Google e
 * da Microsoft instalados.
 */
export const ARMAZENAMENTO = "ARMAZENAMENTO";
export const FILA_TRABALHO = "FILA_TRABALHO";

export const BUCKET = process.env.BUCKET ?? "demo-documentos";
export const FILA = process.env.FILA ?? "demo-trabalho";

function armazenamento(): Armazenamento {
  switch (nuvemAtual()) {
    case "gcp":
      return new (require("./gcp").ArmazenamentoGcp)(BUCKET);
    case "azure":
      return new (require("./azure").ArmazenamentoAzure)(BUCKET);
    default:
      return new (require("./aws").ArmazenamentoAws)(BUCKET);
  }
}

function fila(): Fila {
  switch (nuvemAtual()) {
    case "gcp":
      return new (require("./gcp").FilaGcp)(FILA);
    case "azure":
      return new (require("./azure").FilaAzure)(FILA);
    default:
      return new (require("./aws").FilaAws)(FILA);
  }
}

@Global()
@Module({
  providers: [
    { provide: ARMAZENAMENTO, useFactory: armazenamento },
    { provide: FILA_TRABALHO, useFactory: fila },
  ],
  exports: [ARMAZENAMENTO, FILA_TRABALHO],
})
export class NuvemModule {}
