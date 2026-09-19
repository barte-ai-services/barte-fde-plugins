import { Controller, Get } from "@nestjs/common";
import { TelemetryService } from "./telemetry.service";

@Controller("telemetry")
export class TelemetryController {
  constructor(private readonly telemetry: TelemetryService) {}

  @Get()
  read() {
    return { summary: this.telemetry.summary(), latest: this.telemetry.latest() };
  }
}
