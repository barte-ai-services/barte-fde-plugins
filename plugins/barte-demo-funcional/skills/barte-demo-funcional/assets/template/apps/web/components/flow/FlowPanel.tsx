"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Drawer } from "barte-design-system";
import {
  FlowError,
  readCatalog,
  readFlowFile,
  restoreFlow,
  saveFlow,
  saveFlowFile,
  type Catalog,
  type Flow,
  type Step,
  type Vocabulary,
} from "@/lib/api";

/**
 * Where the flow is built during the meeting.
 *
 * Three tabs for three jobs: **Etapas** is a form — menus and checkboxes, no
 * syntax to get wrong — and it is how someone in sales adds a step while the
 * client describes their process. **Vocabulário** renames what the screen calls
 * things, which is what turns this demo from accounts payable into accounts
 * receivable. **Arquivo** is the raw YAML, for whoever prefers editing directly.
 *
 * All three go through the SAME validation on the server. What does not pass is
 * not applied, and the running flow keeps running — the worst possible outcome
 * here would be the demo breaking because of a slip mid-presentation.
 *
 * Interface strings are Portuguese: this panel is opened in front of the client.
 */
export function FlowPanel({
  open,
  flow,
  onClose,
  onApplied,
}: {
  open: boolean;
  flow: Flow | null;
  onClose: () => void;
  onApplied: (updated: Flow) => void;
}) {
  const [tab, setTab] = useState<"steps" | "vocabulary" | "file">("steps");
  const [draft, setDraft] = useState<Flow | null>(flow);
  const [text, setText] = useState("");
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    void readCatalog().then(setCatalog).catch(() => undefined);
  }, []);

  // The live flow comes in through a REF, not through the effect's dependency
  // list. Depending on it made the effect run the instant "Aplicar" worked —
  // because applying changes the flow upstream — and the green confirmation
  // vanished before anyone could read it, with the apply having succeeded.
  const liveFlow = useRef(flow);
  liveFlow.current = flow;

  // The draft reloads on every OPEN: leaving without applying has to DISCARD what
  // was scribbled, not keep a ghost edit for the next time the panel opens.
  useEffect(() => {
    if (!open) return;
    setDraft(liveFlow.current);
    setProblems([]);
    setApplied(false);
    void readFlowFile().then(setText).catch(() => undefined);
  }, [open]);

  if (!draft) return null;

  const changeStep = (i: number, change: Partial<Step>) =>
    setDraft({ ...draft, steps: draft.steps.map((s, j) => (i === j ? { ...s, ...change } : s)) });

  const move = (i: number, direction: -1 | 1) => {
    const target = i + direction;
    if (target < 0 || target >= draft.steps.length) return;
    const steps = [...draft.steps];
    [steps[i], steps[target]] = [steps[target], steps[i]];
    setDraft({ ...draft, steps });
  };

  const remove = (i: number) => setDraft({ ...draft, steps: draft.steps.filter((_, j) => j !== i) });

  const add = () => {
    // The id is derived from the step number rather than asked for: nobody in a
    // meeting wants to invent a unique identifier. If it is taken, walk until one
    // is free.
    let n = draft.steps.length + 1;
    while (draft.steps.some((s) => s.id === `etapa-${n}`)) n += 1;
    setDraft({
      ...draft,
      steps: [
        ...draft.steps,
        {
          id: `etapa-${n}`,
          label: "Nova etapa",
          hint: "",
          action: catalog?.actions[0]?.id ?? "check",
          escalate_if: [],
        },
      ],
    });
  };

  const changeVocabulary = (change: Partial<Vocabulary>) =>
    setDraft({ ...draft, vocabulary: { ...draft.vocabulary, ...change } });

  const apply = async (f: () => Promise<Flow>) => {
    setSaving(true);
    setProblems([]);
    try {
      const updated = await f();
      setDraft(updated);
      setText(await readFlowFile());
      onApplied(updated);
      setApplied(true);
    } catch (error) {
      setProblems(error instanceof FlowError ? error.problems : [(error as Error).message]);
    } finally {
      setSaving(false);
    }
  };

  const input =
    "rounded-[4px] border border-[var(--stroke-primary)] px-2 py-1 text-[13px]";

  return (
    <Drawer isOpen={open} title="Esta demo" onClose={onClose}>
      <div className="flex flex-col gap-4 py-2">
        <p className="text-[12px] text-[var(--content-secondary)]">
          A esteira executa exatamente o que estiver aqui. O que você aplicar vale a partir do
          próximo documento processado — sem reiniciar nada.
        </p>

        <div className="flex gap-1 border-b border-[var(--stroke-primary)]">
          {(
            [
              ["steps", "Etapas"],
              ["vocabulary", "Vocabulário"],
              ["file", "Arquivo (YAML)"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`-mb-px border-b-2 px-3 py-2 text-[13px] ${
                tab === key
                  ? "border-[var(--stroke-brand)] text-[var(--content-brand)]"
                  : "border-transparent text-[var(--content-tertiary)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {problems.length > 0 ? (
          <div className="flex flex-col gap-1 rounded-[6px] border border-[var(--accent-red)] bg-[var(--accent-red-light)] px-3 py-2">
            <span className="text-[12px] font-semibold text-[var(--accent-red-dark)]">
              Não apliquei — o fluxo que está rodando continua o mesmo.
            </span>
            {problems.map((p, i) => (
              <span key={i} className="text-[12px] text-[var(--content-secondary)]">
                · {p}
              </span>
            ))}
          </div>
        ) : null}

        {applied ? (
          <div className="rounded-[6px] border border-[var(--accent-green)] bg-[var(--accent-green-light)] px-3 py-2 text-[12px] text-[var(--accent-green-dark)]">
            Aplicado. Execute a esteira para ver rodando.
          </div>
        ) : null}

        {tab === "steps" ? (
          <div className="flex flex-col gap-3">
            {draft.steps.map((step, i) => (
              <div key={step.id} className="flex flex-col gap-2 rounded-[6px] border border-[var(--stroke-primary)] p-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--bg-brand-light)] text-[11px] font-semibold text-[var(--content-brand)]">
                    {i + 1}
                  </span>
                  <input
                    value={step.label}
                    onChange={(e) => changeStep(i, { label: e.target.value })}
                    className={`min-w-0 flex-1 ${input}`}
                    placeholder="Nome da etapa"
                  />
                  <button type="button" onClick={() => move(i, -1)} className="px-1 text-[13px] text-[var(--content-tertiary)]" aria-label="subir">
                    ↑
                  </button>
                  <button type="button" onClick={() => move(i, 1)} className="px-1 text-[13px] text-[var(--content-tertiary)]" aria-label="descer">
                    ↓
                  </button>
                  <button type="button" onClick={() => remove(i)} className="px-1 text-[13px] text-[var(--accent-red)]" aria-label="remover">
                    ×
                  </button>
                </div>

                <input
                  value={step.hint}
                  onChange={(e) => changeStep(i, { hint: e.target.value })}
                  className={`text-[12px] ${input}`}
                  placeholder="A linha pequena que aparece na esteira"
                />

                <label className="flex flex-col gap-1">
                  <span className="text-[11px] uppercase tracking-wide text-[var(--content-tertiary)]">
                    O que o agente faz aqui
                  </span>
                  <select
                    value={step.action}
                    onChange={(e) => changeStep(i, { action: e.target.value })}
                    className={input}
                  >
                    {(catalog?.actions ?? []).map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                </label>

                <fieldset className="flex flex-col gap-1">
                  <legend className="text-[11px] uppercase tracking-wide text-[var(--content-tertiary)]">
                    Parar e chamar um humano se…
                  </legend>
                  {(catalog?.conditions ?? []).map((c) => (
                    <label key={c.id} className="flex items-start gap-2 text-[12px]">
                      <input
                        type="checkbox"
                        checked={step.escalate_if.includes(c.id)}
                        onChange={(e) =>
                          changeStep(i, {
                            escalate_if: e.target.checked
                              ? [...step.escalate_if, c.id]
                              : step.escalate_if.filter((x) => x !== c.id),
                          })
                        }
                        className="mt-0.5"
                      />
                      <span>
                        <span className="text-[var(--content-primary)]">{c.label}</span>{" "}
                        <span className="text-[var(--content-tertiary)]">— {c.description}</span>
                      </span>
                    </label>
                  ))}
                </fieldset>
              </div>
            ))}

            <button
              type="button"
              onClick={add}
              className="rounded-[6px] border border-dashed border-[var(--stroke-secondary)] py-2 text-[13px] text-[var(--content-secondary)] hover:border-[var(--stroke-brand)] hover:text-[var(--content-brand)]"
            >
              + acrescentar etapa
            </button>
          </div>
        ) : null}

        {tab === "vocabulary" ? (
          <div className="flex flex-col gap-3">
            <p className="text-[12px] text-[var(--content-secondary)]">
              As palavras da tela. É por aqui que esta demo deixa de ser contas a pagar e passa a
              ser contas a receber, conciliação ou o que o cliente chamar.
            </p>
            <Field label="Cliente" value={draft.vocabulary.client} onChange={(v) => changeVocabulary({ client: v })} />
            <Field label="Módulo" value={draft.vocabulary.module} onChange={(v) => changeVocabulary({ module: v })} hint="aparece no menu, no breadcrumb e no título da tela" />
            <Field
              label="Como se chama quem está do outro lado"
              value={draft.vocabulary.counterparty}
              onChange={(v) => changeVocabulary({ counterparty: v })}
              hint="fornecedor, cliente, sacado, prestador"
            />
            <Field
              label="O que chega na esteira"
              value={draft.vocabulary.incoming}
              onChange={(v) => changeVocabulary({ incoming: v })}
              hint="documento, nota, título, boleto, extrato"
            />

            <span className="mt-2 text-[11px] uppercase tracking-wide text-[var(--content-tertiary)]">
              Campos da proposta
            </span>
            <Field label="Centro de custo" value={draft.vocabulary.labels.cost_center} onChange={(v) => changeVocabulary({ labels: { ...draft.vocabulary.labels, cost_center: v } })} />
            <Field label="Conta contábil" value={draft.vocabulary.labels.account} onChange={(v) => changeVocabulary({ labels: { ...draft.vocabulary.labels, account: v } })} />
            <Field label="Valor" value={draft.vocabulary.labels.amount} onChange={(v) => changeVocabulary({ labels: { ...draft.vocabulary.labels, amount: v } })} />
            <Field label="Vencimento" value={draft.vocabulary.labels.due_date} onChange={(v) => changeVocabulary({ labels: { ...draft.vocabulary.labels, due_date: v } })} />

            <span className="mt-2 text-[11px] uppercase tracking-wide text-[var(--content-tertiary)]">
              Os quatro números do topo
            </span>
            <Field label="Na fila" value={draft.vocabulary.stats.queued} onChange={(v) => changeVocabulary({ stats: { ...draft.vocabulary.stats, queued: v } })} />
            <Field label="Concluídos pelo agente" value={draft.vocabulary.stats.ready} onChange={(v) => changeVocabulary({ stats: { ...draft.vocabulary.stats, ready: v } })} />
            <Field label="Em revisão" value={draft.vocabulary.stats.review} onChange={(v) => changeVocabulary({ stats: { ...draft.vocabulary.stats, review: v } })} />
            <Field label="Valor total" value={draft.vocabulary.stats.amount} onChange={(v) => changeVocabulary({ stats: { ...draft.vocabulary.stats, amount: v } })} />
          </div>
        ) : null}

        {tab === "file" ? (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            className="h-[420px] w-full rounded-[6px] border border-[var(--stroke-primary)] p-3 font-mono text-[12px] leading-relaxed"
          />
        ) : null}

        <div className="flex flex-wrap items-center gap-2 border-t border-[var(--stroke-primary)] pt-3">
          <Button
            loading={saving}
            onClick={() => apply(() => (tab === "file" ? saveFlowFile(text) : saveFlow(draft)))}
          >
            Aplicar
          </Button>
          <Button variant="ghost" disabled={saving} onClick={() => apply(restoreFlow)}>
            Voltar ao original
          </Button>
          <span className="text-[11px] text-[var(--content-tertiary)]">
            “Voltar ao original” relê o arquivo data/flow.yaml.
          </span>
        </div>
      </div>
    </Drawer>
  );
}

function Field({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-wide text-[var(--content-tertiary)]">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-[4px] border border-[var(--stroke-primary)] px-2 py-1 text-[13px]"
      />
      {hint ? <span className="text-[11px] text-[var(--content-tertiary)]">{hint}</span> : null}
    </label>
  );
}
