import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nivelDaNota } from '../../domain/levels'
import { HOJE_SEED, stacksDoSeed } from '../../test/seed'
import { skillsDaColmeia, type SkillDaColmeia } from './character'
import { SkillHoneycomb, type SkillHoneycombProps } from './SkillHoneycomb'

/*
 * Seed (hoje = 23/10/2026): React 8,4 Mestre · jQuery 4,9 Praticante (esfriando)
 * · Node.js 5,5 Praticante · Kubernetes 3,8 Aprendiz (sei por saber) ·
 * PostgreSQL 2,6 Aprendiz.
 */
const ORDEM = ['Frontend', 'Backend', 'DevOps', 'Dados']

function skillsDoSeed() {
  return skillsDaColmeia(stacksDoSeed(), { hoje: HOJE_SEED })
}

function skill(i: number, categoria = 'Frontend'): SkillDaColmeia {
  const nota = ((i * 7) % 100) / 10
  return {
    id: `s${i}`,
    nome: `Stack ${i}`,
    categoria,
    nota,
    nivel: nivelDaNota(nota),
    teoria: 5,
    pratica: 5,
    profundidade: 5,
    ultimoUso: '2026-10-01',
    seiPorSaber: false,
    esfriando: false,
    perda: 0,
  }
}

function renderColmeia(props: Partial<SkillHoneycombProps> = {}) {
  return render(
    <MemoryRouter>
      <SkillHoneycomb skills={skillsDoSeed()} ordemCategorias={ORDEM} {...props} />
    </MemoryRouter>,
  )
}

function colmeia() {
  return screen.getByRole('group', { name: /^Colmeia:/ })
}

function hexagonos() {
  return within(colmeia()).getAllByRole('link')
}

describe('SkillHoneycomb', () => {
  it('um link por stack do seed, por categoria e nota, com nome acessível', () => {
    renderColmeia()
    expect(colmeia()).toHaveAccessibleName('Colmeia: 5 stacks')
    expect(hexagonos().map((h) => h.getAttribute('aria-label'))).toEqual([
      'React, Mestre, nota 8,4',
      'jQuery, Praticante, nota 4,9, esfriando',
      'Node.js, Praticante, nota 5,5',
      'Kubernetes, Aprendiz, nota 3,8, sei por saber',
      'PostgreSQL, Aprendiz, nota 2,6',
    ])
    expect(hexagonos()[0]).toHaveAttribute('href', '/stacks/react')
  })

  it('agrupa os hexágonos por categoria', () => {
    renderColmeia()
    const frontend = within(colmeia()).getByRole('group', { name: 'Frontend' })
    expect(within(frontend).getAllByRole('link')).toHaveLength(2)
    expect(within(colmeia()).getByRole('group', { name: 'Dados' })).toBeInTheDocument()
  })

  it('marca o nível, o sei por saber (tracejado + ícone) e o esfriando', () => {
    renderColmeia()
    const [react, jquery, , kubernetes] = hexagonos()
    expect(react).toHaveAttribute('data-nivel', 'mestre')
    expect(react).not.toHaveAttribute('data-sei-por-saber')

    expect(kubernetes).toHaveAttribute('data-sei-por-saber', 'true')
    expect(kubernetes.querySelector('polygon[stroke-dasharray]')).not.toBeNull()
    expect(kubernetes.querySelectorAll('svg')).toHaveLength(1)
    expect(react.querySelector('polygon[stroke-dasharray]')).toBeNull()

    expect(jquery).toHaveAttribute('data-esfriando', 'true')
    expect(jquery.querySelectorAll('svg')).toHaveLength(1)
    expect(Number(jquery.style.opacity)).toBeLessThan(1)
  })

  it('mostra o nome curto e a nota dentro do hexágono', () => {
    renderColmeia()
    const postgres = hexagonos()[4]
    expect(postgres).toHaveTextContent('PSQL')
    expect(postgres).toHaveTextContent('2,6')
  })

  it('a legenda de níveis e de selos fica visível', () => {
    renderColmeia()
    const niveis = within(screen.getByRole('list', { name: 'Legenda de níveis' })).getAllByRole(
      'listitem',
    )
    expect(niveis.map((li) => li.textContent)).toEqual([
      'Iniciante0–2',
      'Aprendiz2–4',
      'Praticante4–6',
      'Sênior6–8',
      'Mestre8–10',
    ])
    const selos = screen.getByRole('list', { name: 'Legenda de selos' })
    expect(selos).toHaveTextContent('Sei por saber')
    expect(selos).toHaveTextContent('Esfriando')
  })

  it('funciona com uma única stack', () => {
    renderColmeia({ skills: [skill(1)] })
    expect(colmeia()).toHaveAccessibleName('Colmeia: 1 stack')
    expect(hexagonos()).toHaveLength(1)
    expect(colmeia()).toHaveAttribute('data-colunas', '1')
  })

  it('funciona com 25 stacks, em várias linhas na largura padrão', () => {
    const muitas = Array.from({ length: 25 }, (_, i) => skill(i, ORDEM[i % 4]))
    renderColmeia({ skills: muitas })
    expect(hexagonos()).toHaveLength(25)
    expect(colmeia()).toHaveAttribute('data-colunas', '6')
  })

  it('sem stacks, avisa', () => {
    renderColmeia({ skills: [] })
    expect(screen.getByText('Nenhuma stack para mostrar.')).toBeInTheDocument()
  })
})

describe('SkillHoneycomb: detalhes', () => {
  it('o foco mostra o cartão de detalhes e o liga ao hexágono', () => {
    renderColmeia()
    expect(screen.queryByRole('tooltip')).toBeNull()
    const react = hexagonos()[0]
    fireEvent.focus(react)

    const cartao = screen.getByRole('tooltip')
    expect(react).toHaveAttribute('aria-describedby', cartao.id)
    expect(react).toHaveAccessibleDescription(/React/)
    expect(cartao).toHaveTextContent('React')
    expect(cartao).toHaveTextContent('Frontend')
    expect(cartao).toHaveTextContent('Nota8,4 · Mestre')
    expect(cartao).toHaveTextContent('Teoria9,0')
    expect(cartao).toHaveTextContent('Prática8,0')
    expect(cartao).toHaveTextContent('Profundidade8,0')
    expect(cartao).toHaveTextContent('Último uso09/10/2026')

    fireEvent.blur(react)
    expect(screen.queryByRole('tooltip')).toBeNull()
    expect(react).not.toHaveAttribute('aria-describedby')
  })

  it('o hover mostra o cartão, com prioridade sobre o foco', () => {
    renderColmeia()
    const [react, jquery] = hexagonos()
    fireEvent.focus(react)
    fireEvent.mouseEnter(jquery)
    const cartao = screen.getByRole('tooltip')
    expect(cartao).toHaveTextContent('jQuery')
    expect(cartao).toHaveTextContent('Esfriando: −20% da nota')

    fireEvent.mouseLeave(jquery)
    expect(screen.getByRole('tooltip')).toHaveTextContent('React')
  })

  it('o cartão mostra o selo sei por saber', () => {
    renderColmeia()
    fireEvent.mouseEnter(hexagonos()[3])
    expect(screen.getByRole('tooltip')).toHaveTextContent('Sei por saber')
  })

  it('Esc fecha o cartão até o próximo foco', () => {
    renderColmeia()
    const [react, jquery] = hexagonos()
    fireEvent.focus(react)
    fireEvent.keyDown(react, { key: 'Escape' })
    expect(screen.queryByRole('tooltip')).toBeNull()
    fireEvent.focus(jquery)
    expect(screen.getByRole('tooltip')).toHaveTextContent('jQuery')
  })

  it('o cartão fica dentro da colmeia na horizontal', () => {
    const muitas = Array.from({ length: 12 }, (_, i) => skill(i))
    renderColmeia({ skills: muitas })
    const links = hexagonos()
    for (const indice of [0, 5, 6, 11]) {
      fireEvent.mouseEnter(links[indice])
      const cartao = screen.getByRole('tooltip')
      const left = parseFloat(cartao.style.left)
      expect(left).toBeGreaterThanOrEqual(0)
      expect(left + parseFloat(cartao.style.width)).toBeLessThanOrEqual(480)
      fireEvent.mouseLeave(links[indice])
    }
  })

  it('na primeira linha, o cartão abre abaixo do hexágono; nas de baixo, acima', () => {
    const muitas = Array.from({ length: 30 }, (_, i) => skill(i))
    renderColmeia({ skills: muitas })
    const links = hexagonos()
    fireEvent.mouseEnter(links[0])
    expect(screen.getByRole('tooltip').style.transform).toBe('')
    fireEvent.mouseLeave(links[0])
    fireEvent.mouseEnter(links[29])
    expect(screen.getByRole('tooltip').style.transform).toBe('translateY(-100%)')
  })
})

describe('SkillHoneycomb em tela estreita', () => {
  /** ResizeObserver falso que mede o elemento com a largura dada. */
  function simularLargura(largura: number) {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        private readonly callback: ResizeObserverCallback
        constructor(callback: ResizeObserverCallback) {
          this.callback = callback
        }
        observe() {
          this.callback(
            [{ contentRect: { width: largura } } as ResizeObserverEntry],
            this as unknown as ResizeObserver,
          )
        }
        unobserve() {}
        disconnect() {}
      },
    )
  }

  afterEach(() => vi.unstubAllGlobals())

  it('cabe na largura medida e mostra o cartão abaixo da colmeia, sem flutuar', () => {
    simularLargura(254)
    const muitas = Array.from({ length: 12 }, (_, i) => skill(i))
    renderColmeia({ skills: muitas })
    expect(Number(colmeia().getAttribute('width'))).toBeLessThanOrEqual(254)

    const ultimo = hexagonos()[11]
    fireEvent.mouseEnter(ultimo)
    const cartao = screen.getByRole('tooltip')
    expect(cartao).toHaveAttribute('data-posicao', 'abaixo')
    expect(cartao).not.toHaveClass('absolute')
    expect(cartao.style.left).toBe('')
    expect(cartao).toHaveTextContent(ultimo.getAttribute('aria-label')!.split(',')[0])
  })

  it('em largura folgada, o cartão continua flutuando junto ao hexágono', () => {
    simularLargura(768)
    renderColmeia()
    fireEvent.mouseEnter(hexagonos()[0])
    const cartao = screen.getByRole('tooltip')
    expect(cartao).toHaveAttribute('data-posicao', 'flutuante')
    expect(cartao).toHaveClass('absolute')
  })
})

function Destino() {
  const { pathname } = useLocation()
  return <p>Destino: {pathname}</p>
}

function renderComRotas(props: Partial<SkillHoneycombProps> = {}) {
  return render(
    <MemoryRouter initialEntries={['/ficha']}>
      <Routes>
        <Route
          path="/ficha"
          element={<SkillHoneycomb skills={skillsDoSeed()} ordemCategorias={ORDEM} {...props} />}
        />
        <Route path="/stacks/:id" element={<Destino />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('SkillHoneycomb: teclado e navegação', () => {
  it('só um hexágono fica na ordem do Tab (roving tabindex)', () => {
    renderColmeia()
    expect(hexagonos().map((h) => h.getAttribute('tabindex'))).toEqual([
      '0',
      '-1',
      '-1',
      '-1',
      '-1',
    ])
    expect(colmeia()).toHaveAccessibleDescription(
      'Setas movem entre as stacks; Enter abre a stack.',
    )
  })

  it('setas, Home e End movem o foco e o tabindex', () => {
    renderColmeia()
    const links = hexagonos()
    act(() => links[0].focus())
    expect(screen.getByTestId('anel-foco')).toBeInTheDocument()

    fireEvent.keyDown(links[0], { key: 'ArrowRight' })
    expect(links[1]).toHaveFocus()
    expect(links[1]).toHaveAttribute('tabindex', '0')
    expect(links[0]).toHaveAttribute('tabindex', '-1')
    expect(screen.getByRole('tooltip')).toHaveTextContent('jQuery')

    // Frontend (linha 0) -> Backend (linha 1): o mais próximo na horizontal.
    fireEvent.keyDown(links[1], { key: 'ArrowDown' })
    expect(links[2]).toHaveFocus()
    fireEvent.keyDown(links[2], { key: 'ArrowUp' })
    expect(links[0]).toHaveFocus()

    fireEvent.keyDown(links[0], { key: 'End' })
    expect(links[4]).toHaveFocus()
    fireEvent.keyDown(links[4], { key: 'ArrowRight' })
    expect(links[4]).toHaveFocus()
    fireEvent.keyDown(links[4], { key: 'Home' })
    expect(links[0]).toHaveFocus()
    fireEvent.keyDown(links[0], { key: 'ArrowLeft' })
    expect(links[0]).toHaveFocus()
  })

  it('Enter abre a stack', () => {
    renderComRotas()
    const kubernetes = screen.getByRole('link', { name: /^Kubernetes/ })
    act(() => kubernetes.focus())
    fireEvent.keyDown(kubernetes, { key: 'Enter' })
    expect(screen.getByText('Destino: /stacks/kubernetes')).toBeInTheDocument()
  })

  it('o clique abre a stack', () => {
    renderComRotas()
    fireEvent.click(screen.getByRole('link', { name: /^React/ }))
    expect(screen.getByText('Destino: /stacks/react')).toBeInTheDocument()
  })
})

describe('SkillHoneycomb: destaque de categoria', () => {
  it('sem categoria selecionada, nada esmaece', () => {
    renderColmeia()
    for (const hex of hexagonos()) expect(hex).not.toHaveAttribute('data-dim')
  })

  it('esmaece os hexágonos das outras categorias', () => {
    renderColmeia({ categoriaSelecionada: 'Frontend' })
    const [react, jquery, node, kubernetes, postgres] = hexagonos()
    expect(react).not.toHaveAttribute('data-dim')
    expect(jquery).not.toHaveAttribute('data-dim')
    for (const hex of [node, kubernetes, postgres]) {
      expect(hex).toHaveAttribute('data-dim', 'true')
      expect(Number(hex.style.opacity)).toBeLessThan(0.5)
    }
    expect(within(colmeia()).getByRole('group', { name: 'Frontend' })).toHaveAttribute(
      'data-destaque',
      'true',
    )
    // Esfriando e esmaecido continuam distintos: o jQuery em destaque não esmaece.
    expect(Number(jquery.style.opacity)).toBeGreaterThan(0.5)
  })

  it('o hexágono esmaecido continua focável e com detalhes', () => {
    renderColmeia({ categoriaSelecionada: 'Frontend' })
    const postgres = hexagonos()[4]
    fireEvent.focus(postgres)
    expect(screen.getByRole('tooltip')).toHaveTextContent('PostgreSQL')
  })
})
