import { Module } from "@nestjs/common";
import { AgentService } from "./agent.service";
import { AgentController } from "./agent.controller";
import { ItemsModule } from "../items/items.module";
import { ProvisioningModule } from "../provisioning/provisioning.module";

@Module({
  imports: [ItemsModule, ProvisioningModule],
  providers: [AgentService],
  controllers: [AgentController],
})
export class AgentModule {}
