import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // O front chama esta API direto do browser, de outra porta. Em produção os
  // dois estariam atrás do mesmo domínio e isto não existiria — aqui existe, e
  // fica restrito à origem do próprio front.
  app.enableCors({ origin: process.env.WEB_ORIGEM ?? "http://127.0.0.1:3000" });
  app.setGlobalPrefix("api");
  const porta = Number(process.env.API_PORTA ?? 8080);
  await app.listen(porta, "0.0.0.0");
  console.log(`api em http://127.0.0.1:${porta}/api`);
}
void bootstrap();
