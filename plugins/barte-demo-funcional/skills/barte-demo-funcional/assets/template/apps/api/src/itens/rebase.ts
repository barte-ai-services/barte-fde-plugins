import type { Documento } from "./tipos";

/**
 * Traz o lote curado para HOJE, preservando as distâncias entre as datas.
 *
 * Os documentos de `dados/` têm datas fixas no arquivo, e uma demo guardada em
 * setembro abre em janeiro dizendo que a nota chegou há quatro meses e venceu há
 * três — o que derruba a primeira impressão antes de qualquer conversa. Aqui o
 * documento mais recente do lote passa a ser de hoje e todos os outros andam o
 * MESMO número de dias: a nota que vencia 30 dias depois da emissão continua
 * vencendo 30 dias depois.
 *
 * Roda uma vez, na importação. Depois disso a data está gravada no item e não
 * muda mais — senão a esteira se moveria embaixo de quem está olhando.
 */
export function rebasear(documento: Documento, maisRecente: string, hoje = new Date()): Documento {
  const dias = Math.round(
    (hoje.getTime() - new Date(maisRecente).getTime()) / 86400000,
  );
  if (dias === 0) return documento;

  const somar = (iso: string): string => {
    const d = new Date(iso);
    d.setDate(d.getDate() + dias);
    // Data pura (`2026-09-12`) volta pura; carimbo completo volta completo.
    return iso.length === 10 ? d.toISOString().slice(0, 10) : d.toISOString();
  };

  const conteudo = { ...documento.conteudo };
  for (const campo of ["emissao", "vencimento"]) {
    const valor = conteudo[campo];
    if (typeof valor === "string" && valor) conteudo[campo] = somar(valor);
  }

  return { ...documento, recebidoEm: somar(documento.recebidoEm), conteudo };
}
