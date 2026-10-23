import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { Stack, StacksFile } from '../../domain/types'
import type { StorageAdapter } from '../../storage'
import { StacksProvider, useStacks } from '../stacks'
import { ThemeProvider } from '../../themes'
import { LevelUpProvider } from './LevelUpProvider'
import { useLevelUps } from './useLevelUps'

const HOJE = new Date(2026, 9, 23)

/** Nota = 0,9 × valor (sem evidências nem decaimento). */
function stack(id: string, valor: number): Stack {
  return {
    id,
    nome: id.toUpperCase(),
    categoria: 'Frontend',
    tags: [],
    dimensoes: { teoria: valor, pratica: valor, profundidade: valor, ultimoUso: '2026-10-23' },
    experiencia: { tipo: 'estudo', meses: 1 },
    evidencias: [],
    historico: [],
  }
}

function adapterCom(stacks: Stack[]): StorageAdapter {
  let dados: StacksFile = { versao: 1, stacks }
  return {
    carregar: vi.fn(async () => structuredClone(dados)),
    salvar: vi.fn(async (novo: StacksFile) => {
      dados = structuredClone(novo)
      return structuredClone(dados)
    }),
  }
}

async function montar(stacks: Stack[]) {
  const adapter = adapterCom(stacks)
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ThemeProvider>
      <StacksProvider adapter={adapter} hoje={HOJE}>
        <LevelUpProvider hoje={HOJE}>{children}</LevelUpProvider>
      </StacksProvider>
    </ThemeProvider>
  )
  const hook = renderHook(() => ({ stacks: useStacks(), levelUps: useLevelUps() }), { wrapper })
  await waitFor(() => expect(hook.result.current.stacks.status).toBe('pronto'))
  return hook
}

describe('LevelUpProvider', () => {
  it('carga inicial e recarregar não geram avisos', async () => {
    const { result } = await montar([stack('a', 7)])
    expect(result.current.levelUps.fila).toEqual([])
    await act(async () => {
      await result.current.stacks.recarregar()
    })
    expect(result.current.levelUps.fila).toEqual([])
  })

  it('enfileira os level-ups de uma atualização e fecha um por um', async () => {
    const { result } = await montar([stack('a', 5), stack('b', 5)]) // 900 XP: nível 3
    await act(async () => {
      await result.current.stacks.atualizar('a', {
        dimensoes: { teoria: 10, pratica: 10, profundidade: 10 },
      })
    })
    // a: Praticante -> Mestre; 1350 XP: ainda nível 3.
    expect(result.current.levelUps.fila.map((a) => a.evento)).toEqual([
      expect.objectContaining({
        tipo: 'stack',
        id: 'a',
        para: expect.objectContaining({ id: 'mestre' }),
      }),
    ])

    await act(async () => {
      await result.current.stacks.atualizar('b', {
        dimensoes: { teoria: 10, pratica: 10, profundidade: 10 },
      })
    })
    // b: Praticante -> Mestre; 1800 XP: nível 4.
    const fila = result.current.levelUps.fila
    expect(fila.map((a) => a.evento.tipo)).toEqual(['stack', 'stack', 'personagem'])
    expect(new Set(fila.map((a) => a.chave)).size).toBe(3)

    act(() => result.current.levelUps.fechar(fila[0].chave))
    expect(result.current.levelUps.fila.map((a) => a.chave)).toEqual([fila[1].chave, fila[2].chave])
  })

  it('atualização sem mudança de faixa ou queda não gera aviso', async () => {
    const { result } = await montar([stack('a', 7)])
    await act(async () => {
      await result.current.stacks.atualizar('a', { dimensoes: { pratica: 3 } })
    })
    await act(async () => {
      await result.current.stacks.remover('a')
    })
    expect(result.current.levelUps.fila).toEqual([])
  })
})
