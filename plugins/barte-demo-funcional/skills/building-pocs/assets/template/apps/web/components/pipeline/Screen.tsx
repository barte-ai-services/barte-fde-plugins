"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Drawer, Pills, Table } from "barte-design-system";
import {
  API,
  listItems,
  readFlow,
  runPipeline,
  type Event,
  type Flow,
  type Item,
} from "@/lib/api";
import { brl, day, time, pct } from "@/lib/format";
import { useVocabulary } from "@/lib/vocabulary";
import { useWidth } from "@/lib/use-width";
import { FlowPanel } from "@/components/flow/FlowPanel";
import { DecisionLog, Pipeline } from "./Pipeline";
import { Stats } from "./Stats";

/**
 * `Pills`, not `Badge`: the DS Badge is a coloured DOT — it ignores the text, and
 * the status column comes out with a dot and nothing written. Pills is what
 * carries a label.
 */
const STATE: Record<Item["state"], { text: string; state: "default" | "accent" | "success" | "error" }> = {
  pending: { text: "Na fila", state: "default" },
  processing: { text: "Processando", state: "accent" },
  ready: { text: "Pronto para aprovação", state: "success" },
  review: { text: "Revisão humana", state: "error" },
};

export function Screen() {
  const [items, setItems] = useState<Item[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [flow, setFlow] = useState<Flow | null>(null);
  const [flowPanel, setFlowPanel] = useState(false);
  const [running, setRunning] = useState(false);
  const vocabulary = useVocabulary();
  const width = useWidth();
  // Below 1100px five columns get too narrow to read. The due date goes — it is in
  // the drawer, one click away — and not the STATUS, which is what the demo exists
  // to show. Hiding a column beats scrolling sideways: nobody drags a table in
  // front of a client.
  const narrow = width < 1100;

  useEffect(() => {
    void listItems().then(setItems).catch(() => undefined);
    void readFlow().then(setFlow).catch(() => undefined);

    /**
     * One SSE connection for the whole screen.
     *
     * The `item` event says "this item changed in the database" and triggers a
     * re-read — the list is never rebuilt from what went through the stream, only
     * from what is stored. That is what stops the screen from drifting away from
     * the database if an event is lost mid-meeting.
     */
    const source = new EventSource(`${API}/events`);
    source.onmessage = (e) => {
      const event = JSON.parse(e.data) as Event;
      setEvents((current) => [...current.slice(-400), event]);
      if (event.type === "item") void listItems().then(setItems).catch(() => undefined);
      // The flow changed (in another tab, or in the panel): the pipeline redraws
      // itself without a page reload.
      if (event.type === "flow") void readFlow().then(setFlow).catch(() => undefined);
    };
    return () => source.close();
  }, []);

  const open = useMemo(() => items.find((i) => i.id === openId) ?? null, [items, openId]);

  const run = async () => {
    setRunning(true);
    try {
      await runPipeline();
    } finally {
      setRunning(false);
    }
  };

  const inFlight = items.some((i) => i.state === "processing");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {/* The pink bar next to the title is the brand showing up on the working
              screen, not only in the corner logo — it is what Barte's consoles do,
              and it is cheap. */}
          <h1 className="flex items-center gap-2 text-[22px] font-semibold text-[var(--content-primary)]">
            <span className="inline-block h-6 w-1 rounded-full bg-[var(--bg-brand)]" />
            {vocabulary.module}
          </h1>
          <p className="mt-1 text-[13px] text-[var(--content-tertiary)]">
            {items.length} {vocabulary.incoming.toLowerCase()}(s) na esteira · o agente lê, confere e
            propõe — <span className="text-[var(--content-brand)]">quem aprova é você</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => setFlowPanel(true)}>
            Editar fluxo
          </Button>
          <Button onClick={run} loading={running || inFlight} disabled={running || inFlight}>
            Executar esteira
          </Button>
        </div>
      </div>

      <Stats items={items} />
      <Pipeline steps={flow?.steps ?? []} items={items} events={events} />

      <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-[1fr_320px]">
        {/* No horizontal scrolling, on purpose. A table that scrolls sideways hides
            exactly the STATUS column — what the demo exists to show — and forces
            whoever is presenting to drag the table in front of the client. Columns
            shrink and text truncates; the full detail is one click away. */}
        <div className="min-w-0 rounded-[8px] border border-[var(--stroke-primary)] bg-[var(--bg-primary)]">
          <Table
            data={items}
            rowKey={(i) => i.id}
            onRowClick={(i) => setOpenId(i.id)}
            emptyText={`Nenhum ${vocabulary.incoming.toLowerCase()} na esteira`}
            columns={[
              {
                key: "subject",
                title: vocabulary.incoming,
                dataIndex: "document",
                render: (_v, item) => (
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-[13px] text-[var(--content-primary)]">
                      {item.document.subject}
                    </span>
                    <span className="truncate text-[12px] text-[var(--content-tertiary)]">
                      {item.document.sender}
                    </span>
                  </div>
                ),
              },
              {
                key: "counterparty",
                title: vocabulary.counterparty,
                width: "20%",
                dataIndex: "proposal",
                render: (_v, item) =>
                  item.proposal?.counterparty ?? <span className="text-[var(--content-tertiary)]">—</span>,
              },
              {
                key: "amount",
                title: vocabulary.labels.amount,
                width: "12%",
                dataIndex: "document",
                align: "right",
                render: (_v, item) => brl(Number((item.document.content as any).valorTotal ?? 0)),
              },
              ...(narrow
                ? []
                : [
                    {
                      key: "dueDate",
                      title: vocabulary.labels.due_date,
                      width: "11%",
                      dataIndex: "document" as const,
                      render: (_v: unknown, item: Item) =>
                        day((item.document.content as any).vencimento ?? null),
                    },
                  ]),
              {
                key: "state",
                title: "Situação",
                width: "22%",
                dataIndex: "state",
                render: (_v, item) => (
                  <div className="flex flex-col gap-1">
                    <Pills size="sm" variant="light" state={STATE[item.state].state} label={STATE[item.state].text} />
                    {item.review_reason ? (
                      <span className="text-[12px] text-[var(--content-tertiary)]">{item.review_reason}</span>
                    ) : null}
                  </div>
                ),
              },
            ]}
          />
        </div>
        <DecisionLog events={events} />
      </div>

      <FlowPanel
        open={flowPanel}
        flow={flow}
        onClose={() => setFlowPanel(false)}
        onApplied={setFlow}
      />

      <Drawer isOpen={open !== null} title={open?.document.subject ?? ""} onClose={() => setOpenId(null)}>
        {open ? <Detail item={open} /> : null}
      </Drawer>
    </div>
  );
}

function Detail({ item }: { item: Item }) {
  const vocabulary = useVocabulary();
  const c = item.document.content as Record<string, any>;
  return (
    <div className="flex flex-col gap-6 py-2">
      <section className="flex flex-col gap-2">
        <h3 className="text-[13px] font-semibold text-[var(--content-primary)]">Proposta do agente</h3>
        {item.proposal ? (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
            <Row label={vocabulary.counterparty} value={item.proposal.counterparty} />
            <Row label={vocabulary.labels.cost_center} value={item.proposal.cost_center} />
            <Row label={vocabulary.labels.account} value={item.proposal.account} />
            <Row label={vocabulary.labels.amount} value={brl(item.proposal.amount)} />
            <Row label={vocabulary.labels.due_date} value={day(item.proposal.due_date)} />
          </dl>
        ) : (
          <p className="text-[13px] text-[var(--content-secondary)]">
            {item.review_reason ?? "Ainda não processado."}
          </p>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-[13px] font-semibold text-[var(--content-primary)]">Trilha de decisões</h3>
        {item.decisions.length === 0 ? (
          <p className="text-[13px] text-[var(--content-tertiary)]">Nada registrado ainda.</p>
        ) : (
          <ol className="list-none pl-0 flex flex-col gap-3">
            {item.decisions.map((d, i) => (
              <li key={i} className="border-l-2 border-[var(--stroke-brand)] pl-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[13px] text-[var(--content-primary)]">{d.action}</span>
                  <span className="shrink-0 text-[11px] text-[var(--content-tertiary)]">
                    {time(d.at)} · confiança {pct(d.confidence)}
                  </span>
                </div>
                <p className="text-[12px] text-[var(--content-secondary)]">{d.reason}</p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-[13px] font-semibold text-[var(--content-primary)]">
          {vocabulary.incoming}
        </h3>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
          <Row label="Recebido em" value={new Date(item.document.received_at).toLocaleString("pt-BR")} />
          <Row label="De" value={item.document.sender} />
          <Row label="Chave / linha" value={(c.chave ?? c.linhaDigitavel ?? "—") as string} />
          <Row label="Descrição" value={(c.descricao ?? "—") as string} />
        </dl>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col">
      <dt className="text-[11px] uppercase tracking-wide text-[var(--content-tertiary)]">{label}</dt>
      <dd className="text-[var(--content-primary)]">{value ?? "—"}</dd>
    </div>
  );
}
