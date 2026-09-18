import { Controller, Post } from "@nestjs/common";
import { AgenteService } from "./agente.service";

@Controller("esteira")
export class AgenteController {
  constructor(private readonly agente: AgenteService) {}

  @Post("executar")
  async executar() {
    return { enfileirados: await this.agente.executar() };
  }
}
