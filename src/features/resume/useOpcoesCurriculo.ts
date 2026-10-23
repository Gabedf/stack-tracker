import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_OPCOES_CURRICULO, type OpcoesCurriculo } from './resumeOptions'
import { lerOpcoesSalvas, salvarOpcoes } from './resumeStorage'

export interface ControleOpcoesCurriculo {
  opcoes: OpcoesCurriculo
  alterar(mudancas: Partial<OpcoesCurriculo>): void
  /** Volta às opções padrão. */
  restaurar(): void
}

/** Opções do currículo, lidas do localStorage na montagem e salvas a cada mudança. */
export function useOpcoesCurriculo(): ControleOpcoesCurriculo {
  const [opcoes, setOpcoes] = useState<OpcoesCurriculo>(lerOpcoesSalvas)

  useEffect(() => {
    salvarOpcoes(opcoes)
  }, [opcoes])

  const alterar = useCallback((mudancas: Partial<OpcoesCurriculo>) => {
    setOpcoes((atual) => ({ ...atual, ...mudancas }))
  }, [])

  const restaurar = useCallback(() => setOpcoes({ ...DEFAULT_OPCOES_CURRICULO }), [])

  return { opcoes, alterar, restaurar }
}
