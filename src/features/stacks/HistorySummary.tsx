import { formatarData, formatarNota } from '../../components/formatacao'
import type { RegistroHistorico } from '../../domain/types'

export interface HistorySummaryProps {
  historico: readonly RegistroHistorico[]
}

function textoQuantidade(qtd: number): string {
  return qtd === 1 ? '1 snapshot' : `${qtd} snapshots`
}

/** Resumo textual do histórico: quantidade, data do último e lista do mais recente ao mais antigo. */
export function HistorySummary({ historico }: HistorySummaryProps) {
  if (historico.length === 0) {
    return <p className="text-sm text-muted">Nenhum snapshot registrado ainda.</p>
  }

  const ultimo = historico[historico.length - 1]
  const recentes = [...historico].reverse()

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-fg">
        <span className="font-semibold">{textoQuantidade(historico.length)}</span>
        <span className="text-muted"> · último em </span>
        <time dateTime={ultimo.data} className="font-semibold">
          {formatarData(ultimo.data)}
        </time>
      </p>
      <ol aria-label="Snapshots do histórico" className="flex flex-col gap-1 text-sm">
        {recentes.map((registro, i) => (
          <li
            key={`${registro.data}-${i}`}
            className="flex justify-between gap-3 border-b border-border py-1 last:border-b-0"
          >
            <time dateTime={registro.data} className="text-muted">
              {formatarData(registro.data)}
            </time>
            <span className="tabular-nums text-fg">nota {formatarNota(registro.nota)}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
