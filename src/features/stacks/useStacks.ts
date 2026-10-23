import { useContext } from 'react'
import { StacksContext, type StacksContextValue } from './StacksContext'

/** Estado e operações das stacks. Exige um <StacksProvider> acima na árvore. */
export function useStacks(): StacksContextValue {
  const contexto = useContext(StacksContext)
  if (!contexto) {
    throw new Error('useStacks deve ser usado dentro de um <StacksProvider>.')
  }
  return contexto
}
