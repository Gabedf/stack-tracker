import { fireEvent, render, screen, within } from '@testing-library/react'
import { cloneElement, type ReactElement } from 'react'
import { MemoryRouter, Route, Routes, useParams } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { HOJE_SEED, stacksDoSeed } from '../../test/seed'
import { TheoryPracticeQuadrant } from './TheoryPracticeQuadrant'

// Em jsdom nada tem tamanho: o container passa largura/altura fixas ao gráfico.
vi.mock('recharts', async (importOriginal) => {
  const original = await importOriginal<typeof import('recharts')>()
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: ReactElement<{ width?: number }> }) =>
      cloneElement(children, { width: 480, height: 320 } as { width: number }),
  }
})

function DetalheFake() {
  const { id } = useParams()
  return <p>Detalhe de {id}</p>
}

function renderQuadrante(stacks = stacksDoSeed()) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<TheoryPracticeQuadrant stacks={stacks} hoje={HOJE_SEED} />} />
        <Route path="/stacks/:id" element={<DetalheFake />} />
      </Routes>
    </MemoryRouter>,
  )
}

function linhasDaTabela() {
  const tabela = screen.getByRole('table', { name: 'Teoria, prática e quadrante de cada stack' })
  const [, corpo] = within(tabela).getAllByRole('rowgroup')
  return within(corpo).getAllByRole('row')
}

describe('TheoryPracticeQuadrant', () => {
  it('resume a contagem por quadrante no aria-label', () => {
    renderQuadrante()
    expect(screen.getByRole('img')).toHaveAccessibleName(
      'Teoria × prática de 5 stacks: 3 em Domínio real, 1 em Sei por saber, ' +
        '0 em Prática intuitiva, 1 em A explorar. 1 marcada como sei por saber.',
    )
  })

  it('lista as 5 stacks do seed na tabela, cada uma no quadrante certo', () => {
    renderQuadrante()

    const celulas = linhasDaTabela().map((linha) =>
      Array.from(linha.querySelectorAll('th, td'), (c) => c.textContent),
    )
    expect(celulas).toEqual([
      ['jQuery', '7,0', '7,0', '4,9', 'Domínio real', 'Não'],
      ['Node.js', '7,0', '6,0', '5,5', 'Domínio real', 'Não'],
      ['React', '9,0', '8,0', '8,4', 'Domínio real', 'Não'],
      ['Kubernetes', '8,0', '2,0', '3,8', 'Sei por saber', 'Sim'],
      ['PostgreSQL', '4,0', '3,0', '2,6', 'A explorar', 'Não'],
    ])
  })

  it('a tabela leva ao detalhe de cada stack', () => {
    renderQuadrante()
    const [primeira] = linhasDaTabela()
    expect(within(primeira).getByRole('link', { name: 'jQuery' })).toHaveAttribute(
      'href',
      '/stacks/jquery',
    )
  })

  it('desenha uma marca por stack, com marcador distinto para sei por saber', () => {
    const { container } = renderQuadrante()

    const marcas = container.querySelectorAll('[data-stack]')
    expect(marcas).toHaveLength(5)
    const kubernetes = container.querySelector('[data-stack="kubernetes"]')
    expect(kubernetes?.querySelector('polygon')).not.toBeNull()
    expect(container.querySelector('[data-stack="react"] polygon')).toBeNull()

    expect(screen.getByRole('list', { name: 'Legenda' })).toHaveTextContent(
      'Sei por saber(teoria ≥ 7 e prática ≤ 3)',
    )
  })

  it('rotula os quatro quadrantes e os pontos que têm espaço', () => {
    const { container } = renderQuadrante()
    const textos = Array.from(container.querySelectorAll('svg text'), (t) => t.textContent)
    for (const rotulo of [
      'Domínio real',
      'Sei por saber',
      'Prática intuitiva',
      'A explorar',
      'React',
      'PostgreSQL',
    ]) {
      expect(textos).toContain(rotulo)
    }
  })

  it('clicar num ponto abre a stack', () => {
    const { container } = renderQuadrante()
    fireEvent.click(container.querySelector('[data-stack="kubernetes"]')!)
    expect(screen.getByText('Detalhe de kubernetes')).toBeInTheDocument()
  })

  it('sem stacks mostra um aviso no lugar do gráfico', () => {
    renderQuadrante([])
    expect(screen.getByText('Nenhuma stack para posicionar.')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
