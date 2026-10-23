import { useContext } from 'react'
import { ThemeContext, type ThemeContextValue } from './ThemeContext'

/** Tema ativo e ações para trocá-lo. Exige um <ThemeProvider> acima na árvore. */
export function useTheme(): ThemeContextValue {
  const contexto = useContext(ThemeContext)
  if (!contexto) {
    throw new Error('useTheme deve ser usado dentro de um <ThemeProvider>.')
  }
  return contexto
}
