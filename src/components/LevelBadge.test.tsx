import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { nivelDaNota } from '../domain/levels'
import { calcularNota } from '../domain/scoring'
import { HOJE_SEED, stacksDoSeed } from '../test/seed'
import { LevelBadge } from './LevelBadge'

describe('LevelBadge', () => {
  it.each([
    [0, 'Iniciante'],
    [1.9, 'Iniciante'],
    [2, 'Aprendiz'],
    [3.9, 'Aprendiz'],
    [4, 'Praticante'],
    [5.9, 'Praticante'],
    [6, 'Sênior'],
    [7.9, 'Sênior'],
    [8, 'Mestre'],
    [10, 'Mestre'],
    [-1, 'Iniciante'],
    [11, 'Mestre'],
  ])('nota %s -> %s', (nota, nome) => {
    render(<LevelBadge nota={nota} />)
    expect(screen.getByText(nome)).toBeInTheDocument()
  })

  it('tem texto acessível com o prefixo "Nível"', () => {
    const { container } = render(<LevelBadge nota={8.2} />)
    expect(container.firstElementChild).toHaveTextContent('Nível: Mestre')
  })

  it('usa estilo distinto para cada nível', () => {
    const classes = new Set(
      [1, 3, 5, 7, 9].map((nota) => {
        const { container, unmount } = render(<LevelBadge nota={nota} />)
        const cls = container.firstElementChild!.className
        unmount()
        return cls
      }),
    )
    expect(classes.size).toBe(5)
  })

  it('renderiza o nível de todas as stacks do seed', () => {
    for (const stack of stacksDoSeed()) {
      const nota = calcularNota(stack, { hoje: HOJE_SEED })
      const { unmount } = render(<LevelBadge nota={nota} />)
      expect(screen.getByText(nivelDaNota(nota).nome)).toBeInTheDocument()
      unmount()
    }
  })
})
