import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { Stack, StacksFile } from '../domain/types'
import { StacksProvider } from '../features/stacks'
import { StorageError, type StorageAdapter } from '../storage'
import { HOJE_SEED, stacksDoSeed } from '../test/seed'
import { EditStackView } from './EditStackView'
import { NewStackView } from './NewStackView'
import { StackDetailView } from './StackDetailView'
import { StacksView } from './StacksView'

/** Adapter em memória que registra cada chamada a salvar. */
class AdapterFake implements StorageAdapter {
  dados: StacksFile
  falharSalvar: StorageError | null = null
  constructor(stacks: Stack[]) {
    this.dados = { versao: 1, stacks: structuredClone(stacks) }
  }
  readonly carregar = vi.fn(async (): Promise<StacksFile> => structuredClone(this.dados))
  readonly salvar = vi.fn(async (dados: StacksFile): Promise<StacksFile> => {
    if (this.falharSalvar) throw this.falharSalvar
    this.dados = structuredClone(dados)
    return structuredClone(this.dados)
  })
  /** Arquivo enviado na última chamada a salvar. */
  ultimoSalvo(): StacksFile {
    const chamada = this.salvar.mock.lastCall
    if (!chamada) throw new Error('salvar não foi chamado')
    return chamada[0]
  }
}

function Local() {
  return <span data-testid="local">{useLocation().pathname}</span>
}

function renderApp(rota: string, adapter = new AdapterFake(stacksDoSeed())) {
  render(
    <StacksProvider adapter={adapter} hoje={HOJE_SEED}>
      <MemoryRouter initialEntries={[rota]}>
        <Routes>
          <Route path="/stacks" element={<StacksView hoje={HOJE_SEED} />} />
          <Route path="/stacks/nova" element={<NewStackView hoje={HOJE_SEED} />} />
          <Route path="/stacks/:id" element={<StackDetailView />} />
          <Route path="/stacks/:id/editar" element={<EditStackView hoje={HOJE_SEED} />} />
        </Routes>
        <Local />
      </MemoryRouter>
    </StacksProvider>,
  )
  return adapter
}

const local = () => screen.getByTestId('local').textContent
const campo = (rotulo: string) => screen.getByLabelText(rotulo)
const digitar = (rotulo: string, valor: string) =>
  fireEvent.change(campo(rotulo), { target: { value: valor } })
const botao = (nome: string) => screen.getByRole('button', { name: nome })

describe('criar stack', () => {
  it('a partir da lista, grava a stack nova no JSON e abre o detalhe', async () => {
    const adapter = renderApp('/stacks')
    fireEvent.click(await screen.findByRole('link', { name: 'Nova stack' }))
    expect(local()).toBe('/stacks/nova')

    await screen.findByRole('form', { name: 'Nova stack' })
    digitar('Nome', 'Vue')
    digitar('Categoria', 'Frontend')
    digitar('Tags', 'ui, spa')
    digitar('Teoria', '7')
    digitar('Prática', '6.5')
    digitar('Profundidade', '5')
    digitar('Último uso', '2026-10-01')
    digitar('Tipo de experiência', 'projeto_pessoal')
    digitar('Meses de experiência', '10')
    digitar('Notas', 'Composition API')
    fireEvent.click(botao('Salvar'))

    await waitFor(() => expect(local()).toBe('/stacks/vue'))
    expect(adapter.salvar).toHaveBeenCalledTimes(1)
    const salvo = adapter.ultimoSalvo()
    expect(salvo.stacks).toHaveLength(6)
    expect(salvo.stacks.at(-1)).toEqual({
      id: 'vue',
      nome: 'Vue',
      categoria: 'Frontend',
      tags: ['ui', 'spa'],
      dimensoes: { teoria: 7, pratica: 6.5, profundidade: 5, ultimoUso: '2026-10-01' },
      experiencia: { tipo: 'projeto_pessoal', meses: 10 },
      evidencias: [],
      historico: [
        {
          data: '2026-10-23',
          dimensoes: { teoria: 7, pratica: 6.5, profundidade: 5, ultimoUso: '2026-10-01' },
          nota: expect.any(Number),
        },
      ],
      notas: 'Composition API',
    })
    expect(adapter.dados.stacks.map((s) => s.id)).toContain('vue')
  })

  it('validação bloqueia nome vazio com erro acessível e não salva', async () => {
    const adapter = renderApp('/stacks/nova')
    await screen.findByRole('form', { name: 'Nova stack' })
    digitar('Categoria', 'Frontend')
    fireEvent.click(botao('Salvar'))

    const nome = campo('Nome')
    await waitFor(() => expect(nome).toHaveFocus())
    expect(nome).toHaveAttribute('aria-invalid', 'true')
    expect(nome).toHaveAccessibleDescription('O nome não pode ficar vazio.')
    expect(adapter.salvar).not.toHaveBeenCalled()
    expect(local()).toBe('/stacks/nova')
  })

  it('falha do adapter mostra alerta, mantém o que foi digitado e permite tentar de novo', async () => {
    const adapter = new AdapterFake(stacksDoSeed())
    adapter.falharSalvar = new StorageError('Não foi possível salvar as stacks.', ['disco cheio'])
    renderApp('/stacks/nova', adapter)
    await screen.findByRole('form', { name: 'Nova stack' })
    digitar('Nome', 'Vue')
    digitar('Categoria', 'Frontend')
    digitar('Notas', 'rascunho importante')
    fireEvent.click(botao('Salvar'))

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent('Não foi possível salvar as stacks.')
    expect(alerta).toHaveTextContent('disco cheio')
    expect(local()).toBe('/stacks/nova')
    expect(campo('Nome')).toHaveValue('Vue')
    expect(campo('Categoria')).toHaveValue('Frontend')
    expect(campo('Notas')).toHaveValue('rascunho importante')
    expect(adapter.dados.stacks).toHaveLength(5)

    adapter.falharSalvar = null
    fireEvent.click(botao('Salvar'))
    await waitFor(() => expect(local()).toBe('/stacks/vue'))
    expect(adapter.dados.stacks).toHaveLength(6)
  })

  it('Cancelar volta para a lista sem salvar', async () => {
    const adapter = renderApp('/stacks/nova')
    await screen.findByRole('form', { name: 'Nova stack' })
    digitar('Nome', 'Vue')
    fireEvent.click(botao('Cancelar'))
    expect(local()).toBe('/stacks')
    expect(adapter.salvar).not.toHaveBeenCalled()
  })
})

describe('editar stack', () => {
  it('mantém o id, altera os campos e volta ao detalhe', async () => {
    const adapter = renderApp('/stacks/react/editar')
    await screen.findByRole('form', { name: 'Editar React' })
    expect(campo('Nome')).toHaveValue('React')

    digitar('Nome', 'React 19')
    digitar('Tags', 'ui, server components')
    digitar('Prática', '10')
    fireEvent.click(botao('Salvar'))

    await waitFor(() => expect(local()).toBe('/stacks/react'))
    const salvo = adapter.ultimoSalvo()
    expect(salvo.stacks).toHaveLength(5)
    const original = stacksDoSeed().find((s) => s.id === 'react')!
    const editada = salvo.stacks.find((s) => s.id === 'react')!
    expect(editada.nome).toBe('React 19')
    expect(editada.tags).toEqual(['ui', 'server components'])
    expect(editada.dimensoes.pratica).toBe(10)
    expect(editada.categoria).toBe(original.categoria)
    expect(editada.evidencias).toEqual(original.evidencias)
    expect(salvo.stacks.filter((s) => s.nome === 'React 19')).toHaveLength(1)
  })

  it('Cancelar volta ao detalhe sem salvar', async () => {
    const adapter = renderApp('/stacks/react/editar')
    await screen.findByRole('form', { name: 'Editar React' })
    fireEvent.click(botao('Cancelar'))
    expect(local()).toBe('/stacks/react')
    expect(adapter.salvar).not.toHaveBeenCalled()
  })

  it('id inexistente mostra mensagem e link para a lista', async () => {
    renderApp('/stacks/nao-existe/editar')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Stack não encontrada' }),
    ).toBeInTheDocument()
    expect(screen.getByText('nao-existe')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: 'Voltar para Stacks' }))
    expect(local()).toBe('/stacks')
  })

  it('o detalhe tem link para editar', async () => {
    renderApp('/stacks/react')
    fireEvent.click(screen.getByRole('link', { name: 'Editar stack' }))
    expect(await screen.findByRole('form', { name: 'Editar React' })).toBeInTheDocument()
    expect(local()).toBe('/stacks/react/editar')
  })
})

describe('excluir stack', () => {
  async function abrirConfirmacao() {
    await screen.findByRole('form', { name: 'Editar React' })
    const excluir = botao('Excluir stack')
    expect(excluir).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(excluir)
    expect(excluir).toHaveAttribute('aria-expanded', 'true')
    const grupo = screen.getByRole('group', { name: 'Excluir “React”?' })
    await waitFor(() =>
      expect(within(grupo).getByRole('button', { name: 'Cancelar exclusão' })).toHaveFocus(),
    )
    return grupo
  }

  it('com confirmação remove do JSON e navega para a lista', async () => {
    const adapter = renderApp('/stacks/react/editar')
    const grupo = await abrirConfirmacao()
    expect(adapter.salvar).not.toHaveBeenCalled()

    fireEvent.click(within(grupo).getByRole('button', { name: 'Confirmar exclusão' }))

    await waitFor(() => expect(local()).toBe('/stacks'))
    const salvo = adapter.ultimoSalvo()
    expect(salvo.stacks).toHaveLength(4)
    expect(salvo.stacks.map((s) => s.id)).not.toContain('react')
  })

  it('cancelar a confirmação não remove e devolve o foco', async () => {
    const adapter = renderApp('/stacks/react/editar')
    const grupo = await abrirConfirmacao()

    fireEvent.click(within(grupo).getByRole('button', { name: 'Cancelar exclusão' }))
    expect(screen.queryByRole('group', { name: 'Excluir “React”?' })).not.toBeInTheDocument()
    expect(botao('Excluir stack')).toHaveFocus()

    // Esc também cancela.
    const denovo = await abrirConfirmacao()
    fireEvent.keyDown(within(denovo).getByRole('button', { name: 'Cancelar exclusão' }), {
      key: 'Escape',
    })
    expect(screen.queryByRole('group', { name: 'Excluir “React”?' })).not.toBeInTheDocument()
    expect(botao('Excluir stack')).toHaveFocus()

    expect(adapter.salvar).not.toHaveBeenCalled()
    expect(local()).toBe('/stacks/react/editar')
  })

  it('falha ao excluir mostra alerta e mantém a stack', async () => {
    const adapter = new AdapterFake(stacksDoSeed())
    adapter.falharSalvar = new StorageError('Não foi possível salvar as stacks.')
    renderApp('/stacks/react/editar', adapter)
    const grupo = await abrirConfirmacao()

    fireEvent.click(within(grupo).getByRole('button', { name: 'Confirmar exclusão' }))

    expect(await within(grupo).findByRole('alert')).toHaveTextContent(
      'Não foi possível salvar as stacks.',
    )
    expect(local()).toBe('/stacks/react/editar')
    expect(adapter.dados.stacks.map((s) => s.id)).toContain('react')
  })
})
