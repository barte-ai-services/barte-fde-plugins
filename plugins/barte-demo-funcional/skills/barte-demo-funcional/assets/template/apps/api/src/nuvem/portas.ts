/**
 * As duas portas que a demo usa da nuvem, e nada além delas.
 *
 * A aplicação inteira fala com estas duas interfaces. Quem sabe se por baixo há
 * S3 ou Cloud Storage, SQS ou Pub/Sub, é o adaptador — e trocar de nuvem é
 * trocar UMA variável de ambiente, não reescrever o backend.
 *
 * Por que só duas: porque é o que o trabalho pede. Guardar o documento como ele
 * chegou, e distribuir trabalho para quem processa. Toda nuvem tem as duas com
 * nomes diferentes, e é justamente por serem o mínimo que a portabilidade sai
 * barata — um terceiro serviço aqui (banco gerenciado, função, fila de morte)
 * multiplicaria os adaptadores por três sem acrescentar nada à demo.
 */

export interface Armazenamento {
  /** Nome da tecnologia por baixo, para o painel da stack. */
  readonly tecnologia: string;
  /** Cria o bucket/contêiner se ele não existir. Idempotente. */
  garantir(): Promise<void>;
  gravar(caminho: string, conteudo: Buffer | string, tipo?: string): Promise<void>;
  listar(prefixo: string): Promise<string[]>;
  ler(caminho: string): Promise<string>;
  /** Uma chamada barata que só passa se o serviço estiver de pé. */
  saude(): Promise<void>;
}

export interface Fila {
  readonly tecnologia: string;
  garantir(): Promise<void>;
  enviar(corpo: string): Promise<void>;
  /**
   * Espera até `segundos` por mensagens. Devolve cada uma com um `confirmar()`
   * que a remove — a confirmação é do CHAMADOR, depois de processar, porque é
   * isso que faz a mensagem voltar para a fila se o processo morrer no meio.
   */
  receber(segundos: number): Promise<{ corpo: string; confirmar: () => Promise<void> }[]>;
  saude(): Promise<void>;
}

export type Nuvem = "aws" | "gcp" | "azure";

export function nuvemAtual(): Nuvem {
  const v = (process.env.NUVEM ?? "aws").toLowerCase();
  if (v === "gcp" || v === "azure" || v === "aws") return v;
  throw new Error(`NUVEM inválida: ${v} — use aws, gcp ou azure`);
}
