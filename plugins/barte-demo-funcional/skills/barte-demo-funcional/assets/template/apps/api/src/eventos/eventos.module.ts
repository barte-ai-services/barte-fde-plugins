import { Global, Module } from "@nestjs/common";
import { EventosService } from "./eventos.service";
import { EventosController } from "./eventos.controller";

@Global()
@Module({
  providers: [EventosService],
  controllers: [EventosController],
  exports: [EventosService],
})
export class EventosModule {}
