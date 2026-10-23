/**
 * Níveis derivados da nota (0-10).
 *
 * Faixas semiabertas [min, max), exceto o último nível, que inclui o 10.
 */

import type { Nota } from './types'

export const NOTA_MINIMA = 0
export const NOTA_MAXIMA = 10

export type NivelId = 'iniciante' | 'aprendiz' | 'praticante' | 'senior' | 'mestre'

export interface Nivel {
  id: NivelId
  nome: string
  /** Limite inferior (inclusivo). */
  min: Nota
  /** Limite superior (exclusivo, exceto no último nível). */
  max: Nota
}

/** Níveis em ordem crescente. */
export const NIVEIS: readonly Nivel[] = [
  { id: 'iniciante', nome: 'Iniciante', min: 0, max: 2 },
  { id: 'aprendiz', nome: 'Aprendiz', min: 2, max: 4 },
  { id: 'praticante', nome: 'Praticante', min: 4, max: 6 },
  { id: 'senior', nome: 'Sênior', min: 6, max: 8 },
  { id: 'mestre', nome: 'Mestre', min: 8, max: 10 },
]

function clampNota(nota: Nota): Nota {
  if (Number.isNaN(nota)) return NOTA_MINIMA
  return Math.min(NOTA_MAXIMA, Math.max(NOTA_MINIMA, nota))
}

/** Nível correspondente à nota. Valores fora de 0-10 são limitados à faixa. */
export function nivelDaNota(nota: Nota): Nivel {
  const n = clampNota(nota)
  return NIVEIS.find((nivel) => n < nivel.max) ?? NIVEIS[NIVEIS.length - 1]
}

/** Progresso (0-1) da nota dentro da faixa do seu nível. */
export function progressoNoNivel(nota: Nota): number {
  const n = clampNota(nota)
  const { min, max } = nivelDaNota(n)
  return Math.min(1, Math.max(0, (n - min) / (max - min)))
}
