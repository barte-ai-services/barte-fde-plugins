"use client";

import { useSyncExternalStore } from "react";

/**
 * The window width, to decide what fits on screen.
 *
 * `useSyncExternalStore` rather than `useState` + `useEffect`: the server
 * snapshot is a FIXED number, so the client's first render matches the server's.
 * Reading `window.innerWidth` in a `useState` initialiser would give two
 * different HTMLs for the same node — a hydration error, which takes the whole
 * page's interactivity down and says nothing in the console.
 */
const subscribe = (callback: () => void) => {
  window.addEventListener("resize", callback);
  return () => window.removeEventListener("resize", callback);
};

const onClient = () => window.innerWidth;
/** Laptop width: what the server assumes until the client measures. */
const onServer = () => 1440;

export function useWidth(): number {
  return useSyncExternalStore(subscribe, onClient, onServer);
}
