import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatarNota } from '../../components/formatacao'
import { TabelaRolavel } from '../../components/TabelaRolavel'
import { NOTA_MAXIMA, NOTA_MINIMA } from '../../domain/levels'
import { DEFAULT_SCORING_CONFIG } from '../../domain/scoring'
import type { Stack } from '../../domain/types'
import {
  LIMIAR_QUADRANTE,
  ROTULO_QUADRANTE,
  contarPorQuadrante,
  pontosQuadrante,
  rotulosQueCabem,
  type PontoQuadrante,
  type QuadranteId,
} from './quadrantData'

export interface TheoryPracticeQuadrantProps {
  stacks: readonly Stack[]
  /** Data de referência para a nota (decaimento). */
  hoje?: Date
  /** Valor que divide cada eixo em baixa/alta (inclusivo). Padrão: 5. */
  limiar?: number
}

const ALTURA_GRAFICO = 320
const TICKS = [0, 2, 4, 6, 8, 10]
const COR_TEXTO = 'var(--theme-text)'
const COR_TEXTO_SUAVE = 'var(--theme-text-muted)'
const COR_SURFACE = 'var(--theme-surface)'
const ESTILO_TICK = { fill: COR_TEXTO_SUAVE, fontSize: 12 }
/** A partir daqui o nome vai à esquerda do ponto, para não sair do gráfico. */
const TEORIA_ROTULO_A_ESQUERDA = 8.5

/**
 * Duas séries: stack comum (círculo) e "sei por saber" (losango, outra cor).
 * A forma é o canal principal; a cor reforça.
 */
const MARCADORES = {
  comum: { cor: 'var(--theme-chart-nota)', rotulo: 'Stack' },
  seiPorSaber: { cor: 'var(--theme-chart-teoria)', rotulo: 'Sei por saber' },
} as const

const { teoriaMinima, praticaMaxima } = DEFAULT_SCORING_CONFIG.seiPorSaber

/** Rótulo de cada quadrante, no canto de fora correspondente. */
const POSICAO_ROTULO = {
  dominio: 'insideTopRight',
  'sei-por-saber': 'insideBottomRight',
  'pratica-intuitiva': 'insideTopLeft',
  'a-explorar': 'insideBottomLeft',
} as const satisfies Record<QuadranteId, string>

function Marcador({
  seiPorSaber,
  cx,
  cy,
  raio = 5,
}: {
  seiPorSaber: boolean
  cx: number
  cy: number
  raio?: number
}) {
  if (seiPorSaber) {
    const r = raio * 1.35
    return (
      <polygon
        points={`${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`}
        fill={MARCADORES.seiPorSaber.cor}
        stroke={COR_SURFACE}
        strokeWidth={2}
      />
    )
  }
  return (
    <circle
      cx={cx}
      cy={cy}
      r={raio}
      fill={MARCADORES.comum.cor}
      stroke={COR_SURFACE}
      strokeWidth={2}
    />
  )
}

function ChaveMarcador({ seiPorSaber }: { seiPorSaber: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="shrink-0">
      <Marcador seiPorSaber={seiPorSaber} cx={8} cy={8} raio={4.5} />
    </svg>
  )
}

function TooltipQuadrante({
  active,
  payload,
}: {
  active?: boolean
  payload?: ReadonlyArray<{ payload?: unknown }>
}) {
  const ponto = payload?.[0]?.payload as PontoQuadrante | undefined
  if (!active || !ponto) return null
  return (
    <div className="rounded-theme border border-border bg-surface px-3 py-2 text-sm shadow-theme">
      <p className="flex items-center gap-1.5 font-semibold text-fg">
        <ChaveMarcador seiPorSaber={ponto.seiPorSaber} />
        {ponto.nome}
      </p>
      <dl className="mt-1 grid grid-cols-[auto_auto] gap-x-3 tabular-nums">
        <dt className="text-muted">Teoria</dt>
        <dd className="text-fg">{formatarNota(ponto.teoria)}</dd>
        <dt className="text-muted">Prática</dt>
        <dd className="text-fg">{formatarNota(ponto.pratica)}</dd>
        <dt className="text-muted">Nota</dt>
        <dd className="font-semibold text-fg">{formatarNota(ponto.nota)}</dd>
      </dl>
      <p className="mt-1 text-xs text-muted">
        {ROTULO_QUADRANTE[ponto.quadrante]}
        {ponto.seiPorSaber && ' · marcada como sei por saber'}
      </p>
    </div>
  )
}

function resumo(pontos: readonly PontoQuadrante[]): string {
  const contagem = contarPorQuadrante(pontos)
    .map(({ quadrante, quantidade }) => `${quantidade} em ${quadrante.rotulo}`)
    .join(', ')
  const marcadas = pontos.filter((p) => p.seiPorSaber).length
  const plural = pontos.length === 1 ? 'stack' : 'stacks'
  return (
    `Teoria × prática de ${pontos.length} ${plural}: ${contagem}. ` +
    `${marcadas} marcada${marcadas === 1 ? '' : 's'} como sei por saber.`
  )
}

/**
 * Dispersão teoria (X) × prática (Y), uma marca por stack, dividida em quatro
 * quadrantes pelo limiar. Clicar num ponto abre a stack; a tabela traz os
 * mesmos dados com links, para teclado e leitores de tela.
 */
export function TheoryPracticeQuadrant({
  stacks,
  hoje,
  limiar = LIMIAR_QUADRANTE,
}: TheoryPracticeQuadrantProps) {
  const navigate = useNavigate()
  const pontos = useMemo(() => pontosQuadrante(stacks, { hoje, limiar }), [stacks, hoje, limiar])
  const comRotulo = useMemo(() => rotulosQueCabem(pontos), [pontos])

  if (pontos.length === 0) {
    return (
      <p className="rounded-theme border border-dashed border-border bg-surface-2 p-4 text-center text-sm text-muted">
        Nenhuma stack para posicionar.
      </p>
    )
  }

  const areas: { id: QuadranteId; x: [number, number]; y: [number, number] }[] = [
    { id: 'dominio', x: [limiar, NOTA_MAXIMA], y: [limiar, NOTA_MAXIMA] },
    { id: 'sei-por-saber', x: [limiar, NOTA_MAXIMA], y: [NOTA_MINIMA, limiar] },
    { id: 'pratica-intuitiva', x: [NOTA_MINIMA, limiar], y: [limiar, NOTA_MAXIMA] },
    { id: 'a-explorar', x: [NOTA_MINIMA, limiar], y: [NOTA_MINIMA, limiar] },
  ]
  const temSeiPorSaber = pontos.some((p) => p.seiPorSaber)

  return (
    <div className="flex flex-col gap-3">
      <ul
        aria-label="Legenda"
        className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-fg"
      >
        <li className="inline-flex items-center gap-1.5">
          <ChaveMarcador seiPorSaber={false} />
          {MARCADORES.comum.rotulo}
        </li>
        {temSeiPorSaber && (
          <li className="inline-flex items-center gap-1.5">
            <ChaveMarcador seiPorSaber />
            {MARCADORES.seiPorSaber.rotulo}
            <span className="text-muted">
              (teoria ≥ {teoriaMinima} e prática ≤ {praticaMaxima})
            </span>
          </li>
        )}
      </ul>

      <figure className="m-0 flex flex-col gap-2">
        <div role="img" aria-label={resumo(pontos)} className="w-full">
          <ResponsiveContainer width="100%" height={ALTURA_GRAFICO}>
            <ScatterChart
              margin={{ top: 8, right: 16, bottom: 24, left: 4 }}
              accessibilityLayer={false}
            >
              {areas.map((area) => (
                <ReferenceArea
                  key={area.id}
                  x1={area.x[0]}
                  x2={area.x[1]}
                  y1={area.y[0]}
                  y2={area.y[1]}
                  fill="transparent"
                  stroke="none"
                  label={{
                    value: ROTULO_QUADRANTE[area.id],
                    position: POSICAO_ROTULO[area.id],
                    fill: COR_TEXTO_SUAVE,
                    fontSize: 11,
                  }}
                />
              ))}
              <CartesianGrid stroke="var(--theme-chart-grid)" />
              <ReferenceLine x={limiar} stroke="var(--theme-border)" strokeWidth={1} />
              <ReferenceLine y={limiar} stroke="var(--theme-border)" strokeWidth={1} />
              <XAxis
                type="number"
                dataKey="teoria"
                name="Teoria"
                domain={[NOTA_MINIMA, NOTA_MAXIMA]}
                ticks={TICKS}
                allowDataOverflow
                tick={ESTILO_TICK}
                tickLine={false}
                axisLine={{ stroke: 'var(--theme-border)' }}
                label={{
                  value: 'Teoria',
                  position: 'insideBottom',
                  offset: -16,
                  fill: COR_TEXTO_SUAVE,
                  fontSize: 12,
                }}
              />
              <YAxis
                type="number"
                dataKey="pratica"
                name="Prática"
                domain={[NOTA_MINIMA, NOTA_MAXIMA]}
                ticks={TICKS}
                allowDataOverflow
                width={40}
                tick={ESTILO_TICK}
                tickLine={false}
                axisLine={false}
                label={{
                  value: 'Prática',
                  angle: -90,
                  position: 'insideLeft',
                  offset: 8,
                  fill: COR_TEXTO_SUAVE,
                  fontSize: 12,
                }}
              />
              <Tooltip
                content={({ active, payload }) => (
                  <TooltipQuadrante active={active} payload={payload} />
                )}
                cursor={false}
                isAnimationActive={false}
              />
              <Scatter
                data={pontos}
                name="Stacks"
                isAnimationActive={false}
                shape={(props: { cx?: number; cy?: number; payload?: unknown }) => {
                  const ponto = props.payload as PontoQuadrante | undefined
                  if (props.cx == null || props.cy == null || !ponto) return <g />
                  const aEsquerda = ponto.teoria >= TEORIA_ROTULO_A_ESQUERDA
                  return (
                    <g
                      data-stack={ponto.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/stacks/${ponto.id}`)}
                    >
                      {/* Área de clique maior que o marcador. */}
                      <circle cx={props.cx} cy={props.cy} r={12} fill="transparent" />
                      <Marcador seiPorSaber={ponto.seiPorSaber} cx={props.cx} cy={props.cy} />
                      {comRotulo.has(ponto.id) && (
                        <text
                          x={props.cx + (aEsquerda ? -10 : 10)}
                          y={props.cy}
                          textAnchor={aEsquerda ? 'end' : 'start'}
                          dominantBaseline="central"
                          fill={COR_TEXTO}
                          fontSize={12}
                        >
                          {ponto.nome}
                        </text>
                      )}
                    </g>
                  )
                }}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <figcaption className="text-xs text-muted">
          Teoria e prática de 0 a 10; as linhas em {formatarNota(limiar)} dividem os quadrantes.
          Clique num ponto para abrir a stack.
        </figcaption>
      </figure>

      <details className="text-sm">
        <summary className="cursor-pointer py-1 font-medium text-accent">
          Ver dados em tabela
        </summary>
        <TabelaRolavel rotulo="Tabela teoria x prática" className="mt-2">
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">Teoria, prática e quadrante de cada stack</caption>
            <thead>
              <tr className="border-b border-border text-muted">
                <th scope="col" className="py-1 pr-3 font-medium">
                  Stack
                </th>
                <th scope="col" className="py-1 pr-3 font-medium">
                  Teoria
                </th>
                <th scope="col" className="py-1 pr-3 font-medium">
                  Prática
                </th>
                <th scope="col" className="py-1 pr-3 font-medium">
                  Nota
                </th>
                <th scope="col" className="py-1 pr-3 font-medium">
                  Quadrante
                </th>
                <th scope="col" className="py-1 pr-3 font-medium">
                  Marcada sei por saber
                </th>
              </tr>
            </thead>
            <tbody>
              {pontos.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-b-0">
                  <th scope="row" className="py-1 pr-3 font-normal">
                    <Link
                      to={`/stacks/${p.id}`}
                      className="inline-flex min-h-6 items-center text-accent underline underline-offset-2"
                    >
                      {p.nome}
                    </Link>
                  </th>
                  <td className="py-1 pr-3 tabular-nums text-fg">{formatarNota(p.teoria)}</td>
                  <td className="py-1 pr-3 tabular-nums text-fg">{formatarNota(p.pratica)}</td>
                  <td className="py-1 pr-3 font-semibold tabular-nums text-fg">
                    {formatarNota(p.nota)}
                  </td>
                  <td className="py-1 pr-3 text-fg">{ROTULO_QUADRANTE[p.quadrante]}</td>
                  <td className="py-1 pr-3 text-fg">{p.seiPorSaber ? 'Sim' : 'Não'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TabelaRolavel>
      </details>
    </div>
  )
}
