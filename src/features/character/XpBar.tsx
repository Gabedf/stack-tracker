import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { useMenosMovimento } from '../../components/motion'
import type { ProgressoXp } from './character'
import { formatarXp, textoFaltam } from './xpText'

export interface XpBarProps {
  progresso: ProgressoXp
  /** Nome acessível da barra (ex.: "XP do personagem", "XP de Frontend"). */
  rotulo: string
  compacta?: boolean
  className?: string
}

/** Duração do preenchimento, em segundos. */
const DURACAO_PREENCHIMENTO = 0.8

/**
 * Barra de XP dentro do nível atual (tokens xp-fill / xp-track). O valor vai em
 * XP, entre o início do nível atual e o do próximo.
 *
 * O preenchimento enche de 0 até o valor na primeira vez que a barra entra na
 * tela e anima entre valores quando o XP muda; ao trocar de nível, recomeça do
 * zero. Os atributos ARIA e o texto mostram sempre o valor final. Com
 * prefers-reduced-motion, o preenchimento aparece direto no valor
 * (data-animacao="desligada").
 */
export function XpBar({ progresso, rotulo, compacta = false, className = '' }: XpBarProps) {
  const { xp, nivel, xpDoNivelAtual, xpProximoNivel } = progresso
  const faltam = textoFaltam(progresso)
  const trilho = useRef<HTMLDivElement>(null)
  const emVista = useInView(trilho, { once: true })
  const menosMovimento = useMenosMovimento()

  const largura = `${progresso.progresso * 100}%`
  const animar = !menosMovimento

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div
        ref={trilho}
        role="progressbar"
        aria-label={rotulo}
        aria-valuemin={xpDoNivelAtual}
        aria-valuemax={xpProximoNivel}
        aria-valuenow={xp}
        aria-valuetext={`${formatarXp(xp)} XP, ${faltam}`}
        className={`w-full overflow-hidden rounded-full bg-xp-track ${compacta ? 'h-1.5' : 'h-3'}`}
      >
        <motion.div
          // Novo nível: a barra recomeça do zero e enche até o novo valor.
          key={nivel}
          data-testid="xp-preenchimento"
          data-animacao={animar ? 'ligada' : 'desligada'}
          className="h-full rounded-full bg-xp-fill"
          initial={animar ? { width: '0%' } : false}
          animate={{ width: animar && !emVista ? '0%' : largura }}
          transition={
            animar ? { duration: DURACAO_PREENCHIMENTO, ease: 'easeOut' } : { duration: 0 }
          }
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
