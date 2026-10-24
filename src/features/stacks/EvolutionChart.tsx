import { useMemo, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatarData, formatarNota } from '../../components/formatacao'
import { TabelaRolavel } from '../../components/TabelaRolavel'
import { NIVEIS, NOTA_MAXIMA, NOTA_MINIMA } from '../../domain/levels'
import type { RegistroHistorico } from '../../domain/types'
import {
  DIMENSOES_SERIE,
  ROTULO_DIMENSAO,
  dominioTempo,
  resumoEvolucao,
  serieEvolucao,
  type DimensaoSerie,
  type PontoEvolucao,
} from './evolutionData'

export interface EvolutionChartProps {
  historico: readonly RegistroHistorico[]
}

type SerieId = 'nota' | DimensaoSerie
type Forma = 'circulo' | 'quadrado' | 'triangulo' | 'losango'

/**
 * Identidade de cada série: cor do tema + forma do marcador. A forma é o canal
 * secundário (daltonismo, impressão), então a cor nunca carrega a série sozinha.
 * A ordem é fixa: ligar/desligar uma série não muda a cor das outras.
 */
const SERIES: Record<SerieId, { rotulo: string; cor: string; forma: Forma }> = {
  nota: { rotulo: 'Nota', cor: 'var(--theme-chart-nota)', forma: 'circulo' },
  teoria: { rotulo: ROTULO_DIMENSAO.teoria, cor: 'var(--theme-chart-teoria)', forma: 'quadrado' },
  pratica: {
    rotulo: ROTULO_DIMENSAO.pratica,
    cor: 'var(--theme-chart-pratica)',
    forma: 'triangulo',
  },
  profundidade: {
    rotulo: ROTULO_DIMENSAO.profundidade,
    cor: 'var(--theme-chart-profundidade)',
    forma: 'losango',
  },
}

const ALTURA_GRAFICO = 256
const TICKS_NOTA = NIVEIS.map((n) => n.min).concat(NOTA_MAXIMA)
const COR_TEXTO = 'var(--theme-text)'
const COR_TEXTO_SUAVE = 'var(--theme-text-muted)'
const COR_SURFACE = 'var(--theme-surface)'
const ESTILO_TICK = { fill: COR_TEXTO_SUAVE, fontSize: 12 }

const DIMENSOES_DESLIGADAS: Record<DimensaoSerie, boolean> = {
  teoria: false,
  pratica: false,
  profundidade: false,
}

interface MarcadorProps {
  forma: Forma
  cor: string
  cx: number
  cy: number
  /** Meia-largura do marcador em px (4 = marcador de 8px). */
  raio?: number
}

/** Marcador da série com anel de 2px na cor da surface (legível sobre as linhas). */
function Marcador({ forma, cor, cx, cy, raio = 4 }: MarcadorProps) {
  const comum = { fill: cor, stroke: COR_SURFACE, strokeWidth: 2 }
  switch (forma) {
    case 'circulo':
      return <circle cx={cx} cy={cy} r={raio} {...comum} />
    case 'quadrado':
      return <rect x={cx - raio} y={cy - raio} width={raio * 2} height={raio * 2} {...comum} />
    case 'triangulo': {
      const r = raio * 1.25
      return (
        <polygon
          points={`${cx},${cy - r} ${cx + r},${cy + r * 0.8} ${cx - r},${cy + r * 0.8}`}
          {...comum}
        />
      )
    }
    case 'losango': {
      const r = raio * 1.3
      return (
        <polygon
          points={`${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`}
          {...comum}
        />
      )
    }
  }
}

/** Chave de legenda: traço da linha com o marcador da série no meio. */
function ChaveSerie({ serie }: { serie: SerieId }) {
  const { cor, forma } = SERIES[serie]
  return (
    <svg width="24" height="12" viewBox="0 0 24 12" aria-hidden="true" className="shrink-0">
      <line x1="0" y1="6" x2="24" y2="6" stroke={cor} strokeWidth="2" strokeLinecap="round" />
      <Marcador forma={forma} cor={cor} cx={12} cy={6} raio={3.5} />
    </svg>
  )
}

/** Função de desenho dos pontos de uma série (o Recharts a chama para cada ponto). */
function pontosDaSerie(serie: SerieId, raio = 4) {
  const { cor, forma } = SERIES[serie]
  return (props: { cx?: number; cy?: number; index?: number }) => {
    if (props.cx == null || props.cy == null) return null
    return (
      <Marcador
        key={`${serie}-${props.index}`}
        forma={forma}
        cor={cor}
        cx={props.cx}
        cy={props.cy}
        raio={raio}
      />
    )
  }
}

function TooltipEvolucao({
  active,
  payload,
  dimensoes,
}: {
  active?: boolean
  payload?: ReadonlyArray<{ payload?: unknown }>
  dimensoes: readonly DimensaoSerie[]
}) {
  const ponto = payload?.[0]?.payload as PontoEvolucao | undefined
  if (!active || !ponto) return null

  const linhas: { serie: SerieId; valor: number; detalhe: string }[] = [
    { serie: 'nota', valor: ponto.nota, detalhe: `Nota · ${ponto.nivel}` },
    ...dimensoes.map((d) => ({ serie: d, valor: ponto[d], detalhe: SERIES[d].rotulo })),
  ]

  return (
    <div className="rounded-theme border border-border bg-surface px-3 py-2 text-sm shadow-theme">
      <p className="mb-1 text-xs text-muted">{formatarData(ponto.data)}</p>
      <ul className="flex flex-col gap-0.5">
        {linhas.map(({ serie, valor, detalhe }) => (
          <li key={serie} className="flex items-center gap-2">
            <ChaveSerie serie={serie} />
            <span className="font-semibold tabular-nums text-fg">{formatarNota(valor)}</span>
            <span className="text-muted">{detalhe}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Gráfico de linha da nota ao longo do tempo, com faixas de nível ao fundo e
 * dimensões opcionais como séries secundárias. A camada acessível (resumo no
 * aria-label e tabela com todos os pontos) é o equivalente textual do gráfico.
 *
 * Teclado: o tooltip é só de ponteiro, por decisão. Tudo o que ele mostra (data,
 * nota, nível e dimensões de cada ponto) está na tabela "Ver dados em tabela",
 * que abre com Enter/Espaço e rola pelas setas. O accessibilityLayer do Recharts
 * fica desligado: poria um role="application" focável dentro do role="img" e uma
 * segunda forma, só visual, de ler os mesmos números.
 */
export function EvolutionChart({ historico }: EvolutionChartProps) {
  const pontos = useMemo(() => serieEvolucao(historico), [historico])
  const [ligadas, setLigadas] = useState(DIMENSOES_DESLIGADAS)

  if (pontos.length === 0) {
    return (
      <p className="rounded-theme border border-dashed border-border bg-surface-2 p-4 text-center text-sm text-muted">
        Ainda não há histórico; edite as dimensões para registrar a evolução.
      </p>
    )
  }

  const visiveis = DIMENSOES_SERIE.filter((d) => ligadas[d])
  const rotulosTempo = new Map(pontos.map((p) => [p.tempo, formatarData(p.data)]))
  const ticksTempo = [...rotulosTempo.keys()]
  const ultimo = pontos.length - 1
  const resumo = resumoEvolucao(pontos)
  const descricaoSeries =
    visiveis.length > 0
      ? ` Dimensões exibidas: ${visiveis.map((d) => SERIES[d].rotulo).join(', ')}.`
      : ''

  return (
    <div className="flex flex-col gap-3">
      <div
        role="group"
        aria-label="Séries do gráfico"
        className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm"
      >
        <span className="inline-flex items-center gap-1.5 font-medium text-fg">
          <ChaveSerie serie="nota" />
          Nota
        </span>
        {DIMENSOES_SERIE.map((d) => (
          <button
            key={d}
            type="button"
            aria-pressed={ligadas[d]}
            onClick={() => setLigadas((atual) => ({ ...atual, [d]: !atual[d] }))}
            className={
              'inline-flex items-center gap-1.5 rounded-theme border px-2 py-1 font-medium ' +
              (ligadas[d]
                ? 'border-fg bg-surface-2 text-fg'
                : 'border-control bg-surface text-muted hover:bg-surface-2')
            }
          >
            <span className={ligadas[d] ? '' : 'opacity-40'}>
              <ChaveSerie serie={d} />
            </span>
            {SERIES[d].rotulo}
          </button>
        ))}
      </div>

      <figure className="m-0 flex flex-col gap-2">
        <div role="img" aria-label={resumo + descricaoSeries} className="w-full">
          <ResponsiveContainer width="100%" height={ALTURA_GRAFICO}>
            <LineChart
              data={pontos}
              margin={{ top: 20, right: 84, bottom: 4, left: 0 }}
              accessibilityLayer={false}
            >
              {NIVEIS.map((nivel, i) => (
                <ReferenceArea
                  key={nivel.id}
                  y1={nivel.min}
                  y2={nivel.max}
                  fill={i % 2 === 1 ? 'var(--theme-chart-band)' : 'transparent'}
                  fillOpacity={1}
                  stroke="none"
                  label={{
                    value: nivel.nome,
                    position: 'right',
                    fill: COR_TEXTO_SUAVE,
                    fontSize: 11,
                  }}
                />
              ))}
              <CartesianGrid vertical={false} stroke="var(--theme-chart-grid)" />
              <XAxis
                dataKey="tempo"
                type="number"
                scale="time"
                domain={dominioTempo(pontos)}
                ticks={ticksTempo}
                tickFormatter={(t: number) => rotulosTempo.get(t) ?? ''}
                interval="preserveStartEnd"
                minTickGap={16}
                padding={{ left: 16, right: 16 }}
                tick={ESTILO_TICK}
                tickLine={false}
                axisLine={{ stroke: 'var(--theme-border)' }}
              />
              <YAxis
                domain={[NOTA_MINIMA, NOTA_MAXIMA]}
                ticks={TICKS_NOTA}
                allowDataOverflow
                width={32}
                tick={ESTILO_TICK}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={({ active, payload }) => (
                  <TooltipEvolucao active={active} payload={payload} dimensoes={visiveis} />
                )}
                cursor={{ stroke: 'var(--theme-border)', strokeWidth: 1 }}
                isAnimationActive={false}
              />
              {visiveis.map((d) => (
                <Line
                  key={d}
                  dataKey={d}
                  name={SERIES[d].rotulo}
                  type="linear"
                  stroke={SERIES[d].cor}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  dot={pontosDaSerie(d)}
                  activeDot={pontosDaSerie(d, 5)}
                  isAnimationActive={false}
                />
              ))}
              <Line
                dataKey="nota"
                name="Nota"
                type="linear"
                stroke={SERIES.nota.cor}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                dot={pontosDaSerie('nota')}
                activeDot={pontosDaSerie('nota', 5)}
                isAnimationActive={false}
                label={(props: { x?: number | string; y?: number | string; index?: number }) =>
                  props.index === ultimo ? (
                    <text
                      key="rotulo-ultima-nota"
                      x={Number(props.x)}
                      y={Number(props.y) - 10}
                      textAnchor="middle"
                      fill={COR_TEXTO}
                      fontSize={12}
                      fontWeight={600}
                    >
                      {formatarNota(pontos[ultimo].nota)}
                    </text>
                  ) : null
                }
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <figcaption className="text-xs text-muted">
          Nota de 0 a 10 por data de registro; as faixas ao fundo são os níveis.
          {pontos.length === 1 && (
            <span className="mt-1 block text-sm text-fg">
              Só há um registro até agora: a linha de evolução aparece a partir do 2º registro.
            </span>
          )}
        </figcaption>
      </figure>

      <details className="text-sm">
        <summary className="cursor-pointer font-medium text-accent">Ver dados em tabela</summary>
        <TabelaRolavel rotulo="Tabela da evolução" className="mt-2">
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">Evolução da nota e das dimensões por data</caption>
            <thead>
              <tr className="border-b border-border text-muted">
                <th scope="col" className="py-1 pr-3 font-medium">
                  Data
                </th>
                <th scope="col" className="py-1 pr-3 font-medium">
                  Nota
                </th>
                <th scope="col" className="py-1 pr-3 font-medium">
                  Nível
                </th>
                {DIMENSOES_SERIE.map((d) => (
                  <th key={d} scope="col" className="py-1 pr-3 font-medium">
                    {SERIES[d].rotulo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pontos.map((p, i) => (
                <tr key={`${p.data}-${i}`} className="border-b border-border last:border-b-0">
                  <th scope="row" className="py-1 pr-3 font-normal text-fg">
                    <time dateTime={p.data}>{formatarData(p.data)}</time>
                  </th>
                  <td className="py-1 pr-3 font-semibold tabular-nums text-fg">
                    {formatarNota(p.nota)}
                  </td>
                  <td className="py-1 pr-3 text-fg">{p.nivel}</td>
                  {DIMENSOES_SERIE.map((d) => (
                    <td key={d} className="py-1 pr-3 tabular-nums text-fg">
                      {formatarNota(p[d])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </TabelaRolavel>
      </details>
    </div>
  )
}
