import { z } from "zod";

/**
 * O fluxo da demo como DADO.
 *
 * Antes, as etapas viviam em dois lugares — uma constante no backend e uma lista
 * no front — e as regras estavam soltas dentro do motor. Mexer numa sem a outra
 * quebrava a esteira em silêncio, e adaptar a demo a um cliente novo era editar
 * código em três arquivos.
 *
 * Aqui é uma estrutura só, lida pelos dois lados: o motor executa as etapas na
 * ordem, a tela desenha os nós a partir dela, e quem apresenta edita isso na
 * frente do cliente.
 *
 * O que NÃO é: um motor de regras genérico. `acao` e `escalaSe` apontam para um
 * catálogo fechado, implementado em TypeScript. Acrescentar etapa, reordenar,
 * trocar texto e ligar uma regra que já existe não pede código; uma regra nova
 * pede — e é isso mesmo, porque a alternativa seria inventar uma linguagem de
 * expressão que ninguém pediu.
 */

export const etapaSchema = z.object({
  /** Identificador estável. É por ele que os eventos acendem o nó na tela. */
  id: z
    .string()
    .min(1, "a etapa precisa de um id")
    .regex(/^[a-z0-9-]+$/, "o id aceita só letras minúsculas, números e hífen"),
  rotulo: z.string().min(1, "a etapa precisa de um rótulo"),
  /** A linha pequena embaixo do rótulo, na esteira. */
  legenda: z.string().default(""),
  acao: z.string().min(1, "escolha o que a etapa faz"),
  /**
   * As condições que fazem o agente PARAR nesta etapa e devolver para um
   * humano. Vazio significa que a etapa nunca trava.
   */
  escalaSe: z.array(z.string()).default([]),
  /** Sobrescreve o motivo padrão da condição que disparou. Opcional. */
  motivo: z.string().optional(),
});

export const fluxoSchema = z.object({
  nome: z.string().min(1, "o fluxo precisa de um nome"),
  etapas: z.array(etapaSchema).min(1, "o fluxo precisa de pelo menos uma etapa"),
});

export type Etapa = z.infer<typeof etapaSchema>;
export type Fluxo = z.infer<typeof fluxoSchema>;
