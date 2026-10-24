import { render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vitest'
import App from './App'
import { StacksProvider } from './features/stacks'
import type { StorageAdapter } from './storage'
import { ThemeProvider } from './themes'

/** Adapter que nunca termina de carregar: estes testes não dependem dos dados. */
const adapterPendente: StorageAdapter = {
  carregar: () => new Promise(() => {}),
  salvar: () => new Promise(() => {}),
}

// As views são React.lazy: pré-carrega os módulos para a espera nos testes ser
// só a do Suspense, não a da transformação dos arquivos.
beforeAll(() => import('./views/DashboardView'))

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

  it('abre o Dashboard na rota inicial', async () => {
    renderApp()
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Dashboard' }, { timeout: 3000 }),
    ).toBeInTheDocument()
  })

  it('renderiza o botão de tema', () => {
    renderApp()
    expect(screen.getByRole('button', { name: /^Tema:/ })).toBeInTheDocument()
  })
})
