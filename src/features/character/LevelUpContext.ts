import { createContext } from 'react'
import type { EventoLevelUp } from './levelUp'

/** Evento na fila de avisos, com chave única. */
export interface AvisoLevelUp {
  chave: number
  evento: EventoLevelUp
}

export interface LevelUpContextValue {
  /** Avisos ainda não fechados, do mais antigo para o mais novo. */
  fila: AvisoLevelUp[]
  /** Tira o aviso da fila. */
  fechar(chave: number): void
}

export const LevelUpContext = createContext<LevelUpContextValue | null>(null)
