import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'
import { StacksProvider } from './features/stacks'
import type { StorageAdapter } from './storage'
import { ThemeProvider } from './themes'

/** Adapter que nunca termina de carregar: estes testes não dependem dos dados. */
const adapterPendente: StorageAdapter = {
  carregar: () => new Promise(() => {}),
  salvar: () => new Promise(() => {}),
}

function renderApp() {
  return render(
    <ThemeProvider>
      <StacksProvider adapter={adapterPendente}>
        <App />
      </StacksProvider>
    </ThemeProvider>,
  )
}

describe('App', () => {
  it('renderiza o nome do painel no cabeçalho', () => {
    renderApp()
    expect(screen.getByRole('link', { name: 'Painel de Stacks' })).toBeInTheDocument()
  })

  it('abre o Dashboard na rota inicial', () => {
    renderApp()
    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument()
  })

  it('renderiza o botão de tema', () => {
    renderApp()
    expect(screen.getByRole('button', { name: /^Tema:/ })).toBeInTheDocument()
  })
})
