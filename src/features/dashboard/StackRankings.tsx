import { Link } from 'react-router'
import { formatarNota } from '../../components/formatacao'
import { LevelBadge } from '../../components/LevelBadge'
import type { StackComNota, StackEsfriando } from './dashboardStats'

const CLASSE_LINK =
  'inline-flex min-h-6 items-center rounded-theme font-medium text-fg hover:text-accent hover:underline'
const CLASSE_ITEM = 'flex flex-wrap items-center gap-x-3 gap-y-1 py-2'

function LinkStack({ id, nome }: { id: string; nome: string }) {
  return (
    <Link to={`/stacks/${encodeURIComponent(id)}`} className={CLASSE_LINK}>
      {nome}
    </Link>
  )
}

export interface TopStacksListProps {
  itens: readonly StackComNota[]
}

/** Ranking das stacks de maior nota. */
export function TopStacksList({ itens }: TopStacksListProps) {
  return (
    <ol aria-label="Top 3" className="flex flex-col divide-y divide-border">
      {itens.map(({ stack, nota }, i) => (
        <li key={stack.id} className={CLASSE_ITEM}>
          <span aria-hidden="true" className="w-5 text-sm font-semibold tabular-nums text-muted">
            {i + 1}.
          </span>
          <span className="min-w-0 flex-1">
            <LinkStack id={stack.id} nome={stack.nome} />
          </span>
          <LevelBadge nota={nota} />
          <span className="w-10 text-right font-semibold tabular-nums text-fg">
            <span className="sr-only">Nota: </span>
            {formatarNota(nota)}
          </span>
        </li>
      ))}
    </ol>
  )
}

export interface CoolingStacksListProps {
  itens: readonly StackEsfriando[]
}

function textoMeses(meses: number): string {
  const inteiros = Math.floor(meses)
  return inteiros === 1 ? '1 mês' : `${inteiros} meses`
}

/** Stacks perdendo nota por falta de uso, da maior perda para a menor. */
export function CoolingStacksList({ itens }: CoolingStacksListProps) {
  if (itens.length === 0) {
    return <p className="text-sm text-muted">Nenhuma stack perdendo nota por falta de uso.</p>
  }

  return (
    <ul aria-label="Esfriando" className="flex flex-col divide-y divide-border">
      {itens.map(({ stack, nota, notaBase, perda, mesesSemUso }) => (
        <li key={stack.id} className={CLASSE_ITEM}>
          <span className="flex min-w-0 flex-1 flex-col">
            <LinkStack id={stack.id} nome={stack.nome} />
            <span className="text-xs text-muted">Sem uso há {textoMeses(mesesSemUso)}</span>
          </span>
          <span className="text-sm tabular-nums text-fg">
            <span className="sr-only">Nota sem decaimento: </span>
            <span className="text-muted">{formatarNota(notaBase)}</span>
            <span aria-hidden="true" className="text-muted">
              {' → '}
            </span>
            <span className="sr-only">, nota atual: </span>
            <span className="font-semibold">{formatarNota(nota)}</span>
            <span className="ml-1 text-muted">(−{Math.round(perda * 100)}%)</span>
          </span>
        </li>
      ))}
    </ul>
  )
}
