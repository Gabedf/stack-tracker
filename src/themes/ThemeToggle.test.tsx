import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { ThemeProvider } from './ThemeProvider'
import { ThemeToggle } from './ThemeToggle'
import { CHAVE_TEMA_STORAGE, CONFIG_TEMAS, TEMAS } from './themes'

function renderToggle() {
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  )
}

const seletor = () => screen.getByRole('combobox', { name: 'Tema' })

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
})

describe('ThemeToggle', () => {
  it('é um seletor com rótulo "Tema" que mostra o tema ativo', () => {
    renderToggle()
    expect(seletor()).toHaveValue('funcional')
    expect(screen.getByLabelText('Tema')).toBe(seletor())
  })

  it('lista todos os temas com o rótulo de CONFIG_TEMAS', () => {
    renderToggle()
    const opcoes = screen.getAllByRole('option')
    expect(opcoes.map((o) => o.getAttribute('value'))).toEqual([...TEMAS])
    expect(opcoes.map((o) => o.textContent)).toEqual(TEMAS.map((t) => CONFIG_TEMAS[t].rotulo))
    expect(opcoes.map((o) => o.textContent)).toEqual(['Funcional', 'RPG', 'Cyber'])
  })

  it('escolher Cyber aplica data-theme e persiste', () => {
    renderToggle()
    fireEvent.change(seletor(), { target: { value: 'cyber' } })
    expect(seletor()).toHaveValue('cyber')
    expect(document.documentElement.getAttribute('data-theme')).toBe('cyber')
    expect(localStorage.getItem(CHAVE_TEMA_STORAGE)).toBe('cyber')
  })

  it('troca o tema ao escolher, atualiza data-theme e persiste', () => {
    renderToggle()

    fireEvent.change(seletor(), { target: { value: 'rpg' } })
    expect(seletor()).toHaveValue('rpg')
    expect(document.documentElement.getAttribute('data-theme')).toBe('rpg')
    expect(localStorage.getItem(CHAVE_TEMA_STORAGE)).toBe('rpg')

    fireEvent.change(seletor(), { target: { value: 'funcional' } })
    expect(seletor()).toHaveValue('funcional')
    expect(document.documentElement.getAttribute('data-theme')).toBe('funcional')
    expect(localStorage.getItem(CHAVE_TEMA_STORAGE)).toBe('funcional')
  })

  it('começa no tema salvo', () => {
    localStorage.setItem(CHAVE_TEMA_STORAGE, 'rpg')
    renderToggle()
    expect(seletor()).toHaveValue('rpg')
  })
})
