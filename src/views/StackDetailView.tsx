import { useEffect, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { formatarNota } from '../components/formatacao'
import { KnowledgeBadge } from '../components/KnowledgeBadge'
import { useDocumentTitle } from '../components/layout'
import { LevelBadge } from '../components/LevelBadge'
import { calcularNota } from '../domain/scoring'
import {
  DimensionsEditor,
  EvolutionChart,
  EvidenceList,
  ExperienceEditor,
  HistorySummary,
  ScoreBreakdown,
  useStacks,
} from '../features/stacks'

export interface StackDetailViewProps {
  /** Data de referência para o decaimento da nota. Padrão: agora. */
  hoje?: Date
}

const CLASSE_LINK = 'font-medium text-accent underline underline-offset-2'
const CLASSE_BOTAO_LINK =
  'inline-block rounded-theme border border-control bg-surface px-3 py-1.5 text-sm font-medium text-fg hover:bg-surface-2'
const CLASSE_PAINEL =
  'flex flex-col gap-3 rounded-theme border border-border bg-surface p-4 shadow-theme painel'
const CLASSE_TITULO_PAINEL = 'font-heading text-lg font-semibold text-fg'

function CodigoId({ id }: { id: string }) {
  return <code className="rounded-theme bg-surface-2 px-1.5 py-0.5 text-fg">{id}</code>
}

/** Painel com título (h2) ligado à região por aria-labelledby. */
function Painel({ id, titulo, children }: { id: string; titulo: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className={CLASSE_PAINEL}>
      <h2 id={id} className={CLASSE_TITULO_PAINEL}>
        {titulo}
      </h2>
      {children}
    </section>
  )
}

/** Detalhe de uma stack: cabeçalho com nota e nível, edição inline e histórico. */
export function StackDetailView({ hoje }: StackDetailViewProps) {
  const { id = '' } = useParams<{ id: string }>()
  const { stacks, status, erro, atualizar, limparErro } = useStacks()
  const stack = stacks.find((s) => s.id === id)
  useDocumentTitle(stack ? stack.nome : `Stack ${id}`)

  // Ao sair do detalhe, não deixa erro de salvamento antigo no contexto.
  useEffect(() => limparErro, [limparErro])

  if (status === 'carregando') {
    return (
      <section className="space-y-4">
        <h1 className="text-3xl font-bold">Detalhe da stack</h1>
        <p role="status" className="text-muted">
          Carregando a stack <CodigoId id={id} />…
        </p>
      </section>
    )
  }

  if (status === 'erro') {
    return (
      <section className="space-y-4">
        <h1 className="text-3xl font-bold">Detalhe da stack</h1>
        <div role="alert" className="rounded-theme border border-danger bg-surface p-4 text-fg">
          <p className="font-semibold">Não foi possível carregar as stacks.</p>
          {erro && <p className="text-sm text-muted">{erro.message}</p>}
          <Link to="/stacks" className={CLASSE_LINK}>
            Voltar para Stacks
          </Link>
        </div>
      </section>
    )
  }

  if (!stack) {
    return (
      <section className="space-y-4">
        <h1 className="text-3xl font-bold">Stack não encontrada</h1>
        <p className="text-muted">
          Não existe stack com o identificador <CodigoId id={id} />.{' '}
          <Link to="/stacks" className={CLASSE_LINK}>
            Voltar para Stacks
          </Link>
        </p>
      </section>
    )
  }

  const nota = calcularNota(stack, { hoje })

  return (
    <section className="space-y-6">
      <Link to="/stacks" className={`inline-flex min-h-6 items-center ${CLASSE_LINK}`}>
        Voltar para Stacks
      </Link>

      <header className="flex flex-col gap-4 rounded-theme border border-border bg-surface p-4 shadow-theme painel sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <h1 className="font-heading text-3xl font-bold text-fg">{stack.nome}</h1>
          <p className="text-muted">
            <span className="sr-only">Categoria: </span>
            {stack.categoria}
          </p>
          {stack.tags.length > 0 && (
            <ul aria-label="Tags" className="flex flex-wrap gap-1.5">
              {stack.tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-full border border-border bg-surface-2 px-2 py-0.5 text-xs text-muted"
                >
                  {tag}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          <p className="text-5xl font-bold tabular-nums text-fg">
            <span className="sr-only">Nota: </span>
            {formatarNota(nota)}
            <span className="text-lg font-normal text-muted"> / 10</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <LevelBadge nota={nota} />
            <KnowledgeBadge stack={stack} />
          </div>
          <Link to={`/stacks/${encodeURIComponent(stack.id)}/editar`} className={CLASSE_BOTAO_LINK}>
            Editar stack
          </Link>
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Painel id="composicao" titulo="Composição da nota">
          <ScoreBreakdown stack={stack} hoje={hoje} />
        </Painel>

        <div className="flex flex-col gap-6">
          <Painel id="dimensoes" titulo="Dimensões">
            <DimensionsEditor
              key={stack.id}
              dimensoes={stack.dimensoes}
              onSalvar={(dimensoes) => atualizar(stack.id, { dimensoes })}
            />
          </Painel>

          <Painel id="experiencia" titulo="Experiência">
            <ExperienceEditor
              key={stack.id}
              experiencia={stack.experiencia}
              onSalvar={(experiencia) => atualizar(stack.id, { experiencia })}
            />
          </Painel>
        </div>
      </div>

      <Painel id="evidencias" titulo="Evidências">
        <EvidenceList
          key={stack.id}
          evidencias={stack.evidencias}
          onSalvar={(evidencias) => atualizar(stack.id, { evidencias })}
        />
      </Painel>

      <Painel id="evolucao" titulo="Evolução">
        <EvolutionChart historico={stack.historico} />
        {stack.historico.length > 0 && <HistorySummary historico={stack.historico} />}
      </Painel>
    </section>
  )
}
