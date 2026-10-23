import { useEffect } from 'react'
import { NOME_APP } from './constants'

/** Define o título da aba como "<titulo> · Painel de Stacks". */
export function useDocumentTitle(titulo: string) {
  useEffect(() => {
    document.title = `${titulo} · ${NOME_APP}`
  }, [titulo])
}
