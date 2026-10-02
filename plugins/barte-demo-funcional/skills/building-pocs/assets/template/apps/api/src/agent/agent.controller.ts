import { Controller, Post } from "@nestjs/common";
import { AgentService } from "./agent.service";

@Controller("pipeline")
export class AgentController {
  constructor(private readonly agent: AgentService) {}

  @Post("run")
  async run() {
    return { queued: await this.agent.run() };
  }
}
