import { Controller, Get } from "@nestjs/common";
import { TelemetriaService } from "./telemetria.service";

@Controller("telemetria")
export class TelemetriaController {
  constructor(private readonly telemetria: TelemetriaService) {}

  @Get()
  ver() {
    return { resumo: this.telemetria.resumo(), recentes: this.telemetria.recentes() };
  }
}
