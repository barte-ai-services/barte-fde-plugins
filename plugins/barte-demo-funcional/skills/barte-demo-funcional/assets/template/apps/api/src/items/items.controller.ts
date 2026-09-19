import { Controller, Get, NotFoundException, Param, Post } from "@nestjs/common";
import { ItemsService } from "./items.service";

@Controller("items")
export class ItemsController {
  constructor(private readonly items: ItemsService) {}

  @Get()
  list() {
    return this.items.list();
  }

  @Get(":id")
  async detail(@Param("id") id: string) {
    const item = await this.items.find(id);
    if (!item) throw new NotFoundException(`item ${id} does not exist`);
    return item;
  }

  /** Re-reads storage — this is how a new document joins the pipeline mid-meeting. */
  @Post("import")
  async import() {
    return { added: await this.items.import() };
  }
}
