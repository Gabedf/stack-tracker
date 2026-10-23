import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'
import { ThemeProvider } from './themes'

describe('App', () => {
  it('renderiza o título do painel', () => {
    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>,
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Painel de Stacks' })).toBeInTheDocument()
  })

  it('renderiza o botão de tema', () => {
    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>,
    )
    expect(screen.getByRole('button', { name: /^Tema:/ })).toBeInTheDocument()
  })
})
