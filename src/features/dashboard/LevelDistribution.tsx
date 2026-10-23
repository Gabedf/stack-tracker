import { Link } from 'react-router'
import { criteriosParaUrl } from '../stacks/stackFiltering'
import type { QuantidadePorNivel } from './dashboardStats'

export interface LevelDistributionProps {
  distribuicao: readonly QuantidadePorNivel[]
  total: number
}

function textoStacks(qtd: number): string {
  return qtd === 1 ? 'stack' : 'stacks'
}

/**
 * Barras horizontais finas com a quantidade de stacks por nível. Uma série só
 * (tokens de progresso xp-fill sobre xp-track) e o número sempre visível ao lado.
 * Faixas com stacks levam à lista filtrada pelo nível.
 */
export function LevelDistribution({ distribuicao, total }: LevelDistributionProps) {
  return (
    <ul aria-label="Stacks por nível" className="flex flex-col gap-1">
      {distribuicao.map(({ nivel, quantidade }) => {
        const percentual = total > 0 ? (quantidade / total) * 100 : 0
        const conteudo = (
          <>
            <span className="text-sm text-fg">{nivel.nome}</span>
            <span aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-xp-track">
              <span
                className="block h-full rounded-full bg-xp-fill"
                style={{ width: `${percentual}%` }}
              />
            </span>
            <span className="text-right text-sm font-semibold tabular-nums text-fg">
              {quantidade}
              <span className="sr-only"> {textoStacks(quantidade)}</span>
            </span>
          </>
        )
        const classe =
          'grid grid-cols-[6.5rem_1fr_2rem] items-center gap-3 rounded-theme px-2 py-1.5'

        return (
          <li key={nivel.id} data-nivel={nivel.id}>
            {quantidade > 0 ? (
              <Link
                to={`/stacks?${criteriosParaUrl({ nivel: nivel.id })}`}
                className={`${classe} hover:bg-surface-2`}
              >
                {conteudo}
              </Link>
            ) : (
              <div className={classe}>{conteudo}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
