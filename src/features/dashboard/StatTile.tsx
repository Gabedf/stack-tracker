import type { ReactNode } from 'react'
import { Link } from 'react-router'

export interface StatTileProps {
  /** Rótulo curto, sem dois-pontos. */
  rotulo: string
  /** Número principal. */
  valor: ReactNode
  /** Linha de contexto abaixo do número. */
  detalhe?: ReactNode
  /** Elemento extra ao lado do número (ex.: selo de nível). */
  extra?: ReactNode
  /** Se informado, o tile inteiro vira link (ex.: lista filtrada). */
  para?: string
}

const CLASSE_BASE =
  'flex h-full flex-col gap-1 rounded-theme border border-border bg-surface p-4 text-fg shadow-theme painel'

/** Stat tile: rótulo, número em destaque e contexto. Cor só nos tokens de texto. */
export function StatTile({ rotulo, valor, detalhe, extra, para }: StatTileProps) {
  const conteudo = (
    <>
      <span className="text-sm text-muted">{rotulo}</span>
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-3xl font-semibold leading-tight text-fg">{valor}</span>
        {extra}
      </span>
      {detalhe && <span className="text-sm text-muted">{detalhe}</span>}
      {para && (
        <span aria-hidden="true" className="mt-auto pt-1 text-xs font-medium text-accent">
          Ver na lista →
        </span>
      )}
    </>
  )

  if (para) {
    return (
      <Link to={para} className={`${CLASSE_BASE} hover:border-accent hover:bg-surface-2`}>
        {conteudo}
      </Link>
    )
  }
  return <div className={CLASSE_BASE}>{conteudo}</div>
}
