import { render, screen, waitFor } from '@testing-library/react'
import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import { MotionProvider } from '../../components/motion'
import { simularMenosMovimento } from '../../test/browserMocks'
import { progressoDoXp } from './character'
import { XpBar } from './XpBar'

/** Com o MotionProvider, como no app: sem ele, `m` não carrega o motor de animação. */
const renderBarra = (ui: ReactElement) => render(ui, { wrapper: MotionProvider })

const preenchimento = () => screen.getByTestId('xp-preenchimento')

describe('XpBar', () => {
  it('ARIA e texto mostram o valor final desde o primeiro render', () => {
    // 2520 XP: nível 5 (2500 a 3600), faltam 1080.
    renderBarra(<XpBar progresso={progressoDoXp(2520)} rotulo="XP do personagem" />)
    const barra = screen.getByRole('progressbar', { name: 'XP do personagem' })
    expect(barra).toHaveAttribute('aria-valuenow', '2520')
    expect(barra).toHaveAttribute('aria-valuemin', '2500')
    expect(barra).toHaveAttribute('aria-valuemax', '3600')
    expect(barra).toHaveAttribute('aria-valuetext', '2.520 XP, faltam 1.080 XP para o nível 6')
    expect(screen.getByText('faltam 1.080 XP para o nível 6')).toBeInTheDocument()
  })

  it('enche de 0 até o valor ao entrar na tela', async () => {
    renderBarra(<XpBar progresso={progressoDoXp(3050)} rotulo="XP" />)
    expect(preenchimento()).toHaveAttribute('data-animacao', 'ligada')
    expect(preenchimento().style.width).toBe('0%')
    await waitFor(() => expect(preenchimento().style.width).toBe('50%'), { timeout: 3000 })
  })

  it('anima até o novo valor quando o XP muda; o ARIA já mostra o final', async () => {
    const { rerender } = renderBarra(<XpBar progresso={progressoDoXp(2500)} rotulo="XP" />)
    await waitFor(() => expect(preenchimento().style.width).toBe('0%'))
    rerender(<XpBar progresso={progressoDoXp(3050)} rotulo="XP" />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '3050')
    expect(screen.getByText('faltam 550 XP para o nível 6')).toBeInTheDocument()
    await waitFor(() => expect(preenchimento().style.width).toBe('50%'), { timeout: 3000 })
  })

  it('com prefers-reduced-motion, aparece direto no valor final', () => {
    simularMenosMovimento(true)
    renderBarra(<XpBar progresso={progressoDoXp(3050)} rotulo="XP" />)
    expect(preenchimento()).toHaveAttribute('data-animacao', 'desligada')
    expect(preenchimento().style.width).toBe('50%')
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '3050')
  })

  it('expõe ganchos neutros de estilo sem mudar a semântica', () => {
    // 2520 XP: nível 5.
    const { container } = renderBarra(
      <XpBar progresso={progressoDoXp(2520)} rotulo="XP" compacta />,
    )
    const raiz = container.querySelector('[data-xpbar]')
    expect(raiz).toHaveAttribute('data-xpbar-nivel', '5')
    const barra = screen.getByRole('progressbar', { name: 'XP' })
    expect(barra).toHaveAttribute('data-xpbar-trilho')
    expect(barra).toHaveAttribute('data-compacta')
    expect(raiz).toContainElement(barra)
    expect(barra).toContainElement(preenchimento())
    expect(preenchimento()).toHaveAttribute('data-xpbar-preenchimento')
  })
})
