import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { formatarNota } from '../components/formatacao'
import { KnowledgeBadge } from '../components/KnowledgeBadge'
import { useDocumentTitle } from '../components/layout'
import { LevelBadge } from '../components/LevelBadge'
import { StackCard } from '../components/StackCard'
import { calcularNota } from '../domain/scoring'
import type { Stack } from '../domain/types'
import { StackFilters, useStacks } from '../features/stacks'
import {
  CRITERIOS_PADRAO,
  categoriasDisponiveis,
  criteriosDaUrl,
  criteriosParaUrl,
  filtrarEOrdenar,
  type CriteriosStacks,
} from '../features/stacks/stackFiltering'

type Visao = 'grade' | 'lista'

const PARAM_VISAO = 'visao'
const VISOES: readonly { id: Visao; rotulo: string }[] = [
  { id: 'grade', rotulo: 'Grade' },
  { id: 'lista', rotulo: 'Lista' },
]

const CLASSE_BOTAO =
  'rounded-theme border border-border bg-surface px-3 py-1.5 text-sm font-medium text-fg hover:bg-surface-2'

export interface StacksViewProps {
  /** Data de referência para as notas (decaimento). Padrão: o momento da montagem. */
  hoje?: Date
}

function textoContador(visiveis: number, total: number): string {
  return `${visiveis} de ${total} ${total === 1 ? 'stack' : 'stacks'}`
}

/** Linha compacta da visão em lista. */
function LinhaStack({ stack, hoje }: { stack: Stack; hoje: Date }) {
  const nota = calcularNota(stack, { hoje })

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-theme border border-border bg-surface px-4 py-3 shadow-theme">
      <div className="min-w-0 flex-1">
        <h2 className="font-heading font-semibold leading-tight">
          <Link
            to={`/stacks/${encodeURIComponent(stack.id)}`}
            className="rounded-theme text-fg hover:text-accent hover:underline"
          >
            {stack.nome}
          </Link>
        </h2>
        <p className="text-sm text-muted">{stack.categoria}</p>
      </div>
      <KnowledgeBadge stack={stack} />
      <LevelBadge nota={nota} />
      <p className="w-16 text-right font-semibold tabular-nums text-fg">
        <span className="sr-only">Nota: </span>
        {formatarNota(nota)}
      </p>
    </li>
  )
}

export function StacksView({ hoje }: StacksViewProps) {
  useDocumentTitle('Stacks')
  const { stacks, status, erro, recarregar } = useStacks()
  const [params, setParams] = useSearchParams()
  const [montagem] = useState(() => new Date())
  const referencia = hoje ?? montagem

  const categorias = categoriasDisponiveis(stacks)
  // Antes de carregar não dá para saber se a categoria da URL existe.
  const opcoesUrl = status === 'pronto' ? { categorias } : {}
  const criterios = criteriosDaUrl(params, opcoesUrl)
  const visao: Visao = params.get(PARAM_VISAO) === 'lista' ? 'lista' : 'grade'
  const visiveis = filtrarEOrdenar(stacks, criterios, { hoje: referencia })

  function alterarCriterios(mudancas: Partial<CriteriosStacks>) {
    setParams(
      (atual) => criteriosParaUrl({ ...criteriosDaUrl(atual, opcoesUrl), ...mudancas }, atual),
      { replace: true },
    )
  }

  function limparFiltros() {
    alterarCriterios({ ...CRITERIOS_PADRAO, ordenacao: criterios.ordenacao })
  }

  function alterarVisao(nova: Visao) {
    setParams(
      (atual) => {
        const proximo = new URLSearchParams(atual)
        if (nova === 'grade') proximo.delete(PARAM_VISAO)
        else proximo.set(PARAM_VISAO, nova)
        return proximo
      },
      { replace: true },
    )
  }

  let conteudo
  if (status === 'carregando') {
    conteudo = (
      <p role="status" className="text-muted">
        Carregando stacks…
      </p>
    )
  } else if (status === 'erro') {
    conteudo = (
      <div
        role="alert"
        className="flex flex-col items-start gap-3 rounded-theme border border-danger bg-surface p-4 text-fg"
      >
        <div>
          <p className="font-semibold">Não foi possível carregar as stacks.</p>
          {erro && <p className="text-sm text-muted">{erro.message}</p>}
        </div>
        <button
          type="button"
          onClick={() => recarregar().catch(() => undefined)}
          className={CLASSE_BOTAO}
        >
          Tentar de novo
        </button>
      </div>
    )
  } else if (stacks.length === 0) {
    conteudo = <p className="text-muted">Nenhuma stack cadastrada ainda.</p>
  } else {
    conteudo = (
      <div className="flex flex-col gap-4">
        <StackFilters
          criterios={criterios}
          categorias={categorias}
          onChange={alterarCriterios}
          onLimpar={limparFiltros}
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p aria-live="polite" className="text-sm text-muted">
            {textoContador(visiveis.length, stacks.length)}
          </p>
          <div role="group" aria-label="Visualização" className="flex gap-1">
            {VISOES.map(({ id, rotulo }) => (
              <button
                key={id}
                type="button"
                aria-pressed={visao === id}
                onClick={() => alterarVisao(id)}
                className={
                  visao === id
                    ? 'rounded-theme border border-accent bg-accent px-3 py-1.5 text-sm font-medium text-accent-contrast'
                    : CLASSE_BOTAO
                }
              >
                {rotulo}
              </button>
            ))}
          </div>
        </div>

        {visiveis.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-theme border border-dashed border-border bg-surface p-6 text-center">
            <p className="text-fg">Nenhuma stack corresponde aos filtros.</p>
            <button type="button" onClick={limparFiltros} className={CLASSE_BOTAO}>
              Limpar filtros
            </button>
          </div>
        ) : visao === 'grade' ? (
          <ul aria-label="Stacks" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visiveis.map((stack) => (
              <li key={stack.id} className="flex">
                <StackCard stack={stack} hoje={referencia} className="w-full" />
              </li>
            ))}
          </ul>
        ) : (
          <ul aria-label="Stacks" className="flex flex-col gap-2">
            {visiveis.map((stack) => (
              <LinhaStack key={stack.id} stack={stack} hoje={referencia} />
            ))}
          </ul>
        )}
      </div>
    )
  }

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-bold">Stacks</h1>
      {conteudo}
    </section>
  )
}
