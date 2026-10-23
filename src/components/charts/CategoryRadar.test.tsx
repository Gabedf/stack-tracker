import { fireEvent, render, screen, within } from '@testing-library/react'
import { cloneElement, type ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { estatisticasPorCategoria } from '../../features/dashboard/dashboardStats'
import { HOJE_SEED, stacksDoSeed } from '../../test/seed'
import { formaGraficoCategorias, resumoCategorias, type ItemCategoria } from './categoryChartData'
import { CategoryRadar } from './CategoryRadar'

// Em jsdom nada tem tamanho: o container passa largura/altura fixas ao gráfico.
vi.mock('recharts', async (importOriginal) => {
  const original = await importOriginal<typeof import('recharts')>()
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: ReactElement<{ width?: number }> }) =>
      cloneElement(children, { width: 480, height: 300 } as { width: number }),
  }
})

function itens(quantidade: number): ItemCategoria[] {
  return Array.from({ length: quantidade }, (_, i) => ({
    categoria: `Categoria ${i + 1}`,
    valor: i % 11,
  }))
}

/*
 * Nota média por categoria no seed (hoje = 23/10/2026), em ordem alfabética:
 * Backend 5,5 (nodejs) · Dados 2,6 (postgresql) · DevOps 3,8 (kubernetes) ·
 * Frontend (8,4 + 4,9) / 2 = 6,65 -> 6,7 (react e jquery).
 */
function itensDoSeed(): ItemCategoria[] {
  return estatisticasPorCategoria(stacksDoSeed(), { hoje: HOJE_SEED }).map((e) => ({
    categoria: e.categoria,
    valor: e.notaMedia,
    quantidade: e.quantidade,
  }))
}

const RESUMO_SEED =
  'Nota média por categoria, de 0 a 10: Backend 5,5; Dados 2,6; DevOps 3,8; Frontend 6,7. ' +
  'Maior: Frontend (6,7); menor: Dados (2,6).'

function linhasDaTabela() {
  const tabela = screen.getByRole('table', { name: 'Nota média por categoria' })
  const [, corpo] = within(tabela).getAllByRole('rowgroup')
  return within(corpo)
    .getAllByRole('row')
    .map((linha) => Array.from(linha.querySelectorAll('th, td'), (c) => c.textContent))
}

describe('formaGraficoCategorias', () => {
  it.each([
    [0, 'barras'],
    [1, 'barras'],
    [2, 'barras'],
    [3, 'radar'],
    [8, 'radar'],
    [9, 'barras'],
  ] as const)('%i categorias -> %s', (quantidade, forma) => {
    expect(formaGraficoCategorias(quantidade)).toBe(forma)
  })
})

describe('resumoCategorias', () => {
  it('limita os valores à escala 0-10 e avisa quando todos empatam', () => {
    expect(
      resumoCategorias(
        [
          { categoria: 'A', valor: 12 },
          { categoria: 'B', valor: 10 },
        ],
        'Nota',
      ),
    ).toBe('Nota por categoria, de 0 a 10: A 10,0; B 10,0. Todas com o mesmo valor.')
  })
})

describe('CategoryRadar', () => {
  it.each([
    [2, 'barras'],
    [3, 'radar'],
    [8, 'radar'],
    [9, 'barras'],
  ] as const)('com %i categorias desenha %s', (quantidade, forma) => {
    const { container } = render(<CategoryRadar itens={itens(quantidade)} />)

    expect(container.querySelector('[data-forma]')).toHaveAttribute('data-forma', forma)
    expect(container.querySelector('.recharts-radar') != null).toBe(forma === 'radar')
    expect(container.querySelector('.recharts-bar') != null).toBe(forma === 'barras')
  })

  it('resume os valores do seed no aria-label', () => {
    render(<CategoryRadar itens={itensDoSeed()} rotuloValor="Nota média" />)
    expect(screen.getByRole('img')).toHaveAccessibleName(RESUMO_SEED)
  })

  it('lista os valores do seed na tabela, com a quantidade de stacks', () => {
    render(<CategoryRadar itens={itensDoSeed()} rotuloValor="Nota média" />)

    expect(screen.getByText('Ver dados em tabela')).toBeInTheDocument()
    expect(linhasDaTabela()).toEqual([
      ['Backend', '5,5', '1'],
      ['Dados', '2,6', '1'],
      ['DevOps', '3,8', '1'],
      ['Frontend', '6,7', '2'],
    ])
  })

  it('sem onSelecionar não mostra botões de categoria', () => {
    render(<CategoryRadar itens={itensDoSeed()} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('chama onSelecionar ao clicar numa categoria e marca a selecionada', () => {
    const onSelecionar = vi.fn()
    render(
      <CategoryRadar
        itens={itensDoSeed()}
        rotuloValor="Nota média"
        selecionada="Dados"
        onSelecionar={onSelecionar}
      />,
    )

    const lista = screen.getByRole('list', { name: 'Categorias' })
    const botoes = within(lista).getAllByRole('button')
    expect(botoes.map((b) => b.textContent)).toEqual([
      'Backend5,5',
      'Dados2,6',
      'DevOps3,8',
      'Frontend6,7',
    ])
    expect(within(lista).getByRole('button', { name: /Dados/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(within(lista).getByRole('button', { name: /Frontend/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    )

    fireEvent.click(within(lista).getByRole('button', { name: /Frontend/ }))
    expect(onSelecionar).toHaveBeenCalledWith('Frontend')
  })

  it('o rótulo da categoria no radar também é clicável', () => {
    const onSelecionar = vi.fn()
    const { container } = render(
      <CategoryRadar itens={itensDoSeed()} onSelecionar={onSelecionar} />,
    )

    const rotulo = Array.from(container.querySelectorAll('svg text')).find(
      (t) => t.textContent === 'DevOps',
    )
    expect(rotulo).toBeDefined()
    fireEvent.click(rotulo!)
    expect(onSelecionar).toHaveBeenCalledWith('DevOps')
  })

  it('no fallback de barras, clicar na barra seleciona a categoria', () => {
    const onSelecionar = vi.fn()
    const { container } = render(
      <CategoryRadar itens={itensDoSeed().slice(0, 2)} onSelecionar={onSelecionar} />,
    )

    const barras = container.querySelectorAll('.recharts-bar-rectangle path')
    expect(barras).toHaveLength(2)
    fireEvent.click(barras[1])
    expect(onSelecionar).toHaveBeenCalledWith('Dados')
  })

  it('sem itens mostra um aviso no lugar do gráfico', () => {
    render(<CategoryRadar itens={[]} />)
    expect(screen.getByText('Nenhuma categoria para mostrar.')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
