import { Injectable } from "@nestjs/common";
import { ReplaySubject, Observable } from "rxjs";

/**
 * O que a esteira mostra ao vivo.
 *
 * `no` é a etapa da esteira que acendeu; `decisao` é o agente prestando contas
 * (o que decidiu, por quê, com quanta confiança); `excecao` é o que ele NÃO
 * resolveu sozinho e devolveu para um humano.
 */
export type Evento =
  | { tipo: "no"; itemId: string; no: string; estado: "executando" | "concluido" | "excecao"; em: string }
  | { tipo: "decisao"; itemId: string; agente: string; acao: string; razao: string; confianca: number; em: string }
  | { tipo: "excecao"; itemId: string; motivo: string; em: string }
  | { tipo: "item"; itemId: string; em: string }
  | { tipo: "telemetria"; chamada: { peca: string; operacao: string; ms: number; ok: boolean }; em: string };

/**
 * O evento como quem publica escreve: sem o carimbo de hora, que o serviço põe.
 *
 * O `T extends unknown` não é enfeite — é o que faz o `Omit` percorrer CADA
 * membro da união. Sem ele o `Omit` roda sobre a união inteira e sobra só o que
 * todos os membros têm em comum (`tipo` e `itemId`), então publicar um evento
 * com `no` ou `motivo` deixa de compilar.
 */
type SemCarimbo<T> = T extends unknown ? Omit<T, "em"> & { em?: string } : never;

@Injectable()
export class EventosService {
  /**
   * `ReplaySubject` e não `Subject`: quem abre a tela no meio de uma execução
   * tem de ver a esteira que já acendeu, senão a demo parece travada para quem
   * chegou atrasado — que numa reunião é sempre alguém. 500 eventos cobrem uma
   * execução inteira com folga.
   */
  private readonly canal = new ReplaySubject<Evento>(500);

  publicar(evento: SemCarimbo<Evento>): void {
    this.canal.next({ ...evento, em: evento.em ?? new Date().toISOString() } as Evento);
  }

  fluxo(): Observable<Evento> {
    return this.canal.asObservable();
  }
}
