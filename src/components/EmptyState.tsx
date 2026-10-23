import { useId, type ReactNode } from 'react'

export interface EmptyStateProps {
  titulo: string
  /** Uma ou duas frases explicando o vazio e o que fazer. */
  texto: ReactNode
  /** Ação principal (link, botão ou formulário curto). */
  acao?: ReactNode
  /** Nível do heading do título (default: 2). */
  nivelTitulo?: 2 | 3
  className?: string
}

/** Bloco genérico para telas sem conteúdo: título, explicação e uma ação. */
export function EmptyState({
  titulo,
  texto,
  acao,
  nivelTitulo = 2,
  className = '',
}: EmptyStateProps) {
  const idTitulo = useId()
  const Titulo = nivelTitulo === 3 ? 'h3' : 'h2'

  return (
    <section
      aria-labelledby={idTitulo}
      className={`flex flex-col items-center gap-3 rounded-theme border border-dashed border-border bg-surface p-6 text-center text-fg ${className}`}
    >
      <Titulo id={idTitulo} className="font-heading text-xl font-semibold">
        {titulo}
      </Titulo>
      <div className="max-w-prose text-muted">{texto}</div>
      {acao && <div className="flex flex-wrap items-center justify-center gap-3">{acao}</div>}
    </section>
  )
}
