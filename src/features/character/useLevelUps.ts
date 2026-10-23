import { useContext } from 'react'
import { LevelUpContext, type LevelUpContextValue } from './LevelUpContext'

/** Fila de avisos de level-up. Exige um <LevelUpProvider> acima na árvore. */
export function useLevelUps(): LevelUpContextValue {
  const contexto = useContext(LevelUpContext)
  if (!contexto) {
    throw new Error('useLevelUps deve ser usado dentro de um <LevelUpProvider>.')
  }
  return contexto
}
