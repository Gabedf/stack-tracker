import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { seiPorSaber } from '../domain/scoring'
import { stackDoSeed, stacksDoSeed } from '../test/seed'
import { KnowledgeBadge } from './KnowledgeBadge'

describe('KnowledgeBadge', () => {
  it('mostra "Sei por saber" para a stack sei-por-saber do seed', () => {
    const k8s = stackDoSeed('kubernetes')
    expect(seiPorSaber(k8s)).toBe(true)
    const { container } = render(<KnowledgeBadge stack={k8s} />)
    expect(screen.getByText('Sei por saber')).toBeInTheDocument()
    expect(screen.queryByText('Só teoria')).not.toBeInTheDocument()
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it.each([
    ['react', 'Produção'],
    ['nodejs', 'Projeto pessoal'],
    ['jquery', 'Produção'],
    ['postgresql', 'Estudo'],
  ])('mostra o tipo de experiência de %s: %s', (id, rotulo) => {
    render(<KnowledgeBadge stack={stackDoSeed(id)} />)
    expect(screen.getByText(rotulo)).toBeInTheDocument()
    expect(screen.queryByText('Sei por saber')).not.toBeInTheDocument()
  })

  it('mostra "Só teoria" quando não é sei-por-saber', () => {
    const base = stackDoSeed('kubernetes')
    const stack = { ...base, dimensoes: { ...base.dimensoes, teoria: 5 } }
    render(<KnowledgeBadge stack={stack} />)
    expect(screen.getByText('Só teoria')).toBeInTheDocument()
  })

  it('renderiza todas as stacks do seed', () => {
    for (const stack of stacksDoSeed()) {
      const { container, unmount } = render(<KnowledgeBadge stack={stack} />)
      expect(container.textContent).not.toBe('')
      unmount()
    }
  })
})
