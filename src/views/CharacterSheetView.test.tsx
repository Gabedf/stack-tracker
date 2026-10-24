import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { cloneElement, type ReactElement } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppLayout } from '../components/layout'
import type { Stack, StacksFile } from '../domain/types'
import { calcularPersonagem, nomeDaClasse } from '../features/character'
import { StacksProvider } from '../features/stacks'
import { StorageError, type StorageAdapter } from '../storage'
import { HOJE_SEED, stacksDoSeed } from '../test/seed'
import { ThemeProvider, type Tema } from '../themes'
import { CHAVE_TEMA_STORAGE } from '../themes/themes'
import { CharacterSheetView } from './CharacterSheetView'

// Em jsdom nada tem tamanho: o container passa largura/altura fixas ao radar.
vi.mock('recharts', async (importOriginal) => {
  const original = await importOriginal<typeof import('recharts')>()
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: ReactElement<{ width?: number }> }) =>
      cloneElement(children, { width: 480, height: 300 } as { width: number }),
  }
})

class AdapterFake implements StorageAdapter {
  falharCarregar: StorageError | null = null
  pendente = false
  private readonly stacks: Stack[]
  constructor(stacks: Stack[]) {
    this.stacks = stacks
  }
  readonly carregar = vi.fn(async (): Promise<StacksFile> => {
    if (this.pendente) return new Promise<StacksFile>(() => {})
    if (this.falharCarregar) throw this.falharCarregar
    return { versao: 1, stacks: structuredClone(this.stacks) }
  })
  readonly salvar = vi.fn(async (dados: StacksFile) => dados)
}

function renderFicha({
  tema = 'rpg',
  adapter = new AdapterFake(stacksDoSeed()),
  rota = '/ficha',
}: { tema?: Tema; adapter?: AdapterFake; rota?: string } = {}) {
  localStorage.setItem(CHAVE_TEMA_STORAGE, tema)
  render(
    <ThemeProvider>
      <StacksProvider adapter={adapter} hoje={HOJE_SEED}>
        <MemoryRouter initialEntries={[rota]}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<h1>Início</h1>} />
              <Route path="/stacks" element={<h1>Lista de stacks</h1>} />
              <Route path="/stacks/:id" element={<h1>Detalhe da stack</h1>} />
              <Route path="/ficha" element={<CharacterSheetView hoje={HOJE_SEED} />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </StacksProvider>
    </ThemeProvider>,
  )
  return adapter
}

function nav() {
  return screen.getByRole('navigation', { name: 'Principal' })
}

async function esperarFicha() {
  return screen.findByRole('region', { name: 'Personagem' })
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
})

/*
 * Seed com hoje = 23/10/2026 (conta em src/features/character/character.test.ts):
 * XP 2520 -> nível 5 (2500 a 3600), faltam 1080; Frontend 1330 · Backend 550 ·
 * DevOps 380 · Dados 260.
 */
describe('CharacterSheetView', () => {
  it('mostra o carregamento enquanto os dados não chegam', () => {
    const adapter = new AdapterFake(stacksDoSeed())
    adapter.pendente = true
    renderFicha({ adapter })
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ficha do personagem')
    expect(screen.getByRole('status')).toHaveTextContent('Carregando a ficha…')
    expect(document.title).toBe('Ficha do personagem · Painel de Stacks')
  })

  it('mostra o erro e tenta de novo', async () => {
    const adapter = new AdapterFake(stacksDoSeed())
    adapter.falharCarregar = new StorageError('Arquivo inválido')
    renderFicha({ adapter })

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent('Arquivo inválido')

    adapter.falharCarregar = null
    fireEvent.click(within(alerta).getByRole('button', { name: 'Tentar de novo' }))
    expect(await esperarFicha()).toBeInTheDocument()
    expect(adapter.carregar).toHaveBeenCalledTimes(2)
  })

  it('sem stacks mostra a ficha em branco com link para adicionar', async () => {
    renderFicha({ adapter: new AdapterFake([]) })
    const vazio = await screen.findByRole('region', { name: 'Ficha em branco' })
    expect(vazio).toHaveTextContent('Recruta')
    fireEvent.click(within(vazio).getByRole('link', { name: 'Adicionar stacks' }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Lista de stacks')
  })

  it('o cabeçalho bate com a lógica do personagem', async () => {
    const esperado = calcularPersonagem(stacksDoSeed(), { hoje: HOJE_SEED })
    renderFicha()
    const ficha = await esperarFicha()

    expect(within(ficha).getByRole('heading', { level: 2 })).toHaveTextContent('Personagem')
    expect(ficha).toHaveTextContent(`Classe:${esperado.classe.nome}`)
    expect(esperado.classe.nome).toBe(nomeDaClasse('Frontend'))
    expect(ficha).toHaveTextContent('Título:Praticante (nota média 5,0)')
    expect(within(ficha).getByTestId('nivel-personagem')).toHaveTextContent(
      String(esperado.progresso.nivel),
    )
    expect(within(ficha).getByText('Nível').parentElement).toHaveTextContent('Nível 5')

    const barra = within(ficha).getByRole('progressbar', { name: 'XP do personagem' })
    expect(barra).toHaveAttribute('aria-valuenow', '2520')
    expect(barra).toHaveAttribute('aria-valuemin', '2500')
    expect(barra).toHaveAttribute('aria-valuemax', '3600')
    expect(barra).toHaveAttribute('aria-valuetext', '2.520 XP, faltam 1.080 XP para o nível 6')
    expect(within(ficha).getByText('faltam 1.080 XP para o nível 6')).toBeInTheDocument()
    expect(ficha).toHaveTextContent('2.520 / 3.600 XP')

    const totais = within(ficha).getByLabelText('Totais')
    expect(totais).toHaveTextContent('Stacks5')
    expect(totais).toHaveTextContent('Evidências7')
    expect(totais).toHaveTextContent('Sei por saber1')
  })

  it('lista as habilidades por categoria em ordem de XP', async () => {
    renderFicha()
    await esperarFicha()
    const secao = screen.getByRole('region', { name: 'Habilidades por categoria' })
    const itens = within(within(secao).getByRole('list', { name: 'Categorias' })).getAllByRole(
      'listitem',
    )
    expect(itens.map((li) => li.querySelector('span')?.textContent)).toEqual([
      'Frontend',
      'Backend',
      'DevOps',
      'Dados',
    ])
    expect(itens[0]).toHaveTextContent('Nível 3')
    expect(itens[0]).toHaveTextContent('1.330 XP')
    expect(within(itens[0]).getByRole('progressbar', { name: 'XP de Frontend' })).toHaveAttribute(
      'aria-valuenow',
      '1330',
    )
    expect(itens[0]).toHaveTextContent('faltam 270 XP para o nível 4')
    expect(itens[3]).toHaveTextContent('Nível 1')
    expect(itens[3]).toHaveTextContent('260 XP')
  })
})

function regiao(nome: string) {
  return screen.getByRole('region', { name: nome })
}

function hexagonos() {
  return within(screen.getByRole('group', { name: /^Colmeia:/ })).getAllByRole('link')
}

const ROTULOS_SEED = [
  'React, Mestre, nota 8,4',
  'jQuery, Praticante, nota 4,9, esfriando',
  'Node.js, Praticante, nota 5,5',
  'Kubernetes, Aprendiz, nota 3,8, sei por saber',
  'PostgreSQL, Aprendiz, nota 2,6',
]

describe('radar e colmeia na ficha', () => {
  it('o radar mostra a nota média por categoria, na ordem das habilidades', async () => {
    renderFicha()
    await esperarFicha()
    const radar = regiao('Radar')
    expect(radar.querySelector('[data-forma]')).toHaveAttribute('data-forma', 'radar')
    expect(within(radar).getByRole('img')).toHaveAccessibleName(
      'Nota média por categoria, de 0 a 10: Frontend 6,7; Backend 5,5; DevOps 3,8; Dados 2,6. ' +
        'Maior: Frontend (6,7); menor: Dados (2,6).',
    )
  })

  it('a colmeia tem um hexágono por stack do seed, agrupado por categoria e nota', async () => {
    renderFicha()
    await esperarFicha()
    expect(within(regiao('Colmeia de skills')).getAllByRole('link')).toHaveLength(5)
    expect(hexagonos().map((h) => h.getAttribute('aria-label'))).toEqual(ROTULOS_SEED)
    expect(hexagonos()[3]).toHaveAttribute('data-sei-por-saber', 'true')
  })

  it('selecionar uma categoria no radar esmaece as outras; clicar de novo limpa', async () => {
    renderFicha()
    await esperarFicha()
    const radar = regiao('Radar')
    const colmeia = regiao('Colmeia de skills')
    const botao = within(radar).getByRole('button', { name: /^Backend/ })

    fireEvent.click(botao)
    expect(botao).toHaveAttribute('aria-pressed', 'true')
    expect(colmeia).toHaveTextContent('Destaque: Backend')
    expect(hexagonos().map((h) => h.hasAttribute('data-dim'))).toEqual([
      true,
      true,
      false,
      true,
      true,
    ])

    fireEvent.click(botao)
    expect(botao).toHaveAttribute('aria-pressed', 'false')
    expect(hexagonos().some((h) => h.hasAttribute('data-dim'))).toBe(false)
    expect(colmeia).not.toHaveTextContent('Destaque:')
  })

  it('trocar de categoria move o destaque e o botão limpa', async () => {
    renderFicha()
    await esperarFicha()
    const radar = regiao('Radar')
    fireEvent.click(within(radar).getByRole('button', { name: /^Backend/ }))
    fireEvent.click(within(radar).getByRole('button', { name: /^Frontend/ }))
    expect(hexagonos().map((h) => h.hasAttribute('data-dim'))).toEqual([
      false,
      false,
      true,
      true,
      true,
    ])

    fireEvent.click(
      within(regiao('Colmeia de skills')).getByRole('button', { name: 'Limpar destaque' }),
    )
    expect(hexagonos().some((h) => h.hasAttribute('data-dim'))).toBe(false)
    expect(within(radar).getByRole('button', { name: /^Frontend/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('foco num hexágono mostra os detalhes e Enter abre a stack', async () => {
    renderFicha()
    await esperarFicha()
    const node = hexagonos()[2]
    act(() => node.focus())
    expect(screen.getByRole('tooltip')).toHaveTextContent('Node.js')
    expect(screen.getByRole('tooltip')).toHaveTextContent('Último uso01/06/2026')

    fireEvent.keyDown(node, { key: 'Enter' })
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Detalhe da stack')
  })

  it('funciona com uma stack só', async () => {
    renderFicha({ adapter: new AdapterFake(stacksDoSeed().slice(0, 1)) })
    await esperarFicha()
    expect(hexagonos().map((h) => h.getAttribute('aria-label'))).toEqual([ROTULOS_SEED[0]])
    expect(regiao('Radar').querySelector('[data-forma]')).toHaveAttribute('data-forma', 'barras')
  })

  it('funciona com mais de 20 stacks', async () => {
    const seed = stacksDoSeed()
    const muitas = Array.from({ length: 24 }, (_, i) => ({
      ...seed[i % seed.length],
      id: `stack-${i}`,
      nome: `Stack ${i}`,
    }))
    renderFicha({ adapter: new AdapterFake(muitas) })
    await esperarFicha()
    expect(hexagonos()).toHaveLength(24)
    expect(new Set(hexagonos().map((h) => h.getAttribute('href'))).size).toBe(24)
  })
})

describe('ficha e tema', () => {
  it('o item Ficha só aparece na navegação do tema rpg', async () => {
    renderFicha({ tema: 'funcional', rota: '/' })
    expect(within(nav()).queryByRole('link', { name: 'Ficha' })).toBeNull()

    fireEvent.change(screen.getByRole('combobox', { name: 'Tema' }), { target: { value: 'rpg' } })
    const link = within(nav()).getByRole('link', { name: 'Ficha' })
    expect(link).toHaveAttribute('href', '/ficha')
    fireEvent.click(link)
    expect(await esperarFicha()).toBeInTheDocument()
  })

  it('no tema rpg não mostra o aviso de tema', async () => {
    renderFicha({ tema: 'rpg' })
    await esperarFicha()
    expect(screen.queryByRole('note', { name: 'Aviso de tema' })).toBeNull()
    expect(within(nav()).getByRole('link', { name: 'Ficha' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('no tema funcional a ficha funciona e o aviso ativa o tema rpg', async () => {
    renderFicha({ tema: 'funcional' })
    expect(await esperarFicha()).toBeInTheDocument()
    expect(document.documentElement).toHaveAttribute('data-theme', 'funcional')

    const aviso = screen.getByRole('note', { name: 'Aviso de tema' })
    fireEvent.click(within(aviso).getByRole('button', { name: 'Ativar tema RPG' }))

    expect(document.documentElement).toHaveAttribute('data-theme', 'rpg')
    expect(localStorage.getItem(CHAVE_TEMA_STORAGE)).toBe('rpg')
    expect(screen.queryByRole('note', { name: 'Aviso de tema' })).toBeNull()
    expect(within(nav()).getByRole('link', { name: 'Ficha' })).toBeInTheDocument()
  })
})
