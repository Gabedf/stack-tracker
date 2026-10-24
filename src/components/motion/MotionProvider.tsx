import { LazyMotion, MotionConfig, type MotionConfigProps } from 'framer-motion'
import type { ReactNode } from 'react'

const carregarRecursos = () => import('./motionFeatures').then((m) => m.default)

export interface MotionProviderProps {
  children?: ReactNode
  /** Padrão "user": com prefers-reduced-motion, o Framer Motion não anima transformações. */
  reducedMotion?: MotionConfigProps['reducedMotion']
}

/**
 * Raiz das animações. Os componentes usam `m` (sem recursos embutidos) e o
 * LazyMotion baixa o motor de animação (domAnimation) num chunk à parte, fora
 * do caminho crítico. `strict` acusa erro se alguém usar `motion` por engano.
 */
export function MotionProvider({ children, reducedMotion = 'user' }: MotionProviderProps) {
  return (
    <LazyMotion features={carregarRecursos} strict>
      <MotionConfig reducedMotion={reducedMotion}>{children}</MotionConfig>
    </LazyMotion>
  )
}
