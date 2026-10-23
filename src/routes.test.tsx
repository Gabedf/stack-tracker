import { fireEvent, render, screen, within } from '@testing-library/react'
import { lazy } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeAll, describe, expect, it } from 'vitest'
import { AppLayout } from './components/layout'
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

beforeAll(() => import('./views'))

/** As views carregam sob demanda (React.lazy): espera o h1 com o título da rota. */
function h1(nome: string | RegExp) {
  return screen.findByRole('heading', { level: 1, name: nome }, { timeout: 3000 })
}

function nav() {
  return screen.getByRole('navigation', { name: 'Principal' })
}

describe('rotas', () => {
  it.each([
    ['/', 'Dashboard', 'Dashboard · Painel de Stacks'],
    ['/stacks', 'Stacks', 'Stacks · Painel de Stacks'],
    ['/curriculo', 'Currículo', 'Currículo · Painel de Stacks'],
    ['/dados', 'Dados', 'Dados · Painel de Stacks'],
    ['/ficha', 'Ficha do personagem', 'Ficha do personagem · Painel de Stacks'],
    ['/stacks/nova', 'Nova stack', 'Nova stack · Painel de Stacks'],
    ['/stacks/react/editar', 'Editar stack', 'Editar stack · Painel de Stacks'],
  ])('%s renderiza o placeholder %s', async (rota, titulo, tituloAba) => {
    renderEm(rota)
    expect(await h1(titulo)).toBeInTheDocument()
    expect(document.title).toBe(tituloAba)
  })

  it('/stacks/:id mostra o id da rota', async () => {
    renderEm('/stacks/react-123')
    expect(await h1(/Detalhe da stack/)).toBeInTheDocument()
    expect(screen.getByText('react-123')).toBeInTheDocument()
    expect(document.title).toBe('Stack react-123 · Painel de Stacks')
  })

  it('rota desconhecida mostra a página 404', async () => {
    renderEm('/nao-existe/mesmo')
    expect(await h1('Página não encontrada')).toBeInTheDocument()
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

describe('carregamento sob demanda', () => {
  it('mostra "Carregando…" no <main> enquanto a view carrega, com o layout já visível', () => {
    const ViewPendente = lazy(() => new Promise<never>(() => {}))
    render(
      <ThemeProvider>
        <MemoryRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<ViewPendente />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </ThemeProvider>,
    )
    expect(within(screen.getByRole('main')).getByRole('status')).toHaveTextContent('Carregando…')
    expect(nav()).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Tema:/ })).toBeInTheDocument()
  })
})

describe('link de dados', () => {
  it('fica no cabeçalho, fora da navegação principal, e abre /dados', async () => {
    renderEm('/')
    expect(within(nav()).queryByRole('link', { name: 'Dados' })).not.toBeInTheDocument()
    const link = within(screen.getByRole('banner')).getByRole('link', { name: 'Dados' })
    expect(link).toHaveAttribute('href', '/dados')

    fireEvent.click(link)
    expect(await h1('Dados')).toBeInTheDocument()
    expect(link).toHaveAttribute('aria-current', 'page')
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

  it('clicar nos links navega e move o aria-current', async () => {
    renderEm('/')
    expect(within(nav()).getByRole('link', { name: 'Dashboard' })).toHaveAttribute(
      'aria-current',
      'page',
    )

    fireEvent.click(within(nav()).getByRole('link', { name: 'Currículo' }))
    expect(await h1('Currículo')).toBeInTheDocument()
    expect(within(nav()).getByRole('link', { name: 'Currículo' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(within(nav()).getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute(
      'aria-current',
    )

    fireEvent.click(within(nav()).getByRole('link', { name: 'Stacks' }))
    expect(await h1('Stacks')).toBeInTheDocument()
    expect(within(nav()).getByRole('link', { name: 'Stacks' })).toHaveAttribute(
      'aria-current',
      'page',
    )

    fireEvent.click(within(nav()).getByRole('link', { name: 'Dashboard' }))
    expect(await h1('Dashboard')).toBeInTheDocument()
  })
})
