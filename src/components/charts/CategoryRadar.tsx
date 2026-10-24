import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { NOTA_MAXIMA, NOTA_MINIMA } from '../../domain/levels'
import { formatarNota } from '../formatacao'
import {
  formaGraficoCategorias,
  resumoCategorias,
  valorNaEscala,
  type ItemCategoria,
} from './categoryChartData'

export interface CategoryRadarProps {
  itens: readonly ItemCategoria[]
  /** Nome do valor exibido (ex.: "Nota média"); vai para o resumo, tooltip e tabela. */
  rotuloValor?: string
  /** Cor da série (um token do tema). */
  cor?: string
  /** Categoria em destaque. */
  selecionada?: string | null
  /** Se informado, cada categoria vira clicável (no gráfico e numa lista de botões). */
  onSelecionar?: (categoria: string) => void
}

const ALTURA_RADAR = 300
const ALTURA_BARRA = 36
const ESPESSURA_BARRA = 16
const TICKS = [0, 2, 4, 6, 8, 10]
const COR_TEXTO = 'var(--theme-text)'
const COR_TEXTO_SUAVE = 'var(--theme-text-muted)'
const COR_SURFACE = 'var(--theme-surface)'
const COR_GRADE = 'var(--theme-chart-grid)'
const ESTILO_TICK = { fill: COR_TEXTO_SUAVE, fontSize: 12 }
/** Opacidade das categorias fora de foco quando há uma selecionada. */
const OPACIDADE_FORA_DE_FOCO = 0.35

interface ItemNormalizado extends ItemCategoria {
  valor: number
}

function TooltipCategoria({
  active,
  payload,
  rotuloValor,
}: {
  active?: boolean
  payload?: ReadonlyArray<{ payload?: unknown }>
  rotuloValor: string
}) {
  const item = payload?.[0]?.payload as ItemNormalizado | undefined
  if (!active || !item) return null
  return (
    <div className="rounded-theme border border-border bg-surface px-3 py-2 text-sm shadow-theme">
      <p className="text-xs text-muted">{item.categoria}</p>
      <p>
        <span className="font-semibold tabular-nums text-fg">{formatarNota(item.valor)}</span>{' '}
        <span className="text-muted">{rotuloValor}</span>
      </p>
      {item.quantidade != null && (
        <p className="text-xs text-muted">
          {item.quantidade} {item.quantidade === 1 ? 'stack' : 'stacks'}
        </p>
      )}
    </div>
  )
}

/**
 * Valor por categoria numa escala fixa de 0 a 10. Radar (polígono de N lados)
 * de 3 a 8 categorias; fora dessa faixa, barras horizontais (ver
 * formaGraficoCategorias). Reutilizável: o dashboard e a ficha RPG usam.
 *
 * A camada acessível é o resumo no aria-label e a tabela; com onSelecionar, uma
 * lista de botões dá acesso por teclado ao mesmo clique do gráfico.
 */
export function CategoryRadar({
  itens,
  rotuloValor = 'Valor',
  cor = 'var(--theme-chart-nota)',
  selecionada = null,
  onSelecionar,
}: CategoryRadarProps) {
  if (itens.length === 0) {
    return (
      <p className="rounded-theme border border-dashed border-border bg-surface-2 p-4 text-center text-sm text-muted">
        Nenhuma categoria para mostrar.
      </p>
    )
  }

  const dados: ItemNormalizado[] = itens.map((i) => ({ ...i, valor: valorNaEscala(i.valor) }))
  const forma = formaGraficoCategorias(dados.length)
  const temQuantidade = dados.some((i) => i.quantidade != null)
  const clicavel = onSelecionar != null
  const emFoco = (categoria: string) => selecionada == null || selecionada === categoria
  const selecionar = (categoria: string) => onSelecionar?.(categoria)
  const tooltip = (
    <Tooltip
      content={({ active, payload }) => (
        <TooltipCategoria active={active} payload={payload} rotuloValor={rotuloValor} />
      )}
      cursor={false}
      isAnimationActive={false}
    />
  )

  const grafico =
    forma === 'radar' ? (
      <ResponsiveContainer width="100%" height={ALTURA_RADAR}>
        <RadarChart
          data={dados}
          outerRadius="70%"
          margin={{ top: 16, right: 40, bottom: 16, left: 40 }}
          accessibilityLayer={false}
        >
          <PolarGrid stroke={COR_GRADE} />
          <PolarAngleAxis
            dataKey="categoria"
            tick={(props: {
              x?: number | string
              y?: number | string
              textAnchor?: string
              payload?: { value?: string }
            }) => {
              const categoria = String(props.payload?.value ?? '')
              const destaque = selecionada === categoria
              return (
                <text
                  x={Number(props.x)}
                  y={Number(props.y)}
                  textAnchor={props.textAnchor as 'start' | 'middle' | 'end' | undefined}
                  dominantBaseline="central"
                  fill={destaque ? COR_TEXTO : COR_TEXTO_SUAVE}
                  fontSize={12}
                  fontWeight={destaque ? 700 : 400}
                  style={clicavel ? { cursor: 'pointer' } : undefined}
                  onClick={clicavel ? () => selecionar(categoria) : undefined}
                >
                  {categoria}
                </text>
              )
            }}
          />
          <PolarRadiusAxis
            domain={[NOTA_MINIMA, NOTA_MAXIMA]}
            ticks={TICKS}
            angle={90}
            tick={{ ...ESTILO_TICK, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            allowDataOverflow
          />
          {tooltip}
          <Radar
            dataKey="valor"
            name={rotuloValor}
            stroke={cor}
            strokeWidth={2}
            strokeLinejoin="round"
            fill={cor}
            fillOpacity={0.1}
            isAnimationActive={false}
            dot={(props: { cx?: number; cy?: number; index?: number; payload?: unknown }) => {
              if (props.cx == null || props.cy == null) return <g key={`ponto-${props.index}`} />
              const item = dados[props.index ?? 0]
              const destaque = selecionada === item?.categoria
              return (
                <g
                  key={`ponto-${props.index}`}
                  style={clicavel ? { cursor: 'pointer' } : undefined}
                  onClick={clicavel && item ? () => selecionar(item.categoria) : undefined}
                >
                  {clicavel && <circle cx={props.cx} cy={props.cy} r={12} fill="transparent" />}
                  <circle
                    cx={props.cx}
                    cy={props.cy}
                    r={destaque ? 6 : 4}
                    fill={cor}
                    stroke={COR_SURFACE}
                    strokeWidth={2}
                  />
                </g>
              )
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    ) : (
      <ResponsiveContainer width="100%" height={dados.length * ALTURA_BARRA + 32}>
        <BarChart
          data={dados}
          layout="vertical"
          margin={{ top: 4, right: 40, bottom: 4, left: 0 }}
          accessibilityLayer={false}
        >
          <CartesianGrid horizontal={false} stroke={COR_GRADE} />
          <XAxis
            type="number"
            domain={[NOTA_MINIMA, NOTA_MAXIMA]}
            ticks={TICKS}
            allowDataOverflow
            tick={ESTILO_TICK}
            tickLine={false}
            axisLine={{ stroke: 'var(--theme-border)' }}
          />
          <YAxis
            type="category"
            dataKey="categoria"
            width={112}
            tick={ESTILO_TICK}
            tickLine={false}
            axisLine={false}
          />
          {tooltip}
          <Bar
            dataKey="valor"
            name={rotuloValor}
            barSize={ESPESSURA_BARRA}
            radius={[0, 4, 4, 0]}
            isAnimationActive={false}
          >
            {dados.map((item) => (
              <Cell
                key={item.categoria}
                fill={cor}
                fillOpacity={emFoco(item.categoria) ? 1 : OPACIDADE_FORA_DE_FOCO}
                style={clicavel ? { cursor: 'pointer' } : undefined}
                onClick={clicavel ? () => selecionar(item.categoria) : undefined}
              />
            ))}
            <LabelList
              dataKey="valor"
              position="right"
              formatter={(v: unknown) => formatarNota(Number(v))}
              fill={COR_TEXTO}
              fontSize={12}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    )

  return (
    <div className="flex flex-col gap-3" data-forma={forma}>
      <figure className="m-0">
        <div role="img" aria-label={resumoCategorias(dados, rotuloValor)} className="w-full">
          {grafico}
        </div>
      </figure>

      {clicavel && (
        <ul aria-label="Categorias" className="flex flex-wrap gap-2">
          {dados.map((item) => (
            <li key={item.categoria}>
              <button
                type="button"
                aria-pressed={selecionada === item.categoria}
                onClick={() => selecionar(item.categoria)}
                className={
                  'inline-flex items-center gap-2 rounded-theme border px-2 py-1 text-sm ' +
                  (selecionada === item.categoria
                    ? 'border-fg bg-surface-2 text-fg'
                    : 'border-control bg-surface text-fg hover:bg-surface-2')
                }
              >
                <span className="font-medium">{item.categoria}</span>
                <span className="tabular-nums text-muted">{formatarNota(item.valor)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <details className="text-sm">
        <summary className="cursor-pointer font-medium text-accent">Ver dados em tabela</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">{rotuloValor} por categoria</caption>
            <thead>
              <tr className="border-b border-border text-muted">
                <th scope="col" className="py-1 pr-3 font-medium">
                  Categoria
                </th>
                <th scope="col" className="py-1 pr-3 font-medium">
                  {rotuloValor}
                </th>
                {temQuantidade && (
                  <th scope="col" className="py-1 pr-3 font-medium">
                    Stacks
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {dados.map((item) => (
                <tr key={item.categoria} className="border-b border-border last:border-b-0">
                  <th scope="row" className="py-1 pr-3 font-normal text-fg">
                    {item.categoria}
                  </th>
                  <td className="py-1 pr-3 font-semibold tabular-nums text-fg">
                    {formatarNota(item.valor)}
                  </td>
                  {temQuantidade && (
                    <td className="py-1 pr-3 tabular-nums text-fg">{item.quantidade ?? '—'}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}
