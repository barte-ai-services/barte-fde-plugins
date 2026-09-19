import { Global, Module } from "@nestjs/common";
import { TelemetryService } from "./telemetry.service";
import { TelemetryController } from "./telemetry.controller";

@Global()
@Module({
  providers: [TelemetryService],
  controllers: [TelemetryController],
  exports: [TelemetryService],
})
export class TelemetryModule {}
