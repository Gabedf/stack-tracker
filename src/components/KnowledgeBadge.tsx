import { seiPorSaber } from '../domain/scoring'
import type { Stack } from '../domain/types'
import { ROTULO_EXPERIENCIA } from './formatacao'
import { IconeLivro } from './icons'

export interface KnowledgeBadgeProps {
  stack: Stack
  className?: string
}

const BASE = 'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium'

/**
 * Selo "Sei por saber" (teoria alta, prática baixa) quando a stack se encaixa;
 * caso contrário, o tipo de experiência (Só teoria, Estudo, ...).
 */
export function KnowledgeBadge({ stack, className = '' }: KnowledgeBadgeProps) {
  if (seiPorSaber(stack)) {
    return (
      <span
        title="Teoria alta, prática baixa"
        className={`${BASE} border-warning bg-surface text-warning ${className}`}
      >
        <IconeLivro />
        Sei por saber
      </span>
    )
  }

  return (
    <span className={`${BASE} border-border bg-surface-2 text-muted ${className}`}>
      {ROTULO_EXPERIENCIA[stack.experiencia.tipo]}
    </span>
  )
}
