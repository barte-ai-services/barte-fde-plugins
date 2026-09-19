import { Global, Module } from "@nestjs/common";
import { FluxoService } from "./fluxo.service";
import { FluxoController } from "./fluxo.controller";

@Global()
@Module({
  providers: [FluxoService],
  controllers: [FluxoController],
  exports: [FluxoService],
})
export class FluxoModule {}
