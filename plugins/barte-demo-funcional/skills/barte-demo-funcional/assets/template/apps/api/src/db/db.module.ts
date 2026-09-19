import { Global, Module } from "@nestjs/common";
import { Pool } from "pg";

/**
 * The Postgres pool.
 *
 * The URL comes whole from the environment rather than assembled from five
 * variables: that is how the application would receive an Aurora endpoint, and
 * it is what lets you point the demo at a real database by changing ONE line of
 * `.env`.
 */
export const PG = "PG";

@Global()
@Module({
  providers: [
    {
      provide: PG,
      useFactory: () =>
        new Pool({
          connectionString: process.env.DATABASE_URL ?? "postgres://demo:demo@127.0.0.1:5432/demo",
          // A demo carries no load: a large pool only ties up database
          // connections and hides connection leaks behind slack.
          max: 8,
        }),
    },
  ],
  exports: [PG],
})
export class DbModule {}
