import { NIVEIS, nivelDaNota, type NivelId } from '../domain/levels'
import type { Nota } from '../domain/types'

export interface LevelBadgeProps {
  nota: Nota
  className?: string
}

/** Estilo por nível, só com tokens: a ênfase cresce do neutro ao accent sólido. */
const ESTILO_NIVEL: Record<NivelId, string> = {
  iniciante: 'border-dashed border-border bg-surface-2 text-muted',
  aprendiz: 'border-border bg-surface text-fg',
  praticante: 'border-accent bg-surface text-accent',
  senior: 'border-accent bg-accent/15 text-fg',
  mestre: 'border-accent bg-accent text-accent-contrast',
}

/**
 * Selo do nível da nota. O nome do nível é sempre visível; os pontinhos
 * (posição do nível entre os cinco) reforçam a diferença sem depender de cor.
 */
export function LevelBadge({ nota, className = '' }: LevelBadgeProps) {
  const nivel = nivelDaNota(nota)
  const posicao = NIVEIS.findIndex((n) => n.id === nivel.id)

  return (
    <span
      data-nivel={nivel.id}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${ESTILO_NIVEL[nivel.id]} ${className}`}
    >
      <span aria-hidden="true" className="flex gap-0.5">
        {NIVEIS.map((n, i) => (
          <span
            key={n.id}
            className={`size-1.5 rounded-full border border-current ${i <= posicao ? 'bg-current' : ''}`}
          />
        ))}
      </span>
      <span className="sr-only">Nível: </span>
      <span>{nivel.nome}</span>
    </span>
  )
}
