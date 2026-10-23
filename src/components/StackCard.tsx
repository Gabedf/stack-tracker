import { useId } from 'react'
import { Link } from 'react-router'
import { calcularNota } from '../domain/scoring'
import type { Stack } from '../domain/types'
import { KnowledgeBadge } from './KnowledgeBadge'
import { LevelBadge } from './LevelBadge'
import { ScoreBar } from './ScoreBar'

export interface StackCardProps {
  stack: Stack
  /** Data de referência para o decaimento da nota (default: agora). */
  hoje?: Date
  /** Nível do heading com o nome da stack (default: 2). */
  nivelTitulo?: 2 | 3
  className?: string
}

function textoEvidencias(qtd: number): string {
  if (qtd === 0) return 'Nenhuma evidência'
  return qtd === 1 ? '1 evidência' : `${qtd} evidências`
}

/** Card-resumo de uma stack: nota calculada, nível, dimensões, selo, tags e evidências. */
export function StackCard({ stack, hoje, nivelTitulo = 2, className = '' }: StackCardProps) {
  const idTitulo = useId()
  const nota = calcularNota(stack, { hoje })
  const Titulo = nivelTitulo === 3 ? 'h3' : 'h2'
  const { teoria, pratica, profundidade } = stack.dimensoes

  return (
    <article
      aria-labelledby={idTitulo}
      className={`flex flex-col gap-4 rounded-theme border border-border bg-surface p-4 text-fg shadow-theme ${className}`}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Titulo id={idTitulo} className="font-heading text-lg font-bold leading-tight">
            <Link
              to={`/stacks/${encodeURIComponent(stack.id)}`}
              className="rounded-theme text-fg hover:text-accent hover:underline"
            >
              {stack.nome}
            </Link>
          </Titulo>
          <p className="mt-0.5 text-sm text-muted">{stack.categoria}</p>
        </div>
        <KnowledgeBadge stack={stack} className="shrink-0" />
      </header>

      <div className="flex flex-col gap-2">
        <ScoreBar valor={nota} rotulo="Nota" />
        <div>
          <LevelBadge nota={nota} />
        </div>
      </div>

      <div role="group" aria-label="Dimensões" className="flex flex-col gap-1.5">
        <ScoreBar valor={teoria} rotulo="Teoria" compacta />
        <ScoreBar valor={pratica} rotulo="Prática" compacta />
        <ScoreBar valor={profundidade} rotulo="Profundidade" compacta />
      </div>

      <footer className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        {stack.tags.length > 0 && (
          <ul aria-label="Tags" className="flex flex-wrap gap-1.5">
            {stack.tags.map((tag) => (
              <li key={tag} className="rounded-theme bg-surface-2 px-2 py-0.5 text-xs text-muted">
                {tag}
              </li>
            ))}
          </ul>
        )}
        <p className="ml-auto text-xs text-muted">{textoEvidencias(stack.evidencias.length)}</p>
      </footer>
    </article>
  )
}
