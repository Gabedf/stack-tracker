import { useLayoutEffect } from 'react'
import { NOME_APP } from './constants'

/**
 * Define o título da aba como "<titulo> · Painel de Stacks". Layout effect: o
 * título muda no mesmo commit que o conteúdo (como o foco nos formulários), em
 * vez de num efeito passivo que roda depois e pode chegar atrasado.
 */
export function useDocumentTitle(titulo: string) {
  useLayoutEffect(() => {
    document.title = `${titulo} · ${NOME_APP}`
  }, [titulo])
}
