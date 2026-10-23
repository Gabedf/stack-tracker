import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider } from './ThemeProvider'
import { CHAVE_TEMA_STORAGE } from './themes'
import { useTheme } from './useTheme'

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>
}

function temaNoHtml() {
  return document.documentElement.getAttribute('data-theme')
}

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ThemeProvider / useTheme', () => {
  it('começa no tema funcional e aplica data-theme no <html>', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })
    expect(result.current.tema).toBe('funcional')
    expect(temaNoHtml()).toBe('funcional')
  })

  it('alterna entre os temas e atualiza data-theme', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })

    act(() => result.current.alternar())
    expect(result.current.tema).toBe('rpg')
    expect(temaNoHtml()).toBe('rpg')

    act(() => result.current.alternar())
    expect(result.current.tema).toBe('funcional')
    expect(temaNoHtml()).toBe('funcional')
  })

  it('setTema define o tema diretamente', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })
    act(() => result.current.setTema('rpg'))
    expect(result.current.tema).toBe('rpg')
    expect(temaNoHtml()).toBe('rpg')
  })

  it('persiste o tema escolhido no localStorage', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })
    act(() => result.current.alternar())
    expect(localStorage.getItem(CHAVE_TEMA_STORAGE)).toBe('rpg')
  })

  it('restaura o tema salvo', () => {
    localStorage.setItem(CHAVE_TEMA_STORAGE, 'rpg')
    const { result } = renderHook(() => useTheme(), { wrapper })
    expect(result.current.tema).toBe('rpg')
    expect(temaNoHtml()).toBe('rpg')
  })

  it('valor inválido no storage cai no tema padrão', () => {
    localStorage.setItem(CHAVE_TEMA_STORAGE, 'neon')
    const { result } = renderHook(() => useTheme(), { wrapper })
    expect(result.current.tema).toBe('funcional')
    expect(temaNoHtml()).toBe('funcional')
  })

  it('localStorage que lança não quebra a leitura nem a troca', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })

    const { result } = renderHook(() => useTheme(), { wrapper })
    expect(result.current.tema).toBe('funcional')

    act(() => result.current.alternar())
    expect(result.current.tema).toBe('rpg')
    expect(temaNoHtml()).toBe('rpg')
  })

  it('useTheme fora do provider lança erro claro', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderHook(() => useTheme())).toThrow(
      'useTheme deve ser usado dentro de um <ThemeProvider>.',
    )
  })
})
