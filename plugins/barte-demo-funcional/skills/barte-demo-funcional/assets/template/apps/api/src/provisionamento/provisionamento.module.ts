import { Module } from "@nestjs/common";
import { ProvisionamentoService } from "./provisionamento.service";

@Module({ providers: [ProvisionamentoService], exports: [ProvisionamentoService] })
export class ProvisionamentoModule {}
