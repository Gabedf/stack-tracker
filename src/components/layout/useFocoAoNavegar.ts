import { useEffect, useRef, type RefObject } from 'react'
import { useLocation } from 'react-router'

/** Foca o h1 dentro de `regiao` (tornando-o focável só por script). */
function focarTitulo(regiao: HTMLElement): boolean {
  const titulo = regiao.querySelector('h1')
  if (!titulo) return false
  if (!titulo.hasAttribute('tabindex')) titulo.setAttribute('tabindex', '-1')
  titulo.focus()
  return true
}

/**
 * Ao trocar de página (pathname), move o foco para o h1 da nova view: o leitor
 * de tela anuncia o título e o próximo Tab segue dali, não do link clicado.
 * Na primeira renderização não mexe no foco. As views são lazy: se o h1 ainda
 * não está no DOM (Suspense mostrando "Carregando…"), espera ele aparecer.
 * Mudanças só de query string (filtros) não movem o foco.
 */
export function useFocoAoNavegar(regiao: RefObject<HTMLElement | null>) {
  const { pathname } = useLocation()
  const anterior = useRef(pathname)

  useEffect(() => {
    if (anterior.current === pathname) return
    anterior.current = pathname
    const alvo = regiao.current
    if (!alvo || focarTitulo(alvo)) return

    const observador = new MutationObserver(() => {
      if (focarTitulo(alvo)) observador.disconnect()
    })
    observador.observe(alvo, { childList: true, subtree: true })
    return () => observador.disconnect()
  }, [pathname, regiao])
}
