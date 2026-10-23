import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { calcularNota } from '../domain/scoring'
import { HOJE_SEED, stacksDoSeed } from '../test/seed'
import { ScoreBar } from './ScoreBar'

function meter() {
  return screen.getByRole('meter')
}

function largura(el: HTMLElement) {
  return (el.firstElementChild as HTMLElement).style.width
}

describe('ScoreBar', () => {
  it('expõe nome, faixa e valor acessíveis', () => {
    render(<ScoreBar valor={7.4} rotulo="Nota" />)
    const m = screen.getByRole('meter', { name: 'Nota' })
    expect(m).toHaveAttribute('aria-valuemin', '0')
    expect(m).toHaveAttribute('aria-valuemax', '10')
    expect(m).toHaveAttribute('aria-valuenow', '7.4')
    expect(m).toHaveAttribute('aria-valuetext', '7,4 de 10')
    expect(largura(m)).toBe('74%')
  })

  it('mostra rótulo e valor formatado em pt-BR', () => {
    render(<ScoreBar valor={7.4} rotulo="Nota" />)
    expect(screen.getByText('Nota')).toBeInTheDocument()
    expect(screen.getByText('7,4')).toBeInTheDocument()
  })

  it.each([
    [-3, '0', '0,0', '0%'],
    [12, '10', '10,0', '100%'],
    [Number.NaN, '0', '0,0', '0%'],
  ])('limita %s à faixa 0-10', (valor, now, texto, pct) => {
    render(<ScoreBar valor={valor} rotulo="Nota" />)
    expect(meter()).toHaveAttribute('aria-valuenow', now)
    expect(meter()).toHaveAttribute('aria-valuetext', `${texto} de 10`)
    expect(largura(meter())).toBe(pct)
  })

  it('variante compacta mantém o meter acessível', () => {
    render(<ScoreBar valor={3} rotulo="Prática" compacta />)
    expect(screen.getByRole('meter', { name: 'Prática' })).toHaveAttribute('aria-valuenow', '3')
    expect(screen.getByText('3,0')).toBeInTheDocument()
  })

  it('renderiza a nota de todas as stacks do seed', () => {
    for (const stack of stacksDoSeed()) {
      const nota = calcularNota(stack, { hoje: HOJE_SEED })
      const { unmount } = render(<ScoreBar valor={nota} rotulo={stack.nome} />)
      expect(screen.getByRole('meter', { name: stack.nome })).toHaveAttribute(
        'aria-valuenow',
        String(nota),
      )
      unmount()
    }
  })
})
