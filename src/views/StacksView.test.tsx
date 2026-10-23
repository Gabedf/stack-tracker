import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { Stack, StacksFile } from '../domain/types'
import { StacksProvider } from '../features/stacks'
import { StorageError, type StorageAdapter } from '../storage'
import { HOJE_SEED, stacksDoSeed } from '../test/seed'
import { StacksView } from './StacksView'

class AdapterFake implements StorageAdapter {
  falharCarregar: StorageError | null = null
  pendente = false
  private readonly stacks: Stack[]
  constructor(stacks: Stack[]) {
    this.stacks = stacks
  }
  readonly carregar = vi.fn(async (): Promise<StacksFile> => {
    if (this.pendente) return new Promise<StacksFile>(() => {})
    if (this.falharCarregar) throw this.falharCarregar
    return { versao: 1, stacks: structuredClone(this.stacks) }
  })
  readonly salvar = vi.fn(async (dados: StacksFile) => dados)
}

/** Mostra a query string atual para conferir o que foi para a URL. */
function QueryAtual() {
  return <span data-testid="query">{useLocation().search}</span>
}

function renderView(rota = '/stacks', adapter = new AdapterFake(stacksDoSeed())) {
  render(
    <StacksProvider adapter={adapter} hoje={HOJE_SEED}>
      <MemoryRouter initialEntries={[rota]}>
        <Routes>
          <Route
            path="/stacks"
            element={
              <>
                <StacksView hoje={HOJE_SEED} />
                <QueryAtual />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </StacksProvider>,
  )
  return adapter
}

async function esperarLista() {
  return screen.findByRole('list', { name: 'Stacks' })
}

/** Nomes das stacks visíveis, na ordem (funciona em grade e em lista). */
function nomesVisiveis(): string[] {
  const lista = screen.queryByRole('list', { name: 'Stacks' })
  if (!lista) return []
  return within(lista)
    .getAllByRole('heading', { level: 2 })
    .map((h) => h.textContent ?? '')
}

function contador() {
  return screen.getByText(/^\d+ de \d+ stacks?$/)
}

function query() {
  return new URLSearchParams(screen.getByTestId('query').textContent ?? '')
}

const filtros = () => screen.getByRole('search', { name: 'Filtrar stacks' })
const campo = (nome: string) => within(filtros()).getByLabelText(nome)

describe('StacksView', () => {
  it('mostra o carregamento enquanto os dados não chegam', () => {
    const adapter = new AdapterFake(stacksDoSeed())
    adapter.pendente = true
    renderView('/stacks', adapter)
    expect(screen.getByRole('status')).toHaveTextContent('Carregando stacks…')
    expect(screen.getByRole('heading', { level: 1, name: 'Stacks' })).toBeInTheDocument()
  })

  it('renderiza os 5 cards do seed, por nota, com contador acessível', async () => {
    renderView()
    const lista = await esperarLista()
    expect(within(lista).getAllByRole('article')).toHaveLength(5)
    expect(nomesVisiveis()).toEqual(['React', 'Node.js', 'jQuery', 'Kubernetes', 'PostgreSQL'])
    expect(contador()).toHaveTextContent('5 de 5 stacks')
    expect(contador()).toHaveAttribute('aria-live', 'polite')
  })

  it('mudar filtros reduz a lista, atualiza o contador e a URL', async () => {
    renderView()
    await esperarLista()

    fireEvent.change(campo('Categoria'), { target: { value: 'Frontend' } })
    expect(nomesVisiveis()).toEqual(['React', 'jQuery'])
    expect(contador()).toHaveTextContent('2 de 5 stacks')
    expect(query().get('categoria')).toBe('Frontend')

    fireEvent.change(campo('Nível'), { target: { value: 'praticante' } })
    fireEvent.click(campo('Só prática real (projeto pessoal ou produção)'))
    expect(nomesVisiveis()).toEqual(['jQuery'])
    expect(contador()).toHaveTextContent('1 de 5 stacks')
    expect(Object.fromEntries(query())).toEqual({
      categoria: 'Frontend',
      nivel: 'praticante',
      pratica: 'real',
    })
  })

  it('busca por nome ou tag sem acento', async () => {
    renderView()
    await esperarLista()

    fireEvent.change(campo('Buscar'), { target: { value: 'orquestração' } })
    expect(nomesVisiveis()).toEqual(['Kubernetes'])
    expect(campo('Buscar')).toHaveValue('orquestração')
    expect(query().get('q')).toBe('orquestração')

    fireEvent.change(campo('Buscar'), { target: { value: 'JAVASCRIPT' } })
    expect(nomesVisiveis()).toEqual(['Node.js', 'jQuery'])
  })

  it('ordenação muda a ordem dos cards', async () => {
    renderView()
    await esperarLista()

    fireEvent.change(campo('Ordenar por'), { target: { value: 'nome' } })
    expect(nomesVisiveis()).toEqual(['jQuery', 'Kubernetes', 'Node.js', 'PostgreSQL', 'React'])

    fireEvent.change(campo('Ordenar por'), { target: { value: 'ultimoUso' } })
    expect(nomesVisiveis()).toEqual(['React', 'PostgreSQL', 'Kubernetes', 'Node.js', 'jQuery'])
  })

  it('aplica os filtros vindos da URL', async () => {
    renderView('/stacks?categoria=Frontend&pratica=real&ordem=nome&q=j')
    await esperarLista()

    expect(nomesVisiveis()).toEqual(['jQuery'])
    expect(contador()).toHaveTextContent('1 de 5 stacks')
    expect(campo('Categoria')).toHaveValue('Frontend')
    expect(campo('Ordenar por')).toHaveValue('nome')
    expect(campo('Buscar')).toHaveValue('j')
    expect(campo('Só prática real (projeto pessoal ou produção)')).toBeChecked()
  })

  it('valores inválidos na URL caem no padrão', async () => {
    renderView('/stacks?categoria=Mobile&nivel=guru&ordem=aleatoria&pratica=talvez')
    await esperarLista()

    expect(nomesVisiveis()).toEqual(['React', 'Node.js', 'jQuery', 'Kubernetes', 'PostgreSQL'])
    expect(campo('Categoria')).toHaveValue('todas')
    expect(campo('Nível')).toHaveValue('todos')
    expect(campo('Ordenar por')).toHaveValue('nota')
    expect(campo('Só prática real (projeto pessoal ou produção)')).not.toBeChecked()
  })

  it('sem resultados mostra mensagem e limpar restaura a lista (mantendo a ordenação)', async () => {
    renderView('/stacks?categoria=Dados&pratica=real&q=sql&ordem=nome')
    expect(await screen.findByText('Nenhuma stack corresponde aos filtros.')).toBeInTheDocument()
    expect(contador()).toHaveTextContent('0 de 5 stacks')
    expect(screen.queryByRole('list', { name: 'Stacks' })).not.toBeInTheDocument()

    const vazio = screen.getByText('Nenhuma stack corresponde aos filtros.').parentElement!
    fireEvent.click(within(vazio).getByRole('button', { name: 'Limpar filtros' }))

    expect(nomesVisiveis()).toEqual(['jQuery', 'Kubernetes', 'Node.js', 'PostgreSQL', 'React'])
    expect(contador()).toHaveTextContent('5 de 5 stacks')
    expect(campo('Buscar')).toHaveValue('')
    expect(campo('Categoria')).toHaveValue('todas')
    expect(Object.fromEntries(query())).toEqual({ ordem: 'nome' })
  })

  it('o botão Limpar filtros da barra também restaura', async () => {
    renderView('/stacks?nivel=mestre&q=react')
    await esperarLista()
    expect(nomesVisiveis()).toEqual(['React'])

    fireEvent.click(within(filtros()).getByRole('button', { name: 'Limpar filtros' }))
    expect(nomesVisiveis()).toHaveLength(5)
    expect(campo('Buscar')).toHaveValue('')
    expect(query().toString()).toBe('')
  })

  it('alterna entre grade e lista compacta', async () => {
    renderView()
    await esperarLista()
    const grupo = screen.getByRole('group', { name: 'Visualização' })
    const grade = within(grupo).getByRole('button', { name: 'Grade' })
    const lista = within(grupo).getByRole('button', { name: 'Lista' })
    expect(grade).toHaveAttribute('aria-pressed', 'true')
    expect(lista).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(lista)
    expect(lista).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryAllByRole('article')).toHaveLength(0)
    expect(nomesVisiveis()).toEqual(['React', 'Node.js', 'jQuery', 'Kubernetes', 'PostgreSQL'])
    expect(screen.getByRole('link', { name: 'React' })).toHaveAttribute('href', '/stacks/react')
    expect(query().get('visao')).toBe('lista')

    // Filtros continuam valendo na lista.
    fireEvent.change(campo('Categoria'), { target: { value: 'DevOps' } })
    expect(nomesVisiveis()).toEqual(['Kubernetes'])

    fireEvent.click(grade)
    expect(screen.getAllByRole('article')).toHaveLength(1)
    expect(query().get('visao')).toBeNull()
  })

  it('abre na lista quando a URL pede', async () => {
    renderView('/stacks?visao=lista')
    await esperarLista()
    expect(screen.getByRole('button', { name: 'Lista' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryAllByRole('article')).toHaveLength(0)
  })

  it('erro ao carregar mostra a mensagem e tentar de novo recupera', async () => {
    const adapter = new AdapterFake(stacksDoSeed())
    adapter.falharCarregar = new StorageError('Não foi possível carregar as stacks: sem conexão.')
    renderView('/stacks', adapter)

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent('Não foi possível carregar as stacks.')
    expect(alerta).toHaveTextContent('sem conexão')

    adapter.falharCarregar = null
    fireEvent.click(within(alerta).getByRole('button', { name: 'Tentar de novo' }))

    await esperarLista()
    expect(nomesVisiveis()).toHaveLength(5)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(adapter.carregar).toHaveBeenCalledTimes(2)
  })

  it('sem stacks cadastradas mostra o estado vazio', async () => {
    renderView('/stacks', new AdapterFake([]))
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Adicione sua primeira stack' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('search')).not.toBeInTheDocument()
  })
})
