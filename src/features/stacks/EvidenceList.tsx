import { ROTULO_EVIDENCIA } from '../../components/formatacao'
import type { Evidencia, TipoEvidencia } from '../../domain/types'

export interface EvidenceListProps {
  /** Evidências salvas da stack. */
  evidencias: readonly Evidencia[]
}

/** Ícone decorativo de cada tipo (o rótulo em texto vem ao lado). */
const ICONE_EVIDENCIA: Record<TipoEvidencia, string> = {
  repo: '⑂',
  projeto: '◆',
  emprego: '▣',
  certificado: '✓',
}

function TipoEvidenciaBadge({ tipo }: { tipo: TipoEvidencia }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-xs font-medium text-muted">
      <span aria-hidden="true">{ICONE_EVIDENCIA[tipo]}</span>
      {ROTULO_EVIDENCIA[tipo]}
    </span>
  )
}

function TituloEvidencia({ evidencia }: { evidencia: Evidencia }) {
  if (!evidencia.url) return <>{evidencia.titulo}</>
  return (
    <a
      href={evidencia.url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-accent underline underline-offset-2"
    >
      {evidencia.titulo}
      <span className="sr-only"> (abre em nova aba)</span>
    </a>
  )
}

/** Lista das evidências da stack: tipo, título (link externo se houver URL) e descrição. */
export function EvidenceList({ evidencias }: EvidenceListProps) {
  if (evidencias.length === 0) {
    return (
      <p className="rounded-theme border border-dashed border-border bg-surface-2 p-4 text-sm text-muted">
        Nenhuma evidência ainda. Adicione repositórios, projetos, empregos ou certificados:
        evidências aumentam a nota da stack.
      </p>
    )
  }

  return (
    <ul aria-label="Lista de evidências" className="flex flex-col gap-3">
      {evidencias.map((evidencia, i) => (
        <li
          key={`${evidencia.titulo}-${i}`}
          className="flex flex-col gap-2 rounded-theme border border-border bg-surface-2 p-3"
        >
          <div className="flex flex-wrap items-center gap-2">
            <TipoEvidenciaBadge tipo={evidencia.tipo} />
            <h3 className="min-w-0 font-semibold break-words text-fg">
              <TituloEvidencia evidencia={evidencia} />
            </h3>
          </div>
          {evidencia.descricao && <p className="text-sm text-muted">{evidencia.descricao}</p>}
        </li>
      ))}
    </ul>
  )
}
