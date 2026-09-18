import { Global, Module } from "@nestjs/common";
import { TelemetriaService } from "./telemetria.service";
import { TelemetriaController } from "./telemetria.controller";

@Global()
@Module({
  providers: [TelemetriaService],
  controllers: [TelemetriaController],
  exports: [TelemetriaService],
})
export class TelemetriaModule {}
