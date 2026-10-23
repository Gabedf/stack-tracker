import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { ThemeProvider } from './ThemeProvider'
import { ThemeToggle } from './ThemeToggle'
import { CHAVE_TEMA_STORAGE } from './themes'

function renderToggle() {
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  )
}

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
})

describe('ThemeToggle', () => {
  it('mostra o tema ativo no nome acessível', () => {
    renderToggle()
    expect(screen.getByRole('button', { name: 'Tema: Funcional' })).toBeInTheDocument()
  })

  it('alterna o tema ao clicar, atualiza data-theme e persiste', () => {
    renderToggle()

    fireEvent.click(screen.getByRole('button', { name: 'Tema: Funcional' }))
    expect(screen.getByRole('button', { name: 'Tema: RPG' })).toBeInTheDocument()
    expect(document.documentElement.getAttribute('data-theme')).toBe('rpg')
    expect(localStorage.getItem(CHAVE_TEMA_STORAGE)).toBe('rpg')

    fireEvent.click(screen.getByRole('button', { name: 'Tema: RPG' }))
    expect(screen.getByRole('button', { name: 'Tema: Funcional' })).toBeInTheDocument()
    expect(document.documentElement.getAttribute('data-theme')).toBe('funcional')
  })
})
