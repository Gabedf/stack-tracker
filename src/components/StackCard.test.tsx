import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { nivelDaNota } from '../domain/levels'
import { calcularNota } from '../domain/scoring'
import type { Stack } from '../domain/types'
import { HOJE_SEED, stackDoSeed, stacksDoSeed } from '../test/seed'
import { formatarNota } from './formatacao'
import { StackCard } from './StackCard'

function renderCard(stack: Stack, hoje: Date = HOJE_SEED) {
  return render(
    <MemoryRouter>
      <StackCard stack={stack} hoje={hoje} />
    </MemoryRouter>,
  )
}

describe('StackCard', () => {
  it.each(stacksDoSeed().map((s) => [s.id, s] as const))(
    '%s: nota, nível e link coerentes com o domínio',
    (_id, stack) => {
      renderCard(stack)
      const card = screen.getByRole('article', { name: stack.nome })
      const nota = calcularNota(stack, { hoje: HOJE_SEED })

      expect(within(card).getByRole('heading', { level: 2, name: stack.nome })).toBeInTheDocument()
      expect(within(card).getByRole('link', { name: stack.nome })).toHaveAttribute(
        'href',
        `/stacks/${stack.id}`,
      )
      expect(within(card).getByText(stack.categoria)).toBeInTheDocument()

      const meterNota = within(card).getByRole('meter', { name: 'Nota' })
      expect(meterNota).toHaveAttribute('aria-valuenow', String(nota))
      expect(within(card).getByText(formatarNota(nota))).toBeInTheDocument()
      expect(within(card).getByText(nivelDaNota(nota).nome)).toBeInTheDocument()

      const dims = within(card).getByRole('group', { name: 'Dimensões' })
      expect(within(dims).getByRole('meter', { name: 'Teoria' })).toHaveAttribute(
        'aria-valuenow',
        String(stack.dimensoes.teoria),
      )
      expect(within(dims).getByRole('meter', { name: 'Prática' })).toHaveAttribute(
        'aria-valuenow',
        String(stack.dimensoes.pratica),
      )
      expect(within(dims).getByRole('meter', { name: 'Profundidade' })).toHaveAttribute(
        'aria-valuenow',
        String(stack.dimensoes.profundidade),
      )

      const tags = within(card).getByRole('list', { name: 'Tags' })
      expect(
        within(tags)
          .getAllByRole('listitem')
          .map((li) => li.textContent),
      ).toEqual(stack.tags)
    },
  )

  it('mostra o nº de evidências com plural correto', () => {
    renderCard(stackDoSeed('react'))
    expect(screen.getByText('4 evidências')).toBeInTheDocument()
  })

  it('mostra o singular com uma evidência', () => {
    renderCard(stackDoSeed('nodejs'))
    expect(screen.getByText('1 evidência')).toBeInTheDocument()
  })

  it('mostra "Nenhuma evidência" quando não há evidências', () => {
    renderCard(stackDoSeed('postgresql'))
    expect(screen.getByText('Nenhuma evidência')).toBeInTheDocument()
  })

  it('mostra o selo "Sei por saber" para a stack sei-por-saber', () => {
    renderCard(stackDoSeed('kubernetes'))
    expect(screen.getByText('Sei por saber')).toBeInTheDocument()
  })

  it('repassa `hoje` ao cálculo da nota (decaimento)', () => {
    const jquery = stackDoSeed('jquery')
    const antes = new Date(2022, 2, 1)
    renderCard(jquery, antes)
    const nota = calcularNota(jquery, { hoje: antes })
    expect(nota).toBeGreaterThan(calcularNota(jquery, { hoje: HOJE_SEED }))
    expect(screen.getByRole('meter', { name: 'Nota' })).toHaveAttribute(
      'aria-valuenow',
      String(nota),
    )
  })

  it('aceita heading de nível 3', () => {
    render(
      <MemoryRouter>
        <StackCard stack={stackDoSeed('react')} hoje={HOJE_SEED} nivelTitulo={3} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { level: 3, name: 'React' })).toBeInTheDocument()
  })
})
