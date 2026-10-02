import { Global, Module } from "@nestjs/common";
import { FlowService } from "./flow.service";
import { FlowController } from "./flow.controller";

@Global()
@Module({
  providers: [FlowService],
  controllers: [FlowController],
  exports: [FlowService],
})
export class FlowModule {}
