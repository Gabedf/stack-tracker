import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { EmptyState } from '../components/EmptyState'
import { formatarNota } from '../components/formatacao'
import { useDocumentTitle } from '../components/layout'
import { LevelBadge } from '../components/LevelBadge'
import {
  calcularResumo,
  CategoryOverview,
  CoolingStacksList,
  estatisticasPorCategoria,
  LevelDistribution,
  StatTile,
  TheoryPracticeQuadrant,
  TopStacksList,
} from '../features/dashboard'
import { useStacks } from '../features/stacks'
import { criteriosParaUrl } from '../features/stacks/stackFiltering'
import { useTheme } from '../themes'

export interface DashboardViewProps {
  /** Data de referência para as notas (decaimento). Padrão: o momento da montagem. */
  hoje?: Date
}

const CLASSE_BOTAO =
  'rounded-theme border border-control bg-surface px-3 py-1.5 text-sm font-medium text-fg hover:bg-surface-2'
const CLASSE_PAINEL =
  'flex flex-col gap-3 rounded-theme border border-border bg-surface p-4 shadow-theme'

/** Painel com título (h2) ligado à região por aria-labelledby. */
function Painel({ id, titulo, children }: { id: string; titulo: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className={CLASSE_PAINEL}>
      <h2 id={id} className="font-heading text-lg font-semibold text-fg">
        {titulo}
      </h2>
      {children}
    </section>
  )
}

/** Atalho de destaque para a ficha do personagem; só aparece no tema RPG. */
function LinkFicha() {
  const { tema } = useTheme()
  if (tema !== 'rpg') return null
  return (
    <Link
      to="/ficha"
      className="inline-flex items-center gap-2 rounded-theme border border-accent bg-surface px-4 py-2 font-heading font-semibold text-accent shadow-glow hover:bg-surface-2"
    >
      Abrir ficha do personagem →
    </Link>
  )
}

function plural(qtd: number, singular: string, pluralTexto: string): string {
  return qtd === 1 ? singular : pluralTexto
}

export function DashboardView({ hoje }: DashboardViewProps) {
  useDocumentTitle('Dashboard')
  const { stacks, status, erro, recarregar } = useStacks()
  const [montagem] = useState(() => new Date())
  const referencia = hoje ?? montagem

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
        titulo="Nenhuma stack para resumir"
        texto="O dashboard mostra sua nota média, a distribuição por nível e as stacks que estão esfriando. Comece adicionando as tecnologias que você conhece."
        acao={
          <Link to="/stacks" className="font-medium text-accent underline underline-offset-2">
            Adicionar stacks
          </Link>
        }
      />
    )
  } else {
    const resumo = calcularResumo(stacks, { hoje: referencia })

    conteudo = (
      <div className="flex flex-col gap-6">
        <ul aria-label="Resumo" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <li>
            <StatTile
              rotulo="Stacks"
              valor={resumo.total}
              detalhe={plural(resumo.total, 'tecnologia no painel', 'tecnologias no painel')}
              para="/stacks"
            />
          </li>
          <li>
            <StatTile
              rotulo="Nota média"
              valor={formatarNota(resumo.notaMedia)}
              extra={<LevelBadge nota={resumo.notaMedia} />}
              detalhe="de 10, com decaimento"
            />
          </li>
          <li>
            <StatTile
              rotulo="Prática real"
              valor={resumo.praticaReal}
              detalhe={`de ${resumo.total} em projeto pessoal ou produção`}
              para={`/stacks?${criteriosParaUrl({ somentePraticaReal: true })}`}
            />
          </li>
          <li>
            <StatTile
              rotulo="Sei por saber"
              valor={resumo.seiPorSaber}
              detalhe="teoria alta, prática baixa"
            />
          </li>
          <li>
            <StatTile
              rotulo="Evidências"
              valor={resumo.evidencias}
              detalhe="repos, projetos, empregos e certificados"
            />
          </li>
        </ul>

        <div className="grid gap-6 md:grid-cols-2">
          <Painel id="dashboard-niveis" titulo="Distribuição por nível">
            <LevelDistribution distribuicao={resumo.distribuicaoPorNivel} total={resumo.total} />
          </Painel>
          <div className="flex flex-col gap-6">
            <Painel id="dashboard-top" titulo="Top 3">
              <TopStacksList itens={resumo.top} />
            </Painel>
            <Painel id="dashboard-esfriando" titulo="Esfriando">
              <CoolingStacksList itens={resumo.esfriando} />
            </Painel>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Painel id="dashboard-categorias" titulo="Por categoria">
            <CategoryOverview
              estatisticas={estatisticasPorCategoria(stacks, { hoje: referencia })}
            />
          </Painel>
          <Painel id="dashboard-quadrante" titulo="Teoria × prática">
            <TheoryPracticeQuadrant stacks={stacks} hoje={referencia} />
          </Painel>
        </div>
      </div>
    )
  }

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted">Visão geral das suas stacks: notas, níveis e evolução.</p>
        <LinkFicha />
      </div>
      {conteudo}
    </section>
  )
}
