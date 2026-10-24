import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MotionProvider } from '../../components/motion'
import { NIVEIS } from '../../domain/levels'
import { simularMenosMovimento } from '../../test/browserMocks'
import { ThemeProvider, type Tema } from '../../themes'
import { CHAVE_TEMA_STORAGE } from '../../themes/themes'
import type { AvisoLevelUp } from './LevelUpContext'
import { DURACAO_AVISO_MS, LevelUpToast } from './LevelUpToast'

const [, , praticante, senior] = NIVEIS
const AVISO_STACK: AvisoLevelUp = {
  chave: 7,
  evento: { tipo: 'stack', id: 'react', nome: 'React', de: praticante, para: senior },
}
const AVISO_PERSONAGEM: AvisoLevelUp = { chave: 8, evento: { tipo: 'personagem', de: 5, para: 6 } }

function renderToast(
  aviso: AvisoLevelUp | null,
  { tema = 'funcional', restantes = 0 }: { tema?: Tema; restantes?: number } = {},
) {
  localStorage.setItem(CHAVE_TEMA_STORAGE, tema)
  const onFechar = vi.fn()
  render(
    <ThemeProvider>
      <MotionProvider>
        <LevelUpToast aviso={aviso} restantes={restantes} onFechar={onFechar} />
      </MotionProvider>
    </ThemeProvider>,
  )
  return onFechar
}

const regiao = () => screen.getByTestId('levelup-avisos')
const toast = () => screen.getByTestId('levelup-toast')

beforeEach(() => localStorage.clear())
afterEach(() => {
  vi.useRealTimers()
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
})

describe('LevelUpToast', () => {
  it('sem aviso, a região aria-live fica na página, vazia', () => {
    renderToast(null)
    expect(regiao()).toHaveAttribute('aria-live', 'polite')
    expect(regiao()).toBeEmptyDOMElement()
  })

  it('mostra a subida da stack com nome e faixas, dentro da região aria-live', () => {
    renderToast(AVISO_STACK, { restantes: 2 })
    const r = within(regiao())
    expect(r.getByText('Subiu para Sênior!')).toBeInTheDocument()
    expect(r.getByText('React · Praticante → Sênior')).toBeInTheDocument()
    expect(r.getByText('mais 2 avisos')).toBeInTheDocument()
  })

  it('mostra a subida do personagem', () => {
    renderToast(AVISO_PERSONAGEM)
    expect(within(regiao()).getByText('Personagem subiu para o nível 6!')).toBeInTheDocument()
    expect(within(regiao()).getByText('Nível 5 → 6')).toBeInTheDocument()
  })

  it('o botão fechar avisa a chave', () => {
    const onFechar = renderToast(AVISO_STACK)
    fireEvent.click(screen.getByRole('button', { name: 'Fechar aviso' }))
    expect(onFechar).toHaveBeenCalledWith(7)
  })

  it('some sozinho após alguns segundos', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const onFechar = renderToast(AVISO_STACK)
    act(() => vi.advanceTimersByTime(DURACAO_AVISO_MS - 1))
    expect(onFechar).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(1))
    expect(onFechar).toHaveBeenCalledWith(7)
  })

  it('no tema funcional é um toast simples, sem faíscas', () => {
    renderToast(AVISO_STACK)
    expect(toast()).toHaveAttribute('data-tema', 'funcional')
    expect(toast()).toHaveAttribute('data-animacao', 'ligada')
    expect(toast().querySelector('.levelup-particula')).toBeNull()
  })

  it('no tema rpg tem brilho e faíscas decorativas', () => {
    renderToast(AVISO_STACK, { tema: 'rpg' })
    expect(toast()).toHaveAttribute('data-tema', 'rpg')
    expect(toast()).toHaveClass('shadow-glow')
    const particulas = toast().querySelectorAll('.levelup-particula')
    expect(particulas.length).toBeGreaterThan(0)
    expect(particulas[0].parentElement).toHaveAttribute('aria-hidden', 'true')
  })

  it('no tema rpg continua pergaminho: sem faixa de sistema, entra com scale (não scaleX)', () => {
    renderToast(AVISO_STACK, { tema: 'rpg' })
    expect(toast().querySelector('[data-levelup-faixa]')).toBeNull()
    expect(toast().style.transform).toMatch(/scale\(/)
    expect(toast().style.transform).not.toMatch(/scaleX/)
  })

  it('no tema cyber é a mensagem do sistema: abre em scaleX, com faixa decorativa e riscos', () => {
    renderToast(AVISO_STACK, { tema: 'cyber' })
    expect(toast()).toHaveAttribute('data-tema', 'cyber')
    expect(toast()).toHaveClass('shadow-glow')
    expect(toast().style.transform).toMatch(/scaleX\(0\)/)
    expect(toast().style.transformOrigin).toMatch(/center|50%/)
    const faixa = toast().querySelector('[data-levelup-faixa]')
    expect(faixa).toHaveTextContent('◆ LEVEL UP')
    expect(faixa).toHaveAttribute('aria-hidden', 'true')
    expect(toast().querySelector('[data-levelup-titulo]')).toHaveTextContent('Subiu para Sênior!')
    const particulas = toast().querySelectorAll('.levelup-particula')
    expect(particulas.length).toBeGreaterThan(0)
    expect(particulas[0].parentElement).toHaveAttribute('aria-hidden', 'true')
  })

  it('no cyber o anúncio segue o mesmo: a região lê o texto do aviso e a faixa fica oculta', () => {
    renderToast(AVISO_STACK, { tema: 'cyber' })
    expect(regiao()).toHaveAttribute('aria-live', 'polite')
    expect(within(regiao()).getByText('Subiu para Sênior!')).toBeInTheDocument()
    expect(within(regiao()).getByText('React · Praticante → Sênior')).toBeInTheDocument()
    expect(within(regiao()).getByText('◆ LEVEL UP')).toHaveAttribute('aria-hidden', 'true')
  })

  it('cyber com prefers-reduced-motion: nada se move (sem scaleX nem riscos) e continua anunciando', () => {
    simularMenosMovimento(true)
    renderToast(AVISO_STACK, { tema: 'cyber' })
    expect(toast()).toHaveAttribute('data-animacao', 'desligada')
    expect(toast().style.opacity).not.toBe('0')
    expect(toast().style.transform).not.toMatch(/scale/)
    expect(toast().querySelector('.levelup-particula')).toBeNull()
    expect(within(regiao()).getByText('Subiu para Sênior!')).toBeInTheDocument()
  })

  it('no funcional não há faixa de sistema', () => {
    renderToast(AVISO_STACK)
    expect(toast().querySelector('[data-levelup-faixa]')).toBeNull()
  })

  it('com prefers-reduced-motion aparece direto, sem faíscas, e continua anunciando', () => {
    simularMenosMovimento(true)
    renderToast(AVISO_STACK, { tema: 'rpg' })
    expect(toast()).toHaveAttribute('data-animacao', 'desligada')
    expect(toast().style.opacity).not.toBe('0')
    expect(toast().style.transform).not.toMatch(/scale/)
    expect(toast().querySelector('.levelup-particula')).toBeNull()
    expect(within(regiao()).getByText('Subiu para Sênior!')).toBeInTheDocument()
  })
})
