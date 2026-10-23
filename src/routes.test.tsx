import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { StacksProvider } from './features/stacks'
import { AppRoutes } from './routes'
import type { StorageAdapter } from './storage'
import { ThemeProvider } from './themes'

/** Adapter que nunca termina de carregar: as rotas aqui não dependem dos dados. */
const adapterPendente: StorageAdapter = {
  carregar: () => new Promise(() => {}),
  salvar: () => new Promise(() => {}),
}

function renderEm(rota: string) {
  return render(
    <ThemeProvider>
      <StacksProvider adapter={adapterPendente}>
        <MemoryRouter initialEntries={[rota]}>
          <AppRoutes />
        </MemoryRouter>
      </StacksProvider>
    </ThemeProvider>,
  )
}

function h1() {
  return screen.getByRole('heading', { level: 1 })
}

function nav() {
  return screen.getByRole('navigation', { name: 'Principal' })
}

describe('rotas', () => {
  it.each([
    ['/', 'Dashboard', 'Dashboard · Painel de Stacks'],
    ['/stacks', 'Stacks', 'Stacks · Painel de Stacks'],
    ['/curriculo', 'Currículo', 'Currículo · Painel de Stacks'],
  ])('%s renderiza o placeholder %s', (rota, titulo, tituloAba) => {
    renderEm(rota)
    expect(h1()).toHaveTextContent(titulo)
    expect(document.title).toBe(tituloAba)
  })

  it('/stacks/:id mostra o id da rota', () => {
    renderEm('/stacks/react-123')
    expect(h1()).toHaveTextContent('Detalhe da stack')
    expect(screen.getByText('react-123')).toBeInTheDocument()
    expect(document.title).toBe('Stack react-123 · Painel de Stacks')
  })

  it('rota desconhecida mostra a página 404', () => {
    renderEm('/nao-existe/mesmo')
    expect(h1()).toHaveTextContent('Página não encontrada')
    expect(screen.getByRole('link', { name: 'Voltar ao Dashboard' })).toHaveAttribute('href', '/')
  })

  it('o layout tem cabeçalho, toggle de tema e link para pular ao conteúdo', () => {
    renderEm('/')
    expect(screen.getByRole('link', { name: 'Painel de Stacks' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Tema:/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Pular para o conteúdo' })).toHaveAttribute(
      'href',
      '#conteudo',
    )
    expect(screen.getByRole('main')).toHaveAttribute('id', 'conteudo')
  })
})

describe('navegação principal', () => {
  it('marca só o link da rota ativa com aria-current', () => {
    renderEm('/stacks')
    const links = within(nav()).getAllByRole('link')
    expect(links.map((l) => l.textContent)).toEqual(['Dashboard', 'Stacks', 'Currículo'])
    expect(within(nav()).getByRole('link', { name: 'Stacks' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(within(nav()).getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute(
      'aria-current',
    )
  })

  it('mantém Stacks ativo no detalhe de uma stack', () => {
    renderEm('/stacks/abc')
    expect(within(nav()).getByRole('link', { name: 'Stacks' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('clicar nos links navega e move o aria-current', () => {
    renderEm('/')
    expect(within(nav()).getByRole('link', { name: 'Dashboard' })).toHaveAttribute(
      'aria-current',
      'page',
    )

    fireEvent.click(within(nav()).getByRole('link', { name: 'Currículo' }))
    expect(h1()).toHaveTextContent('Currículo')
    expect(within(nav()).getByRole('link', { name: 'Currículo' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(within(nav()).getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute(
      'aria-current',
    )

    fireEvent.click(within(nav()).getByRole('link', { name: 'Stacks' }))
    expect(h1()).toHaveTextContent('Stacks')
    expect(within(nav()).getByRole('link', { name: 'Stacks' })).toHaveAttribute(
      'aria-current',
      'page',
    )

    fireEvent.click(within(nav()).getByRole('link', { name: 'Dashboard' }))
    expect(h1()).toHaveTextContent('Dashboard')
  })
})
