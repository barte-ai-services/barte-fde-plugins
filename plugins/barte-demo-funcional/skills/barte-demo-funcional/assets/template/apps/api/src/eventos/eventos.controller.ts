import { Controller, Sse, MessageEvent } from "@nestjs/common";
import { map, Observable } from "rxjs";
import { EventosService } from "./eventos.service";

@Controller("eventos")
export class EventosController {
  constructor(private readonly eventos: EventosService) {}

  /**
   * SSE, e não WebSocket: o fluxo é de mão única (servidor → tela) e SSE
   * reconecta sozinho quando o notebook dorme no meio da reunião. Um WebSocket
   * traria um protocolo a mais para resolver um problema que não existe aqui.
   */
  @Sse()
  fluxo(): Observable<MessageEvent> {
    return this.eventos.fluxo().pipe(map((evento) => ({ data: evento })));
  }
}
