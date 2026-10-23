import { seiPorSaber } from '../domain/scoring'
import type { Stack } from '../domain/types'
import { ROTULO_EXPERIENCIA } from './formatacao'

export interface KnowledgeBadgeProps {
  stack: Stack
  className?: string
}

const BASE = 'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium'

/** Livro aberto (decorativo). */
function IconeLivro() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      className="size-3.5 shrink-0"
    >
      <path d="M8 4c-1.5-1.2-3.5-1.5-6-1.2v9.4c2.5-.3 4.5 0 6 1.2 1.5-1.2 3.5-1.5 6-1.2V2.8C11.5 2.5 9.5 2.8 8 4Zm0 0v9.4" />
    </svg>
  )
}

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
