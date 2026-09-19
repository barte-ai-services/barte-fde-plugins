import { Body, Controller, Get, HttpCode, Post, Put, BadRequestException } from "@nestjs/common";
import { FluxoInvalido, FluxoService } from "./fluxo.service";
import { catalogo } from "./catalogo";

@Controller("fluxo")
export class FluxoController {
  constructor(private readonly fluxo: FluxoService) {}

  @Get()
  async atual() {
    return this.fluxo.atual();
  }

  /** O que os menus do painel oferecem — sai do catálogo, não de uma cópia no front. */
  @Get("catalogo")
  catalogo() {
    return catalogo();
  }

  @Get("arquivo")
  async arquivo() {
    return { texto: await this.fluxo.comoTexto() };
  }

  @Put()
  async salvar(@Body() corpo: unknown) {
    return this.executar(() => this.fluxo.salvar(corpo));
  }

  /** O editor de YAML manda o texto cru; quem interpreta é o servidor. */
  @Put("arquivo")
  async salvarArquivo(@Body() corpo: { texto?: string }) {
    return this.executar(() => this.fluxo.salvarTexto(corpo?.texto ?? ""));
  }

  @Post("restaurar")
  @HttpCode(200)
  async restaurar() {
    return this.executar(() => this.fluxo.restaurar());
  }

  /**
   * Converte a recusa da validação num 400 que a tela sabe mostrar.
   *
   * O corpo carrega a LISTA de problemas, e não uma frase só: quem está editando
   * na frente do cliente precisa ver tudo o que está errado de uma vez, em vez de
   * corrigir um, tentar de novo, e descobrir o seguinte.
   */
  private async executar<T>(f: () => Promise<T>): Promise<T> {
    try {
      return await f();
    } catch (erro) {
      if (erro instanceof FluxoInvalido) {
        throw new BadRequestException({ problemas: erro.problemas });
      }
      throw erro;
    }
  }
}
