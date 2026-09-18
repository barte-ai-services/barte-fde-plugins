import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

/**
 * Onde moram os dados da demo (`dados/`).
 *
 * Sobe a partir deste arquivo até achar a pasta, em vez de contar a partir do
 * `cwd`: `npm run dev` roda de `apps/api`, o `make` roda da raiz, e o Nest
 * compilado roda de `dist/` — três cwd diferentes para o mesmo repositório.
 * Um caminho relativo ao cwd acerta um dos três e falha calado nos outros dois,
 * com a demo subindo VAZIA, que é o pior modo de falhar antes de uma reunião.
 */
export function dirDados(): string {
  const explicito = process.env.DADOS_DIR;
  if (explicito) return explicito;

  let dir = __dirname;
  for (let i = 0; i < 8; i += 1) {
    const candidato = resolve(dir, "dados");
    if (existsSync(resolve(candidato, "documentos"))) return candidato;
    const acima = dirname(dir);
    if (acima === dir) break;
    dir = acima;
  }
  throw new Error(
    "não achei a pasta `dados/` subindo a partir de " +
      __dirname +
      " — aponte DADOS_DIR para ela",
  );
}
