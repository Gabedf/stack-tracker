import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ThemeContext, type ThemeContextValue } from './ThemeContext'
import { lerTemaSalvo, proximoTema, salvarTema, type Tema } from './themes'

export interface ThemeProviderProps {
  children: ReactNode
}

/**
 * Mantém o tema ativo, aplica-o em data-theme no <html> e o persiste no localStorage.
 * O tema inicial vem do storage (se válido) ou é o padrão.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const [tema, setTemaEstado] = useState<Tema>(lerTemaSalvo)

  useEffect(() => {
    document.documentElement.dataset.theme = tema
  }, [tema])

  const setTema = useCallback((novo: Tema) => {
    setTemaEstado(novo)
    salvarTema(novo)
  }, [])

  const alternar = useCallback(() => setTema(proximoTema(tema)), [setTema, tema])

  const valor = useMemo<ThemeContextValue>(
    () => ({ tema, setTema, alternar }),
    [tema, setTema, alternar],
  )

  return <ThemeContext.Provider value={valor}>{children}</ThemeContext.Provider>
}
