import { Controller, Sse, MessageEvent } from "@nestjs/common";
import { map, Observable } from "rxjs";
import { EventsService } from "./events.service";

@Controller("events")
export class EventsController {
  constructor(private readonly events: EventsService) {}

  /**
   * SSE, not WebSocket: the stream is one-way (server to screen) and SSE
   * reconnects on its own when the laptop sleeps mid-meeting. A WebSocket would
   * bring one more protocol to solve a problem that does not exist here.
   */
  @Sse()
  stream(): Observable<MessageEvent> {
    return this.events.stream().pipe(map((event) => ({ data: event })));
  }
}
