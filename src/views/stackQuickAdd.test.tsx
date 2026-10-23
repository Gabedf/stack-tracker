import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { Stack, StacksFile } from '../domain/types'
import { StacksProvider } from '../features/stacks'
import { StorageError, type StorageAdapter } from '../storage'
import { HOJE_SEED, stacksDoSeed } from '../test/seed'
import { EditStackView } from './EditStackView'
import { NewStackView } from './NewStackView'
import { StacksView } from './StacksView'

/** Adapter em memória que registra cada chamada a salvar. */
class AdapterFake implements StorageAdapter {
  dados: StacksFile
  falharSalvar: StorageError | null = null
  /** Se definido, salvar só resolve quando esta promessa resolver. */
  segurarSalvar: Promise<void> | null = null
  constructor(stacks: Stack[]) {
    this.dados = { versao: 1, stacks: structuredClone(stacks) }
  }
  readonly carregar = vi.fn(async (): Promise<StacksFile> => structuredClone(this.dados))
  readonly salvar = vi.fn(async (dados: StacksFile): Promise<StacksFile> => {
    if (this.segurarSalvar) await this.segurarSalvar
    if (this.falharSalvar) throw this.falharSalvar
    this.dados = structuredClone(dados)
    return structuredClone(this.dados)
  })
  ultimoSalvo(): StacksFile {
    const chamada = this.salvar.mock.lastCall
    if (!chamada) throw new Error('salvar não foi chamado')
    return chamada[0]
  }
}

function Local() {
  return <span data-testid="local">{useLocation().pathname}</span>
}

function renderApp(rota = '/stacks', adapter = new AdapterFake(stacksDoSeed())) {
  render(
    <StacksProvider adapter={adapter} hoje={HOJE_SEED}>
      <MemoryRouter initialEntries={[rota]}>
        <Routes>
          <Route path="/stacks" element={<StacksView hoje={HOJE_SEED} />} />
          <Route path="/stacks/nova" element={<NewStackView hoje={HOJE_SEED} />} />
          <Route path="/stacks/:id/editar" element={<EditStackView hoje={HOJE_SEED} />} />
        </Routes>
        <Local />
      </MemoryRouter>
    </StacksProvider>,
  )
  return adapter
}

const local = () => screen.getByTestId('local').textContent
const quickAdd = () => screen.getByRole('form', { name: 'Adição rápida de stack' })
const campo = (rotulo: 'Nome' | 'Categoria') => within(quickAdd()).getByLabelText(rotulo)
const digitar = (rotulo: 'Nome' | 'Categoria', valor: string) =>
  fireEvent.change(campo(rotulo), { target: { value: valor } })
/** Enter num campo de texto submete o formulário; no jsdom simulamos o submit. */
const enviar = () => fireEvent.submit(quickAdd())
const botaoAdicionar = () => within(quickAdd()).getByRole('button', { name: /Adicion/ })

function nomesNaLista(): string[] {
  const lista = screen.queryByRole('list', { name: 'Stacks' })
  if (!lista) return []
  return within(lista)
    .getAllByRole('heading', { level: 2 })
    .map((h) => h.textContent ?? '')
}

describe('adição rápida', () => {
  it('grava a stack nova com defaults e o card aparece na lista', async () => {
    const adapter = renderApp()
    await screen.findByRole('list', { name: 'Stacks' })

    const opcoes = quickAdd().querySelectorAll('datalist option')
    expect([...opcoes].map((o) => o.getAttribute('value'))).toEqual(
      expect.arrayContaining(['Frontend', 'DevOps']),
    )

    digitar('Nome', '  Vue  ')
    digitar('Categoria', 'Frontend')
    enviar()

    await waitFor(() => expect(nomesNaLista()).toContain('Vue'))
    expect(adapter.salvar).toHaveBeenCalledTimes(1)
    const salvo = adapter.ultimoSalvo()
    expect(salvo.stacks).toHaveLength(6)
    const dimensoes = { teoria: 0, pratica: 0, profundidade: 0, ultimoUso: '2026-10-23' }
    expect(salvo.stacks.at(-1)).toEqual({
      id: 'vue',
      nome: 'Vue',
      categoria: 'Frontend',
      tags: [],
      dimensoes,
      experiencia: { tipo: 'so_teoria', meses: 0 },
      evidencias: [],
      historico: [{ data: '2026-10-23', dimensoes, nota: expect.any(Number) }],
    })

    // Limpa, devolve o foco ao nome e confirma de forma discreta.
    expect(campo('Nome')).toHaveValue('')
    expect(campo('Categoria')).toHaveValue('')
    await waitFor(() => expect(campo('Nome')).toHaveFocus())
    const status = within(quickAdd()).getByRole('status')
    expect(status).toHaveAttribute('aria-live', 'polite')
    expect(status).toHaveTextContent('“Vue” adicionada.')
  })

  it('o link Refinar aponta para a edição da stack nova', async () => {
    renderApp()
    await screen.findByRole('list', { name: 'Stacks' })
    digitar('Nome', 'Vue')
    digitar('Categoria', 'Frontend')
    enviar()

    const refinar = await within(quickAdd()).findByRole('link', { name: 'Refinar Vue' })
    expect(refinar).toHaveAttribute('href', '/stacks/vue/editar')
    fireEvent.click(refinar)
    expect(local()).toBe('/stacks/vue/editar')
    expect(await screen.findByRole('form', { name: 'Editar Vue' })).toBeInTheDocument()
  })

  it('valida campos vazios com mensagens acessíveis e não salva', async () => {
    const adapter = renderApp()
    await screen.findByRole('list', { name: 'Stacks' })

    digitar('Nome', '   ')
    enviar()

    const nome = campo('Nome')
    const categoria = campo('Categoria')
    await waitFor(() => expect(nome).toHaveFocus())
    expect(nome).toHaveAttribute('aria-invalid', 'true')
    expect(nome).toHaveAccessibleDescription('O nome não pode ficar vazio.')
    expect(categoria).toHaveAttribute('aria-invalid', 'true')
    expect(categoria).toHaveAccessibleDescription('A categoria não pode ficar vazia.')

    digitar('Nome', 'Vue')
    expect(nome).not.toHaveAttribute('aria-invalid')
    enviar()
    await waitFor(() => expect(categoria).toHaveFocus())
    expect(categoria).toHaveAttribute('aria-invalid', 'true')

    expect(adapter.salvar).not.toHaveBeenCalled()
    expect(nomesNaLista()).toHaveLength(5)
  })

  it('falha do adapter mostra alerta e mantém o que foi digitado', async () => {
    const adapter = new AdapterFake(stacksDoSeed())
    adapter.falharSalvar = new StorageError('Não foi possível salvar as stacks.', ['disco cheio'])
    renderApp('/stacks', adapter)
    await screen.findByRole('list', { name: 'Stacks' })

    digitar('Nome', 'Vue')
    digitar('Categoria', 'Frontend')
    enviar()

    const alerta = await within(quickAdd()).findByRole('alert')
    expect(alerta).toHaveTextContent('Não foi possível salvar as stacks.')
    expect(alerta).toHaveTextContent('disco cheio')
    expect(campo('Nome')).toHaveValue('Vue')
    expect(campo('Categoria')).toHaveValue('Frontend')
    expect(within(quickAdd()).getByRole('status')).toBeEmptyDOMElement()
    expect(adapter.dados.stacks).toHaveLength(5)
    expect(nomesNaLista()).not.toContain('Vue')

    adapter.falharSalvar = null
    enviar()
    await waitFor(() => expect(nomesNaLista()).toContain('Vue'))
    expect(within(quickAdd()).queryByRole('alert')).not.toBeInTheDocument()
  })

  it('desabilita campos e botão enquanto salva', async () => {
    const adapter = new AdapterFake(stacksDoSeed())
    let liberar!: () => void
    adapter.segurarSalvar = new Promise<void>((r) => (liberar = r))
    renderApp('/stacks', adapter)
    await screen.findByRole('list', { name: 'Stacks' })

    digitar('Nome', 'Vue')
    digitar('Categoria', 'Frontend')
    enviar()

    await waitFor(() => expect(botaoAdicionar()).toBeDisabled())
    expect(botaoAdicionar()).toHaveTextContent('Adicionando…')
    expect(campo('Nome')).toBeDisabled()
    expect(campo('Categoria')).toBeDisabled()
    enviar()
    expect(adapter.salvar).toHaveBeenCalledTimes(1)

    liberar()
    await waitFor(() => expect(botaoAdicionar()).toBeEnabled())
    expect(botaoAdicionar()).toHaveTextContent('Adicionar')
    expect(adapter.dados.stacks).toHaveLength(6)
  })
})

describe('estado vazio', () => {
  it('com zero stacks explica o painel e oferece adição rápida e formulário completo', async () => {
    renderApp('/stacks', new AdapterFake([]))
    const titulo = await screen.findByRole('heading', {
      level: 2,
      name: 'Adicione sua primeira stack',
    })
    const vazio = titulo.closest('section')!
    expect(vazio).toHaveTextContent(/calcula uma nota de domínio/)
    expect(screen.queryByRole('search')).not.toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Stacks' })).not.toBeInTheDocument()
    expect(quickAdd()).toBeInTheDocument()

    const completo = within(vazio).getByRole('link', { name: /formulário completo/ })
    expect(completo).toHaveAttribute('href', '/stacks/nova')
    fireEvent.click(completo)
    expect(local()).toBe('/stacks/nova')
  })

  it('adicionar pela adição rápida sai do estado vazio', async () => {
    const adapter = renderApp('/stacks', new AdapterFake([]))
    await screen.findByRole('heading', { name: 'Adicione sua primeira stack' })

    digitar('Nome', 'Go')
    digitar('Categoria', 'Backend')
    enviar()

    await waitFor(() => expect(nomesNaLista()).toEqual(['Go']))
    expect(
      screen.queryByRole('heading', { name: 'Adicione sua primeira stack' }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('search', { name: 'Filtrar stacks' })).toBeInTheDocument()
    expect(adapter.ultimoSalvo().stacks.map((s) => s.id)).toEqual(['go'])

    // O mesmo formulário segue montado: confirmação e foco preservados.
    expect(within(quickAdd()).getByRole('status')).toHaveTextContent('“Go” adicionada.')
    await waitFor(() => expect(campo('Nome')).toHaveFocus())
  })
})
