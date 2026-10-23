import { createContext } from 'react'
import type { Tema } from './themes'

export interface ThemeContextValue {
  tema: Tema
  setTema(tema: Tema): void
  /** Troca para o próximo tema da lista. */
  alternar(): void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)
