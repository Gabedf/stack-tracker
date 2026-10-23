/**
 * Observa as escritas do usuário em useStacks (adicionar, atualizar, remover) e
 * enfileira os level-ups que elas causaram. Carga inicial e recarregar não
 * passam por aqui (assinarEscritas só avisa escritas salvas) e importações
 * (origem 'importacao') são ignoradas. Mostra a fila com
 * o <LevelUpToast>, um aviso por vez. Exige <StacksProvider> e <ThemeProvider>.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useStacks } from '../stacks'
import { LevelUpContext, type AvisoLevelUp, type LevelUpContextValue } from './LevelUpContext'
import { detectarLevelUps } from './levelUp'
import { LevelUpToast } from './LevelUpToast'

export interface LevelUpProviderProps {
  /** Data de referência (ou relógio) para as notas. Padrão: agora. */
  hoje?: Date | (() => Date)
  children?: ReactNode
}

export function LevelUpProvider({ hoje, children }: LevelUpProviderProps) {
  const { assinarEscritas } = useStacks()
  const [fila, setFila] = useState<AvisoLevelUp[]>([])
  const proximaChaveRef = useRef(1)

  const hojeRef = useRef(hoje)
  useEffect(() => {
    hojeRef.current = hoje
  }, [hoje])

  useEffect(
    () =>
      assinarEscritas((antes, depois, { origem }) => {
        // Importar dados não é progresso do usuário: sem avisos.
        if (origem !== 'usuario') return
        const h = hojeRef.current
        const data = typeof h === 'function' ? h() : (h ?? new Date())
        const eventos = detectarLevelUps(antes, depois, { hoje: data })
        if (eventos.length === 0) return
        const novos = eventos.map((evento) => ({ chave: proximaChaveRef.current++, evento }))
        setFila((atual) => [...atual, ...novos])
      }),
    [assinarEscritas],
  )

  const fechar = useCallback((chave: number) => {
    setFila((atual) => atual.filter((aviso) => aviso.chave !== chave))
  }, [])

  const valor = useMemo<LevelUpContextValue>(() => ({ fila, fechar }), [fila, fechar])

  return (
    <LevelUpContext.Provider value={valor}>
      {children}
      <LevelUpToast
        aviso={fila[0] ?? null}
        restantes={Math.max(0, fila.length - 1)}
        onFechar={fechar}
      />
    </LevelUpContext.Provider>
  )
}
