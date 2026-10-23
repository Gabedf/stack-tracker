import { useSyncExternalStore } from 'react'

/** Media query de quem pediu menos movimento no sistema. */
export const CONSULTA_MENOS_MOVIMENTO = '(prefers-reduced-motion: reduce)'

function consulta(): MediaQueryList | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null
  return window.matchMedia(CONSULTA_MENOS_MOVIMENTO)
}

function assinar(avisar: () => void): () => void {
  const mql = consulta()
  mql?.addEventListener('change', avisar)
  return () => mql?.removeEventListener('change', avisar)
}

const ler = () => consulta()?.matches ?? false
const lerNoServidor = () => false

/**
 * true quando o usuário pediu menos movimento (prefers-reduced-motion: reduce).
 * Acompanha mudanças da preferência. Complementa o <MotionConfig
 * reducedMotion="user"> da raiz, que só desliga transformações: com este hook os
 * componentes pulam direto para o valor final (largura, opacidade, partículas).
 */
export function useMenosMovimento(): boolean {
  return useSyncExternalStore(assinar, ler, lerNoServidor)
}
