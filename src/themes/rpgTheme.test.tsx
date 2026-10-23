import { fireEvent, render, screen } from '@testing-library/react'
import { cloneElement, type ReactElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import type { StacksFile } from '../domain/types'
import { StacksProvider } from '../features/stacks'
import type { StorageAdapter } from '../storage'
import { stacksDoSeed } from '../test/seed'
import { ThemeProvider } from './ThemeProvider'
import { CHAVE_TEMA_STORAGE } from './themes'

// Em jsdom nada tem tamanho: o container passa largura/altura fixas aos gráficos.
vi.mock('recharts', async (importOriginal) => {
  const original = await importOriginal<typeof import('recharts')>()
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: ReactElement<{ width?: number }> }) =>
      cloneElement(children, { width: 480, height: 300 } as { width: number }),
  }
})

function adapterComSeed(): StorageAdapter {
  return {
    carregar: async (): Promise<StacksFile> => ({ versao: 1, stacks: stacksDoSeed() }),
    salvar: async (dados: StacksFile) => dados,
  }
}

function renderApp() {
  return render(
    <ThemeProvider>
      <StacksProvider adapter={adapterComSeed()}>
        <App />
      </StacksProvider>
    </ThemeProvider>,
  )
}

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
  window.history.pushState({}, '', '/')
})

describe('tema RPG', () => {
  it('com o tema rpg salvo, aplica data-theme e renderiza o Dashboard com dados', async () => {
    localStorage.setItem(CHAVE_TEMA_STORAGE, 'rpg')
    renderApp()

    expect(document.documentElement).toHaveAttribute('data-theme', 'rpg')
    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument()
    expect(
      await screen.findByRole('region', { name: 'Distribuição por nível' }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /React/ }).length).toBeGreaterThan(0)
  })

  it('o toggle troca para rpg sem desmontar a página', async () => {
    renderApp()
    expect(document.documentElement).toHaveAttribute('data-theme', 'funcional')
    await screen.findByRole('region', { name: 'Distribuição por nível' })

    fireEvent.click(screen.getByRole('button', { name: /^Tema:/ }))

    expect(document.documentElement).toHaveAttribute('data-theme', 'rpg')
    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Distribuição por nível' })).toBeInTheDocument()
  })
})
