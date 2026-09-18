import { Global, Module } from "@nestjs/common";
import { Pool } from "pg";

/**
 * O pool do Postgres.
 *
 * A URL vem inteira do ambiente, e não montada a partir de cinco variáveis: é
 * assim que a aplicação receberia o endereço de uma Aurora, e é o que permite
 * apontar a demo para um banco de verdade trocando UMA linha do `.env`.
 */
export const PG = "PG";

@Global()
@Module({
  providers: [
    {
      provide: PG,
      useFactory: () =>
        new Pool({
          connectionString:
            process.env.DATABASE_URL ?? "postgres://demo:demo@127.0.0.1:5432/demo",
          // Uma demo não tem carga: um pool grande só ocupa conexão do banco e
          // esconde vazamento de conexão atrás de folga.
          max: 8,
        }),
    },
  ],
  exports: [PG],
})
export class DbModule {}
