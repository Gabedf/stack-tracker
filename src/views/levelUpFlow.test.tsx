import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MotionConfig } from 'framer-motion'
import { cloneElement, type ReactElement } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppLayout } from '../components/layout'
import type { Stack, StacksFile } from '../domain/types'
import { calcularPersonagem, LevelUpProvider } from '../features/character'
import { StacksProvider } from '../features/stacks'
import type { StorageAdapter } from '../storage'
import { simularMenosMovimento } from '../test/browserMocks'
import { HOJE_SEED, stacksDoSeed } from '../test/seed'
import { ThemeProvider, type Tema } from '../themes'
import { CHAVE_TEMA_STORAGE } from '../themes/themes'
import { CharacterSheetView } from './CharacterSheetView'
import { StackDetailView } from './StackDetailView'

// Em jsdom nada tem tamanho: o container passa largura/altura fixas aos gráficos.
vi.mock('recharts', async (importOriginal) => {
  const original = await importOriginal<typeof import('recharts')>()
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: ReactElement<{ width?: number }> }) =>
      cloneElement(children, { width: 480, height: 300 } as { width: number }),
  }
})

/** Adapter em memória. */
class AdapterFake implements StorageAdapter {
  dados: StacksFile
  constructor(stacks: Stack[]) {
    this.dados = { versao: 1, stacks: structuredClone(stacks) }
  }
  readonly carregar = vi.fn(async (): Promise<StacksFile> => structuredClone(this.dados))
  readonly salvar = vi.fn(async (dados: StacksFile): Promise<StacksFile> => {
    this.dados = structuredClone(dados)
    return structuredClone(this.dados)
  })
}

function renderApp(rota: string, { tema = 'rpg' }: { tema?: Tema } = {}) {
  localStorage.setItem(CHAVE_TEMA_STORAGE, tema)
  const adapter = new AdapterFake(stacksDoSeed())
  render(
    <ThemeProvider>
      <StacksProvider adapter={adapter} hoje={HOJE_SEED}>
        <MotionConfig reducedMotion="user">
          <LevelUpProvider hoje={HOJE_SEED}>
            <MemoryRouter initialEntries={[rota]}>
              <Routes>
                <Route element={<AppLayout />}>
                  <Route path="/stacks/:id" element={<StackDetailView hoje={HOJE_SEED} />} />
                  <Route path="/ficha" element={<CharacterSheetView hoje={HOJE_SEED} />} />
                </Route>
              </Routes>
            </MemoryRouter>
          </LevelUpProvider>
        </MotionConfig>
      </StacksProvider>
    </ThemeProvider>,
  )
  return adapter
}

const avisos = () => screen.getByTestId('levelup-avisos')
const mudar = (rotulo: string, valor: string) =>
  fireEvent.change(screen.getByLabelText(rotulo), { target: { value: valor } })

/** Node.js no seed: nota 5,5 (Praticante). Prática 8 e profundidade 7 levam a 6,9 (Sênior). */
async function subirNodeParaSenior() {
  await screen.findByRole('heading', { level: 1, name: 'Node.js' })
  mudar('Prática', '8')
  mudar('Profundidade', '7')
  fireEvent.click(screen.getByRole('button', { name: 'Salvar dimensões' }))
  return within(avisos()).findByText('Subiu para Sênior!')
}

beforeEach(() => localStorage.clear())
afterEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
})

describe('level-up ao editar uma stack', () => {
  it('a carga inicial não mostra aviso', async () => {
    renderApp('/stacks/nodejs')
    await screen.findByRole('heading', { level: 1, name: 'Node.js' })
    expect(avisos()).toHaveAttribute('aria-live', 'polite')
    expect(avisos()).toBeEmptyDOMElement()
  })

  it('subir de faixa mostra "Subiu para Sênior!" com o nome, anunciado em aria-live', async () => {
    renderApp('/stacks/nodejs')
    const mensagem = await subirNodeParaSenior()
    expect(mensagem.closest('[aria-live="polite"]')).toBe(avisos())
    expect(avisos()).toHaveTextContent('Node.js · Praticante → Sênior')
    const toast = within(avisos()).getByTestId('levelup-toast')
    expect(toast).toHaveAttribute('data-tema', 'rpg')
    expect(toast).toHaveAttribute('data-animacao', 'ligada')

    fireEvent.click(within(avisos()).getByRole('button', { name: 'Fechar aviso' }))
    await waitFor(() => expect(avisos()).toBeEmptyDOMElement(), { timeout: 3000 })
  })

  it('editar sem mudar de faixa não mostra aviso', async () => {
    const adapter = renderApp('/stacks/nodejs')
    await screen.findByRole('heading', { level: 1, name: 'Node.js' })
    mudar('Prática', '6.5')
    fireEvent.click(screen.getByRole('button', { name: 'Salvar dimensões' }))
    await waitFor(() => expect(adapter.salvar).toHaveBeenCalledTimes(1))
    await screen.findByText('Dimensões salvas.')
    expect(avisos()).toBeEmptyDOMElement()
  })

  it('no tema funcional é um toast simples', async () => {
    renderApp('/stacks/nodejs', { tema: 'funcional' })
    await subirNodeParaSenior()
    const toast = within(avisos()).getByTestId('levelup-toast')
    expect(toast).toHaveAttribute('data-tema', 'funcional')
    expect(toast.querySelector('.levelup-particula')).toBeNull()
  })

  it('com prefers-reduced-motion o aviso aparece sem animação', async () => {
    simularMenosMovimento(true)
    renderApp('/stacks/nodejs')
    await subirNodeParaSenior()
    const toast = within(avisos()).getByTestId('levelup-toast')
    expect(toast).toHaveAttribute('data-animacao', 'desligada')
    expect(toast.style.opacity).not.toBe('0')
    expect(toast.style.transform).not.toMatch(/scale/)
    expect(toast.querySelector('.levelup-particula')).toBeNull()
  })
})

describe('barras de XP da ficha', () => {
  it('aria-valuenow é o valor final desde o início, mesmo animando', async () => {
    renderApp('/ficha')
    const personagem = calcularPersonagem(stacksDoSeed(), { hoje: HOJE_SEED })
    const barra = await screen.findByRole('progressbar', { name: 'XP do personagem' })
    expect(barra).toHaveAttribute('aria-valuenow', String(personagem.progresso.xp))
    expect(within(barra).getByTestId('xp-preenchimento')).toHaveAttribute('data-animacao', 'ligada')
    for (const h of personagem.habilidades) {
      const categoria = screen.getByRole('progressbar', { name: `XP de ${h.categoria}` })
      expect(categoria).toHaveAttribute('aria-valuenow', String(h.xp))
    }
    expect(screen.getByText('faltam 1.080 XP para o nível 6')).toBeInTheDocument()
  })

  it('com prefers-reduced-motion as barras já aparecem cheias', async () => {
    simularMenosMovimento(true)
    renderApp('/ficha')
    const personagem = calcularPersonagem(stacksDoSeed(), { hoje: HOJE_SEED })
    const barra = await screen.findByRole('progressbar', { name: 'XP do personagem' })
    const preenchimento = within(barra).getByTestId('xp-preenchimento')
    expect(preenchimento).toHaveAttribute('data-animacao', 'desligada')
    expect(preenchimento.style.width).toBe(`${personagem.progresso.progresso * 100}%`)
  })
})
