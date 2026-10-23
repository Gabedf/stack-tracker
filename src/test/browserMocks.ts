/**
 * APIs de navegador que o jsdom não tem: matchMedia e IntersectionObserver.
 * Instaladas pelo setup antes de cada arquivo de teste.
 */

import { CONSULTA_MENOS_MOVIMENTO } from '../components/motion'

let menosMovimento = false
const ouvintes = new Set<(evento: MediaQueryListEvent) => void>()

/** Liga/desliga o prefers-reduced-motion: reduce simulado (avisa quem assina). */
export function simularMenosMovimento(ligado: boolean): void {
  if (menosMovimento === ligado) return
  menosMovimento = ligado
  const evento = { matches: ligado, media: CONSULTA_MENOS_MOVIMENTO } as MediaQueryListEvent
  for (const ouvinte of [...ouvintes]) ouvinte(evento)
}

function matchMediaFake(query: string): MediaQueryList {
  const ehMovimento = query.replace(/\s+/g, '') === CONSULTA_MENOS_MOVIMENTO.replace(/\s+/g, '')
  const ehMovimentoGenerico = query.replace(/\s+/g, '') === '(prefers-reduced-motion)'
  const assinar = (_: string, ouvinte: EventListenerOrEventListenerObject | null) => {
    if (typeof ouvinte === 'function' && (ehMovimento || ehMovimentoGenerico)) {
      ouvintes.add(ouvinte as (evento: MediaQueryListEvent) => void)
    }
  }
  const cancelar = (_: string, ouvinte: EventListenerOrEventListenerObject | null) => {
    ouvintes.delete(ouvinte as (evento: MediaQueryListEvent) => void)
  }
  return {
    media: query,
    get matches() {
      return (ehMovimento || ehMovimentoGenerico) && menosMovimento
    },
    onchange: null,
    addEventListener: assinar,
    removeEventListener: cancelar,
    addListener: (ouvinte) => assinar('change', ouvinte as EventListener),
    removeListener: (ouvinte) => cancelar('change', ouvinte as EventListener),
    dispatchEvent: () => false,
  } as MediaQueryList
}

/** Tudo "entra na tela" assim que é observado. */
class IntersectionObserverFake implements IntersectionObserver {
  readonly root = null
  readonly rootMargin = '0px'
  readonly thresholds = [0]
  private readonly callback: IntersectionObserverCallback
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
  }
  observe(alvo: Element): void {
    const retangulo = alvo.getBoundingClientRect()
    const entrada = {
      target: alvo,
      isIntersecting: true,
      intersectionRatio: 1,
      boundingClientRect: retangulo,
      intersectionRect: retangulo,
      rootBounds: null,
      time: 0,
    } as IntersectionObserverEntry
    this.callback([entrada], this)
  }
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
}

export function instalarMocksDoNavegador(): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: matchMediaFake,
  })
  Object.defineProperty(window, 'IntersectionObserver', {
    configurable: true,
    writable: true,
    value: IntersectionObserverFake,
  })
  Object.defineProperty(globalThis, 'IntersectionObserver', {
    configurable: true,
    writable: true,
    value: IntersectionObserverFake,
  })
}
