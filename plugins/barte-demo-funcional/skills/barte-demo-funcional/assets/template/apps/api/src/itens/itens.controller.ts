import { Controller, Get, NotFoundException, Param, Post } from "@nestjs/common";
import { ItensService } from "./itens.service";

@Controller("itens")
export class ItensController {
  constructor(private readonly itens: ItensService) {}

  @Get()
  listar() {
    return this.itens.listar();
  }

  @Get(":id")
  async detalhe(@Param("id") id: string) {
    const item = await this.itens.buscar(id);
    if (!item) throw new NotFoundException(`item ${id} não existe`);
    return item;
  }

  /** Relê o S3 — é como um documento novo entra na esteira durante a reunião. */
  @Post("importar")
  async importar() {
    return { novos: await this.itens.importar() };
  }
}
