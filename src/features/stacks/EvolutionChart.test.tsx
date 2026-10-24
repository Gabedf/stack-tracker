import { fireEvent, render, screen, within } from '@testing-library/react'
import { cloneElement, type ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { RegistroHistorico } from '../../domain/types'
import { EvolutionChart } from './EvolutionChart'

// Em jsdom nada tem tamanho: o container passa largura/altura fixas ao gráfico.
vi.mock('recharts', async (importOriginal) => {
  const original = await importOriginal<typeof import('recharts')>()
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: ReactElement<{ width?: number }> }) =>
      cloneElement(children, { width: 640, height: 256 } as { width: number }),
  }
})

function registro(data: string, nota: number, teoria = 5, pratica = 4, profundidade = 3) {
  return {
    data,
    nota,
    dimensoes: { teoria, pratica, profundidade, ultimoUso: data },
  } satisfies RegistroHistorico
}

const HISTORICO = [
  registro('2026-06-30', 7.2, 8, 7, 6),
  registro('2025-01-05', 2.5, 4, 1, 2),
  registro('2025-08-01', 5, 6, 5, 4),
]

function linhasDaTabela() {
  const tabela = screen.getByRole('table', { name: 'Evolução da nota e das dimensões por data' })
  const [, corpo] = within(tabela).getAllByRole('rowgroup')
  return within(corpo).getAllByRole('row')
}

function botaoDimensao(nome: string) {
  const grupo = screen.getByRole('group', { name: 'Séries do gráfico' })
  return within(grupo).getByRole('button', { name: nome })
}

describe('EvolutionChart', () => {
  it('sem snapshots, explica como registrar a evolução e não desenha o gráfico', () => {
    render(<EvolutionChart historico={[]} />)

    expect(
      screen.getByText('Ainda não há histórico; edite as dimensões para registrar a evolução.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('com 1 snapshot, mostra o ponto único e explica quando a linha aparece', () => {
    render(<EvolutionChart historico={[registro('2026-01-01', 4)]} />)

    expect(screen.getByRole('img')).toHaveAccessibleName('Nota 4,0 em 01/01/2026 (único registro).')
    expect(screen.getByText(/a linha de evolução aparece a partir do 2º registro/)).toBeVisible()
    expect(linhasDaTabela()).toHaveLength(1)
  })

  it('resume no aria-label a variação do primeiro ao último registro', () => {
    render(<EvolutionChart historico={HISTORICO} />)

    expect(screen.getByRole('img')).toHaveAccessibleName(
      'Nota foi de 2,5 em 05/01/2025 para 7,2 em 30/06/2026 (3 registros).',
    )
    expect(screen.queryByText(/a partir do 2º registro/)).not.toBeInTheDocument()
  })

  it('oferece a tabela com todos os pontos em ordem cronológica', () => {
    render(<EvolutionChart historico={HISTORICO} />)

    expect(screen.getByText('Ver dados em tabela')).toBeInTheDocument()
    const linhas = linhasDaTabela()
    expect(linhas).toHaveLength(HISTORICO.length)

    const celulas = (i: number) =>
      Array.from(linhas[i].querySelectorAll('th, td'), (c) => c.textContent)
    expect(celulas(0)).toEqual(['05/01/2025', '2,5', 'Aprendiz', '4,0', '1,0', '2,0'])
    expect(celulas(1)).toEqual(['01/08/2025', '5,0', 'Praticante', '6,0', '5,0', '4,0'])
    expect(celulas(2)).toEqual(['30/06/2026', '7,2', 'Sênior', '8,0', '7,0', '6,0'])
  })

  it('pelo teclado, os valores do tooltip ficam na tabela (região rolável e focável)', () => {
    const { container } = render(<EvolutionChart historico={HISTORICO} />)

    // O gráfico não cria paradas de Tab: o tooltip é só de ponteiro.
    expect(within(screen.getByRole('img')).queryAllByRole('button')).toHaveLength(0)
    const focaveis = Array.from(screen.getByRole('img').querySelectorAll('[tabindex]'), (el) =>
      el.getAttribute('tabindex'),
    ).filter((t) => Number(t) >= 0)
    expect(focaveis).toEqual([])

    const resumo = container.querySelector('details > summary')
    expect(resumo).toHaveTextContent('Ver dados em tabela')
    const regiao = screen.getByRole('region', { name: 'Tabela da evolução' })
    expect(regiao).toHaveAttribute('tabindex', '0')
    expect(within(regiao).getByRole('table')).toBeInTheDocument()
  })

  it('dimensões começam desligadas e os toggles alternam aria-pressed', () => {
    render(<EvolutionChart historico={HISTORICO} />)

    for (const nome of ['Teoria', 'Prática', 'Profundidade']) {
      expect(botaoDimensao(nome)).toHaveAttribute('aria-pressed', 'false')
    }

    fireEvent.click(botaoDimensao('Teoria'))
    expect(botaoDimensao('Teoria')).toHaveAttribute('aria-pressed', 'true')
    expect(botaoDimensao('Prática')).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(botaoDimensao('Teoria'))
    expect(botaoDimensao('Teoria')).toHaveAttribute('aria-pressed', 'false')
  })

  it('o resumo acessível cita as dimensões ligadas', () => {
    render(<EvolutionChart historico={HISTORICO} />)

    fireEvent.click(botaoDimensao('Profundidade'))
    fireEvent.click(botaoDimensao('Teoria'))

    expect(screen.getByRole('img')).toHaveAccessibleName(
      'Nota foi de 2,5 em 05/01/2025 para 7,2 em 30/06/2026 (3 registros). ' +
        'Dimensões exibidas: Teoria, Profundidade.',
    )
  })

  it('desenha uma linha por série visível', () => {
    const { container } = render(<EvolutionChart historico={HISTORICO} />)
    const linhas = () => container.querySelectorAll('.recharts-line')

    expect(linhas()).toHaveLength(1)
    fireEvent.click(botaoDimensao('Prática'))
    expect(linhas()).toHaveLength(2)
  })
})
