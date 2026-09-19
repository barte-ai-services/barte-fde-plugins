import { BadRequestException, Body, Controller, Get, HttpCode, Post, Put } from "@nestjs/common";
import { InvalidFlow, FlowService } from "./flow.service";
import { catalog } from "./catalog";

@Controller("flow")
export class FlowController {
  constructor(private readonly flow: FlowService) {}

  @Get()
  async current() {
    return this.flow.current();
  }

  /** What the panel's menus offer — straight from the catalog, not a copy in the frontend. */
  @Get("catalog")
  catalog() {
    return catalog();
  }

  @Get("file")
  async file() {
    return { text: await this.flow.asText() };
  }

  @Put()
  async save(@Body() body: unknown) {
    return this.run(() => this.flow.save(body));
  }

  /** The YAML editor sends raw text; the server is what parses it. */
  @Put("file")
  async saveFile(@Body() body: { text?: string }) {
    return this.run(() => this.flow.saveText(body?.text ?? ""));
  }

  @Post("restore")
  @HttpCode(200)
  async restore() {
    return this.run(() => this.flow.restore());
  }

  /**
   * Turns a validation refusal into a 400 the screen knows how to show.
   *
   * The body carries the LIST of problems, not a single sentence: whoever is
   * editing in front of the client needs to see everything that is wrong at once,
   * instead of fixing one, retrying, and discovering the next.
   */
  private async run<T>(f: () => Promise<T>): Promise<T> {
    try {
      return await f();
    } catch (error) {
      if (error instanceof InvalidFlow) {
        throw new BadRequestException({ problems: error.problems });
      }
      throw error;
    }
  }
}
