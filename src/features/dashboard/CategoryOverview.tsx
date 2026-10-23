import { useState } from 'react'
import { useNavigate } from 'react-router'
import { CategoryRadar } from '../../components/charts/CategoryRadar'
import { criteriosParaUrl } from '../stacks/stackFiltering'
import type { EstatisticaCategoria } from './dashboardStats'

export interface CategoryOverviewProps {
  estatisticas: readonly EstatisticaCategoria[]
}

type Metrica = 'notaMedia' | 'teoria' | 'pratica' | 'profundidade'

/** Mesma cor de cada medida no gráfico de evolução: a cor segue a medida. */
const METRICAS: readonly { id: Metrica; rotulo: string; rotuloValor: string; cor: string }[] = [
  {
    id: 'notaMedia',
    rotulo: 'Nota',
    rotuloValor: 'Nota média',
    cor: 'var(--theme-chart-nota)',
  },
  {
    id: 'teoria',
    rotulo: 'Teoria',
    rotuloValor: 'Teoria média',
    cor: 'var(--theme-chart-teoria)',
  },
  {
    id: 'pratica',
    rotulo: 'Prática',
    rotuloValor: 'Prática média',
    cor: 'var(--theme-chart-pratica)',
  },
  {
    id: 'profundidade',
    rotulo: 'Profundidade',
    rotuloValor: 'Profundidade média',
    cor: 'var(--theme-chart-profundidade)',
  },
]

/**
 * Radar por categoria no dashboard: uma medida por vez (nota média por padrão),
 * escolhida nos toggles. Clicar numa categoria abre a lista filtrada por ela.
 */
export function CategoryOverview({ estatisticas }: CategoryOverviewProps) {
  const navigate = useNavigate()
  const [metrica, setMetrica] = useState<Metrica>('notaMedia')
  const atual = METRICAS.find((m) => m.id === metrica) ?? METRICAS[0]

  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label="Medida do gráfico" className="flex flex-wrap gap-2 text-sm">
        {METRICAS.map((m) => (
          <button
            key={m.id}
            type="button"
            aria-pressed={m.id === metrica}
            onClick={() => setMetrica(m.id)}
            className={
              'rounded-theme border px-2 py-1 font-medium ' +
              (m.id === metrica
                ? 'border-fg bg-surface-2 text-fg'
                : 'border-border bg-surface text-muted hover:bg-surface-2')
            }
          >
            {m.rotulo}
          </button>
        ))}
      </div>
      <CategoryRadar
        itens={estatisticas.map((e) => ({
          categoria: e.categoria,
          valor: e[metrica],
          quantidade: e.quantidade,
        }))}
        rotuloValor={atual.rotuloValor}
        cor={atual.cor}
        onSelecionar={(categoria) => navigate(`/stacks?${criteriosParaUrl({ categoria })}`)}
      />
    </div>
  )
}
