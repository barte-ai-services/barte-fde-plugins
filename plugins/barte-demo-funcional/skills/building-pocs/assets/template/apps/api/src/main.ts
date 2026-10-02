import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // The frontend calls this API straight from the browser, on another port. In
  // production both would sit behind the same domain and this would not exist;
  // here it does, restricted to the frontend's own origin.
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? "http://127.0.0.1:3000" });
  app.setGlobalPrefix("api");
  const port = Number(process.env.API_PORT ?? 8080);
  await app.listen(port, "0.0.0.0");
  console.log(`api on http://127.0.0.1:${port}/api`);
}
void bootstrap();
