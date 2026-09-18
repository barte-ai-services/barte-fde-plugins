"use client";

import { useSyncExternalStore } from "react";

/**
 * A largura da janela, para decidir o que cabe na tela.
 *
 * `useSyncExternalStore` e não `useState` + `useEffect`: o snapshot do servidor
 * é um número FIXO, então o primeiro render do cliente é idêntico ao do
 * servidor. Ler `window.innerWidth` direto num `useState` inicial daria dois
 * HTMLs diferentes para o mesmo nó — erro de hidratação, que derruba a
 * interatividade da página inteira e não avisa no console.
 */
const assinar = (callback: () => void) => {
  window.addEventListener("resize", callback);
  return () => window.removeEventListener("resize", callback);
};

const noCliente = () => window.innerWidth;
/** Largura de notebook: o que o servidor assume até o cliente medir. */
const noServidor = () => 1440;

export function useLargura(): number {
  return useSyncExternalStore(assinar, noCliente, noServidor);
}
