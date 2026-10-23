import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { EmptyState } from '../components/EmptyState'
import { useDocumentTitle } from '../components/layout'
import {
  DEFAULT_OPCOES_CURRICULO,
  ResumeFilters,
  ResumeSummary,
  selecionarParaCurriculo,
  type OpcoesCurriculo,
} from '../features/resume'
import { useStacks } from '../features/stacks'
import { categoriasDisponiveis } from '../features/stacks/stackFiltering'

export interface ResumeViewProps {
  /** Data de referência para as notas (decaimento). Padrão: o momento da montagem. */
  hoje?: Date
}

const CLASSE_BOTAO =
  'rounded-theme border border-border bg-surface px-3 py-1.5 text-sm font-medium text-fg hover:bg-surface-2'

export function ResumeView({ hoje }: ResumeViewProps) {
  useDocumentTitle('Currículo')
  const { stacks, status, erro, recarregar } = useStacks()
  const [montagem] = useState(() => new Date())
  const referencia = hoje ?? montagem
  const [opcoes, setOpcoes] = useState<OpcoesCurriculo>(() => ({ ...DEFAULT_OPCOES_CURRICULO }))

  const categorias = useMemo(() => categoriasDisponiveis(stacks), [stacks])
  const selecao = useMemo(
    () => selecionarParaCurriculo(stacks, opcoes, { hoje: referencia }),
    [stacks, opcoes, referencia],
  )

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
    conteudo = (
      <EmptyState
        titulo="Nenhuma stack para o currículo"
        texto="O currículo é montado a partir das stacks cadastradas, agrupadas por categoria. Comece adicionando as tecnologias que você conhece."
        acao={
          <Link to="/stacks" className="font-medium text-accent underline underline-offset-2">
            Adicionar stacks
          </Link>
        }
      />
    )
  } else {
    conteudo = (
      <div className="grid gap-6 lg:grid-cols-[minmax(16rem,20rem)_1fr]">
        <ResumeFilters
          opcoes={opcoes}
          categorias={categorias}
          onChange={(mudancas) => setOpcoes((atual) => ({ ...atual, ...mudancas }))}
          onRestaurar={() => setOpcoes({ ...DEFAULT_OPCOES_CURRICULO })}
          className="self-start"
        />
        <div className="flex min-w-0 flex-col gap-4">
          <ResumeSummary selecao={selecao} />
        </div>
      </div>
    )
  }

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Currículo</h1>
        <p className="text-muted">
          Escolha o que entra, confira o resultado e copie o Markdown, baixe o arquivo ou imprima.
        </p>
      </div>
      {conteudo}
    </section>
  )
}
