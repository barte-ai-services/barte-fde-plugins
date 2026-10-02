import { Module } from "@nestjs/common";
import { CloudModule } from "./cloud/cloud.module";
import { DbModule } from "./db/db.module";
import { EventsModule } from "./events/events.module";
import { TelemetryModule } from "./telemetry/telemetry.module";
import { FlowModule } from "./flow/flow.module";
import { ProvisioningModule } from "./provisioning/provisioning.module";
import { ItemsModule } from "./items/items.module";
import { AgentModule } from "./agent/agent.module";
import { HealthModule } from "./health/health.module";

@Module({
  imports: [
    CloudModule,
    DbModule,
    EventsModule,
    TelemetryModule,
    FlowModule,
    ProvisioningModule,
    ItemsModule,
    AgentModule,
    HealthModule,
  ],
})
export class AppModule {}
