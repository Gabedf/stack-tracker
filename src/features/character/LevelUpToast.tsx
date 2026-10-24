import { AnimatePresence, m, type TargetAndTransition, type Transition } from 'framer-motion'
import { useEffect, type CSSProperties } from 'react'
import { useMenosMovimento } from '../../components/motion'
import { CONFIG_TEMAS, ehTemaDeJogo, useTheme, type EstiloLevelUp } from '../../themes'
import type { AvisoLevelUp } from './LevelUpContext'
import { mensagemDoLevelUp, type EventoLevelUp } from './levelUp'

/** Tempo até o aviso sumir sozinho. */
export const DURACAO_AVISO_MS = 5000
/** Partículas decorativas: faíscas no rpg, riscos de luz no cyber (pele em cada tema). */
const PARTICULAS = 8

export interface LevelUpToastProps {
  /** Aviso exibido agora (o primeiro da fila) ou null. */
  aviso: AvisoLevelUp | null
  /** Quantos avisos esperam depois deste. */
  restantes?: number
  onFechar(chave: number): void
  duracaoMs?: number
}

function detalhe(evento: EventoLevelUp): string {
  return evento.tipo === 'stack'
    ? `${evento.nome} · ${evento.de.nome} → ${evento.para.nome}`
    : `Nível ${evento.de} → ${evento.para}`
}

interface Movimento {
  initial: TargetAndTransition | false
  animate: TargetAndTransition
  exit?: TargetAndTransition
  transition: Transition
  /** Estilo inline extra (ex.: origem da transformação). */
  style?: CSSProperties
}

/**
 * Pergaminho (RPG): entra crescendo com um leve "pulo". Sistema (cyber): abre em
 * scaleX a partir do centro, como uma janela de HUD. Sem estilo (temas que não são de
 * jogo): sobe e aparece, discreto. Sem animar, nenhum estilo se move.
 */
function movimento(estilo: EstiloLevelUp | null, animar: boolean): Movimento {
  if (!animar) return { initial: false, animate: { opacity: 1 }, transition: { duration: 0 } }
  if (estilo === 'pergaminho') {
    return {
      initial: { opacity: 0, scale: 0.6 },
      animate: { opacity: 1, scale: [0.6, 1.08, 1] },
      exit: { opacity: 0, scale: 0.9 },
      transition: { duration: 0.5, ease: 'easeOut' },
    }
  }
  if (estilo === 'sistema') {
    return {
      initial: { opacity: 0, scaleX: 0 },
      animate: { opacity: 1, scaleX: 1 },
      exit: { opacity: 0, scaleX: 0 },
      transition: { duration: 0.35, ease: 'easeOut' },
      style: { transformOrigin: 'center' },
    }
  }
  return {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 8 },
    transition: { duration: 0.2, ease: 'easeOut' },
  }
}

/**
 * Aviso de level-up ("Subiu para Sênior!"). A região aria-live fica sempre na
 * página, então cada aviso novo é anunciado. Some sozinho após `duracaoMs` ou
 * pelo botão fechar. Nos temas de jogo ganha brilho, escala e partículas; no cyber
 * ('sistema') ainda leva a faixa "◆ LEVEL UP" (renderizada só nesse estilo, decorativa,
 * aria-hidden) e o gancho do título para o glitch; no funcional é um toast simples. Com prefers-reduced-motion nada se move
 * (data-animacao="desligada").
 */
export function LevelUpToast({
  aviso,
  restantes = 0,
  onFechar,
  duracaoMs = DURACAO_AVISO_MS,
}: LevelUpToastProps) {
  const { tema } = useTheme()
  const menosMovimento = useMenosMovimento()
  // Só os temas de jogo têm estilo de level-up; null é o toast simples.
  const estilo = ehTemaDeJogo(tema) ? CONFIG_TEMAS[tema].levelUp : null
  const jogo = estilo !== null
  const animar = !menosMovimento
  const chave = aviso?.chave

  useEffect(() => {
    if (chave === undefined) return
    const timer = setTimeout(() => onFechar(chave), duracaoMs)
    return () => clearTimeout(timer)
  }, [chave, duracaoMs, onFechar])

  const { initial, animate, exit, transition, style } = movimento(estilo, animar)

  return (
    <div
      aria-live="polite"
      data-testid="levelup-avisos"
      data-print="ocultar"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex justify-center sm:inset-x-auto sm:right-6 sm:bottom-6 sm:justify-end"
    >
      <AnimatePresence mode="wait">
        {aviso && (
          <m.div
            key={aviso.chave}
            data-testid="levelup-toast"
            data-tema={tema}
            data-animacao={animar ? 'ligada' : 'desligada'}
            className={`levelup-toast pointer-events-auto relative flex w-full max-w-sm items-start gap-3 rounded-theme border bg-surface p-3 text-fg shadow-theme ${
              jogo ? 'border-accent shadow-glow' : 'border-border'
            }`}
            initial={initial}
            animate={animate}
            exit={exit}
            transition={transition}
            style={style}
          >
            {jogo && animar && (
              <span aria-hidden="true" className="levelup-particulas">
                {Array.from({ length: PARTICULAS }, (_, i) => (
                  <span
                    key={i}
                    className="levelup-particula"
                    style={{ '--particula': i } as CSSProperties}
                  />
                ))}
              </span>
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              {estilo === 'sistema' && (
                <p
                  aria-hidden="true"
                  data-levelup-faixa
                  className="font-mono text-xs tracking-widest text-accent uppercase"
                >
                  ◆ LEVEL UP
                </p>
              )}
              <p
                data-levelup-titulo
                className={`font-semibold ${jogo ? 'font-heading text-lg text-accent' : 'text-fg'}`}
              >
                {mensagemDoLevelUp(aviso.evento)}
              </p>
              <p className="text-sm text-muted">{detalhe(aviso.evento)}</p>
              {restantes > 0 && (
                <p className="text-xs text-muted">
                  {restantes === 1 ? 'mais 1 aviso' : `mais ${restantes} avisos`}
                </p>
              )}
            </div>
            <button
              type="button"
              aria-label="Fechar aviso"
              onClick={() => onFechar(aviso.chave)}
              className="-m-1 rounded-theme px-2 py-0.5 text-lg leading-none text-muted hover:bg-surface-2 hover:text-fg"
            >
              ×
            </button>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}
