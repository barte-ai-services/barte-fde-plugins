"use client";

import { useEffect, useState } from "react";

/**
 * O relógio ao vivo. Custa três linhas e é o que faz a tela parecer um sistema
 * em operação, e não uma captura — os consoles da Barte carregam um desde
 * sempre, pelo mesmo motivo.
 *
 * Começa VAZIO e só escreve a hora depois de montar: renderizar `new Date()` no
 * servidor e de novo no cliente dá dois textos diferentes para o mesmo nó, que é
 * erro de hidratação — e um erro de hidratação derruba a interatividade da
 * página inteira.
 */
export function Relogio() {
  const [agora, setAgora] = useState<string>("");

  useEffect(() => {
    const ler = () => setAgora(new Date().toLocaleTimeString("pt-BR"));
    ler();
    const t = setInterval(ler, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <span className="flex items-center gap-2 text-[12px] text-[var(--content-tertiary)]">
      <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--bg-brand)]" />
      {agora || "—"}
    </span>
  );
}
