import { NOTA_MAXIMA, NOTA_MINIMA } from '../domain/levels'
import type { Nota } from '../domain/types'
import { formatarNota } from './formatacao'

export interface ScoreBarProps {
  /** Valor de 0 a 10; fora da faixa (ou NaN) é limitado. */
  valor: Nota
  /** Rótulo visível e nome acessível do meter (ex.: "Nota", "Teoria"). */
  rotulo: string
  /** Variante de uma linha, mais fina, para dimensões. */
  compacta?: boolean
  className?: string
}

function limitar(valor: Nota): Nota {
  if (Number.isNaN(valor)) return NOTA_MINIMA
  return Math.min(NOTA_MAXIMA, Math.max(NOTA_MINIMA, valor))
}

/**
 * Meter de 0 a 10. Preenchimento e trilho vêm dos tokens de barra de progresso
 * (xp-fill / xp-track, contraste >= 3:1 entre si em todo tema). O texto visível
 * é redundante com o meter (aria-label + aria-valuetext) e fica oculto para
 * leitores de tela.
 */
export function ScoreBar({ valor, rotulo, compacta = false, className = '' }: ScoreBarProps) {
  const v = limitar(valor)
  const texto = formatarNota(v)
  const percentual = ((v - NOTA_MINIMA) / (NOTA_MAXIMA - NOTA_MINIMA)) * 100

  const barra = (
    <div
      role="meter"
      aria-label={rotulo}
      aria-valuemin={NOTA_MINIMA}
      aria-valuemax={NOTA_MAXIMA}
      aria-valuenow={v}
      aria-valuetext={`${texto} de ${NOTA_MAXIMA}`}
      className={`w-full overflow-hidden rounded-full bg-xp-track ${compacta ? 'h-1.5' : 'h-2.5'}`}
    >
      <div className="h-full rounded-full bg-xp-fill" style={{ width: `${percentual}%` }} />
    </div>
  )

  if (compacta) {
    return (
      <div className={`grid grid-cols-[6.5rem_1fr_2.5rem] items-center gap-2 ${className}`}>
        <span aria-hidden="true" className="truncate text-xs text-muted">
          {rotulo}
        </span>
        {barra}
        <span aria-hidden="true" className="text-right text-xs font-medium tabular-nums text-fg">
          {texto}
        </span>
      </div>
    )
  }

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div aria-hidden="true" className="flex items-baseline justify-between gap-2">
        <span className="text-sm text-muted">{rotulo}</span>
        <span className="text-lg font-semibold text-fg">
          {texto}
          <span className="text-sm font-normal text-muted"> / {NOTA_MAXIMA}</span>
        </span>
      </div>
      {barra}
    </div>
  )
}
