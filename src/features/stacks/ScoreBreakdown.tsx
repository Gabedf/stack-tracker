import { formatarNota } from '../../components/formatacao'
import {
  COMPONENTES_NOTA,
  DEFAULT_SCORING_CONFIG,
  detalharNota,
  type ComponenteNota,
  type DetalheNota,
} from '../../domain/scoring'
import type { Stack } from '../../domain/types'

export interface ScoreBreakdownProps {
  stack: Stack
  /** Data de referência para o decaimento (default: agora). */
  hoje?: Date
}

const ROTULO_COMPONENTE: Record<ComponenteNota, string> = {
  pratica: 'Prática',
  profundidade: 'Profundidade',
  teoria: 'Teoria',
  evidencias: 'Evidências',
}

const FORMATO_PONTOS = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
})
const FORMATO_PERCENTUAL = new Intl.NumberFormat('pt-BR', {
  style: 'percent',
  maximumFractionDigits: 1,
})

/** Pontos com até 2 casas (ex.: 1.65 -> "1,65"; 3.2 -> "3,2"). */
function formatarPontos(valor: number): string {
  return FORMATO_PONTOS.format(valor)
}

function formatarPercentual(fracao: number): string {
  return FORMATO_PERCENTUAL.format(fracao)
}

function textoMeses(meses: number): string {
  return meses === 1 ? '1 mês' : `${meses} meses`
}

/** Frase do decaimento por recência, ex.: "−8% por 14 meses sem uso". */
function textoDecaimento(detalhe: Pick<DetalheNota, 'fatorDecaimento' | 'mesesSemUso'>) {
  const meses = Math.floor(detalhe.mesesSemUso)
  if (detalhe.fatorDecaimento >= 1) {
    const carencia = DEFAULT_SCORING_CONFIG.decaimento.carenciaMeses
    return `Sem perda por recência (até ${textoMeses(carencia)} sem uso não há decaimento).`
  }
  return `−${formatarPercentual(1 - detalhe.fatorDecaimento)} por ${textoMeses(meses)} sem uso`
}

/**
 * Composição da nota: valor, peso e contribuição de cada componente, nota
 * base, decaimento por recência e nota final. Tudo em texto, não só em cor.
 */
export function ScoreBreakdown({ stack, hoje }: ScoreBreakdownProps) {
  const detalhe = detalharNota(stack, { hoje })
  const temDecaimento = detalhe.fatorDecaimento < 1

  return (
    <div className="flex flex-col gap-3">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Contribuição de cada componente para a nota</caption>
        <thead className="text-xs text-muted">
          <tr className="border-b border-border">
            <th scope="col" className="py-1.5 pr-2 font-medium">
              Componente
            </th>
            <th scope="col" className="py-1.5 pr-2 text-right font-medium">
              Valor
            </th>
            <th scope="col" className="py-1.5 pr-2 text-right font-medium">
              Peso
            </th>
            <th scope="col" className="py-1.5 text-right font-medium">
              Contribuição
            </th>
          </tr>
        </thead>
        <tbody>
          {COMPONENTES_NOTA.map((c) => {
            const { valor, peso, contribuicao } = detalhe.componentes[c]
            return (
              <tr key={c} className="border-b border-border">
                <th scope="row" className="py-1.5 pr-2 font-medium text-fg">
                  {ROTULO_COMPONENTE[c]}
                </th>
                <td className="py-1.5 pr-2 text-right tabular-nums text-fg">
                  {formatarNota(valor)}
                </td>
                <td className="py-1.5 pr-2 text-right tabular-nums text-muted">
                  {formatarPercentual(peso)}
                </td>
                <td className="py-1.5 text-right font-semibold tabular-nums text-fg">
                  {formatarPontos(contribuicao)}
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" colSpan={3} className="pt-2 pr-2 font-medium text-fg">
              Nota base (soma)
            </th>
            <td className="pt-2 text-right font-semibold tabular-nums text-fg">
              {formatarPontos(detalhe.notaBase)}
            </td>
          </tr>
        </tfoot>
      </table>

      <p
        data-testid="decaimento"
        className={`rounded-theme border p-2 text-sm ${temDecaimento ? 'border-warning text-fg' : 'border-border text-muted'}`}
      >
        <span className="font-medium">Decaimento por recência: </span>
        {textoDecaimento(detalhe)}
      </p>

      <p className="flex items-baseline justify-between gap-2 text-fg">
        <span className="font-medium">Nota final</span>
        <span className="text-xl font-bold tabular-nums">
          {formatarNota(detalhe.nota)}
          <span className="text-sm font-normal text-muted"> / 10</span>
        </span>
      </p>
      {temDecaimento && (
        <p className="text-xs text-muted">
          Nota final = nota base × {formatarPontos(detalhe.fatorDecaimento)}, arredondada a 1 casa.
        </p>
      )}
    </div>
  )
}
