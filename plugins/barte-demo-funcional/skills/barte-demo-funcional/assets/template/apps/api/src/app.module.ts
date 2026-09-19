import { Module } from "@nestjs/common";
import { NuvemModule } from "./nuvem/nuvem.module";
import { DbModule } from "./db/db.module";
import { TelemetriaModule } from "./telemetria/telemetria.module";
import { EventosModule } from "./eventos/eventos.module";
import { ItensModule } from "./itens/itens.module";
import { AgenteModule } from "./agente/agente.module";
import { SaudeModule } from "./saude/saude.module";
import { ProvisionamentoModule } from "./provisionamento/provisionamento.module";
import { FluxoModule } from "./fluxo/fluxo.module";

@Module({
  imports: [
    NuvemModule,
    DbModule,
    EventosModule,
    TelemetriaModule,
    FluxoModule,
    ProvisionamentoModule,
    ItensModule,
    AgenteModule,
    SaudeModule,
  ],
})
export class AppModule {}
