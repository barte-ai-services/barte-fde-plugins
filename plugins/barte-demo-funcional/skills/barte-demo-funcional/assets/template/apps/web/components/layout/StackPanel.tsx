"use client";

import { useEffect, useState } from "react";
import { Drawer } from "barte-design-system";
import { API, health, type Call, type Event, type Stack } from "@/lib/api";

/**
 * The demo's stack: the block at the bottom of the sidebar and the panel it opens.
 *
 * It exists because of a question that always comes, and that is usually answered
 * with a claim: "is this actually running?". Here the answer is the screen — the
 * components with their health, and the calls to the database, storage and queue
 * showing up live in milliseconds while the pipeline moves.
 *
 * It sits at the BOTTOM, not the top, on purpose: the meeting's conversation is
 * the client's pain, and architecture is what you open when someone asks. Leaving
 * it open all the time steals attention from the screen that matters.
 */
export function StackPanel() {
  const [stack, setStack] = useState<Stack | null>(null);
  const [open, setOpen] = useState(false);
  const [calls, setCalls] = useState<Call[]>([]);

  useEffect(() => {
    let alive = true;
    const read = async () => {
      try {
        const r = await health();
        if (alive) setStack(r);
      } catch {
        if (alive) setStack(null);
      }
    };
    void read();
    const t = setInterval(read, 5000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  useEffect(() => {
    // The call stream is only subscribed while the panel is OPEN: there are dozens
    // of events per run, and keeping them with the panel closed just fills the
    // tab's memory with what nobody will look at.
    if (!open) return;
    const source = new EventSource(`${API}/events`);
    source.onmessage = (e) => {
      const event = JSON.parse(e.data) as Event;
      if (event.type === "telemetry") setCalls((current) => [event.call, ...current].slice(0, 60));
    };
    return () => source.close();
  }, [open]);

  const allOk = stack?.components.every((c) => c.ok) ?? false;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between gap-2 rounded-[6px] border border-[var(--stroke-primary)] px-3 py-2 text-left transition-colors hover:border-[var(--stroke-brand)] hover:bg-[var(--bg-secondary)]"
      >
        <span className="flex flex-col">
          <span className="text-[12px] font-medium text-[var(--content-primary)]">A stack desta demo</span>
          <span className="text-[11px] text-[var(--content-tertiary)]">
            {stack
              ? `${stack.components.filter((c) => c.ok).length}/${stack.components.length} de pé · agente ${stack.engine === "claude" ? "Claude" : "determinístico"}`
              : "verificando…"}
          </span>
        </span>
        <span
          className={`inline-block h-2 w-2 shrink-0 rounded-full ${allOk ? "bg-[var(--accent-green)]" : "bg-[var(--accent-red)]"}`}
        />
      </button>

      <Drawer isOpen={open} title="A stack desta demo" onClose={() => setOpen(false)}>
        <div className="flex flex-col gap-6 py-2">
          <section className="flex flex-col gap-2">
            <p className="text-[12px] text-[var(--content-secondary)]">
              Tudo abaixo roda na sua máquina, em contêiner, com as mesmas APIs do provedor de nuvem.
              O que muda numa instalação de verdade é o endereço de cada peça — não o código.
            </p>
            <ul className="list-none pl-0 flex flex-col gap-2">
              {(stack?.components ?? []).map((component) => (
                <li
                  key={component.name}
                  className="flex items-start gap-3 rounded-[6px] border border-[var(--stroke-primary)] px-3 py-2"
                >
                  <span
                    className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${component.ok ? "bg-[var(--accent-green)]" : "bg-[var(--accent-red)]"}`}
                  />
                  <span className="flex min-w-0 flex-col">
                    <span className="text-[13px] font-medium text-[var(--content-primary)]">
                      {component.name}{" "}
                      <span className="font-normal text-[var(--content-tertiary)]">· {component.technology}</span>
                    </span>
                    <span className="text-[12px] text-[var(--content-secondary)]">{component.role}</span>
                    {component.detail ? (
                      <span className="text-[11px] text-[var(--accent-red)]">{component.detail}</span>
                    ) : null}
                  </span>
                  <span className="ml-auto shrink-0 text-[11px] text-[var(--content-tertiary)]">
                    {component.ms} ms
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {stack?.telemetry.length ? (
            <section className="flex flex-col gap-2">
              <h3 className="text-[13px] font-semibold text-[var(--content-primary)]">Chamadas por peça</h3>
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-left text-[var(--content-tertiary)]">
                    <th className="font-normal">peça</th>
                    <th className="font-normal">chamadas</th>
                    <th className="font-normal">mediana</th>
                    <th className="font-normal">pior</th>
                  </tr>
                </thead>
                <tbody>
                  {stack.telemetry.map((t) => (
                    <tr key={t.component} className="border-t border-[var(--stroke-primary)]">
                      <td className="py-1 text-[var(--content-primary)]">{t.component}</td>
                      <td>{t.calls}</td>
                      <td>{t.medianMs} ms</td>
                      <td>{t.worstMs} ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}

          <section className="flex min-h-0 flex-col gap-2">
            <h3 className="text-[13px] font-semibold text-[var(--content-primary)]">Ao vivo</h3>
            {calls.length === 0 ? (
              <p className="text-[12px] text-[var(--content-tertiary)]">
                Execute a esteira com este painel aberto: cada ida ao banco, ao armazenamento e à
                fila aparece aqui, na hora, com a duração.
              </p>
            ) : (
              <ol className="list-none pl-0 flex flex-col gap-1 font-mono text-[11px]">
                {calls.map((c, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span
                      className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${c.ok ? "bg-[var(--accent-green)]" : "bg-[var(--accent-red)]"}`}
                    />
                    <span className="w-16 shrink-0 text-[var(--content-brand)]">{c.component}</span>
                    <span className="min-w-0 flex-1 truncate text-[var(--content-secondary)]">{c.operation}</span>
                    <span className="shrink-0 text-[var(--content-tertiary)]">{c.ms} ms</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </Drawer>
    </>
  );
}
