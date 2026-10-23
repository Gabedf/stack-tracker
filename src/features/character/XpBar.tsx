import type { ProgressoXp } from './character'
import { formatarXp, textoFaltam } from './xpText'

export interface XpBarProps {
  progresso: ProgressoXp
  /** Nome acessível da barra (ex.: "XP do personagem", "XP de Frontend"). */
  rotulo: string
  compacta?: boolean
  className?: string
}

/**
 * Barra de XP dentro do nível atual (tokens xp-fill / xp-track). O valor vai em
 * XP, entre o início do nível atual e o do próximo.
 */
export function XpBar({ progresso, rotulo, compacta = false, className = '' }: XpBarProps) {
  const { xp, xpDoNivelAtual, xpProximoNivel } = progresso
  const faltam = textoFaltam(progresso)

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div
        role="progressbar"
        aria-label={rotulo}
        aria-valuemin={xpDoNivelAtual}
        aria-valuemax={xpProximoNivel}
        aria-valuenow={xp}
        aria-valuetext={`${formatarXp(xp)} XP, ${faltam}`}
        className={`w-full overflow-hidden rounded-full bg-xp-track ${compacta ? 'h-1.5' : 'h-3'}`}
      >
        <div
          className="h-full rounded-full bg-xp-fill"
          style={{ width: `${progresso.progresso * 100}%` }}
        />
      </div>
      <p
        className={`flex flex-wrap justify-between gap-x-3 text-muted ${compacta ? 'text-xs' : 'text-sm'}`}
      >
        <span className="tabular-nums">
          {formatarXp(xp)} / {formatarXp(xpProximoNivel)} XP
        </span>
        <span>{faltam}</span>
      </p>
    </div>
  )
}
