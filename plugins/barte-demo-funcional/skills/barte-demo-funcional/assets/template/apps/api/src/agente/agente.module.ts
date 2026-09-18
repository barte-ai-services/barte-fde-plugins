import { Module } from "@nestjs/common";
import { AgenteService } from "./agente.service";
import { AgenteController } from "./agente.controller";
import { ItensModule } from "../itens/itens.module";
import { ProvisionamentoModule } from "../provisionamento/provisionamento.module";

@Module({
  imports: [ItensModule, ProvisionamentoModule],
  providers: [AgenteService],
  controllers: [AgenteController],
})
export class AgenteModule {}
