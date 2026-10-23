import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { Stack, StacksFile } from '../domain/types'
import { StacksProvider } from '../features/stacks'
import { StorageError, type StorageAdapter } from '../storage'
import { HOJE_SEED, stacksDoSeed } from '../test/seed'
import { DashboardView } from './DashboardView'

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

function renderView(adapter = new AdapterFake(stacksDoSeed())) {
  render(
    <StacksProvider adapter={adapter} hoje={HOJE_SEED}>
      <MemoryRouter>
        <DashboardView hoje={HOJE_SEED} />
      </MemoryRouter>
    </StacksProvider>,
  )
  return adapter
}

async function esperarResumo() {
  return screen.findByRole('list', { name: 'Resumo' })
}

/** Tile do resumo pelo rótulo. */
function tile(rotulo: string): HTMLElement {
  const resumo = screen.getByRole('list', { name: 'Resumo' })
  const item = within(resumo)
    .getAllByRole('listitem')
    .find((li) => li.textContent?.startsWith(rotulo))
  if (!item) throw new Error(`Tile "${rotulo}" não encontrado`)
  return item
}

function regiao(nome: string) {
  return screen.getByRole('region', { name: nome })
}

/*
 * Valores esperados do seed com hoje = 23/10/2026 (conta à mão em
 * src/features/dashboard/dashboardStats.test.ts):
 * notas react 8,4 · nodejs 5,5 · jquery 4,9 (decaimento 20%) · kubernetes 3,8 · postgresql 2,6.
 */
describe('DashboardView', () => {
  it('mostra o carregamento enquanto os dados não chegam', () => {
    const adapter = new AdapterFake(stacksDoSeed())
    adapter.pendente = true
    renderView(adapter)
    expect(screen.getByRole('status')).toHaveTextContent('Carregando stacks…')
  })

  it('mostra o erro de carregamento', async () => {
    const adapter = new AdapterFake(stacksDoSeed())
    adapter.falharCarregar = new StorageError('Arquivo inválido')
    renderView(adapter)
    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent('Não foi possível carregar as stacks.')
    expect(within(alerta).getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
  })

  it('sem stacks mostra o estado vazio com link para adicionar', async () => {
    renderView(new AdapterFake([]))
    const vazio = await screen.findByRole('region', { name: 'Nenhuma stack para resumir' })
    expect(within(vazio).getByRole('link', { name: 'Adicionar stacks' })).toHaveAttribute(
      'href',
      '/stacks',
    )
    expect(screen.queryByRole('list', { name: 'Resumo' })).not.toBeInTheDocument()
  })

  it('mostra os números do seed nos tiles', async () => {
    renderView()
    await esperarResumo()

    expect(tile('Stacks')).toHaveTextContent(/^Stacks5tecnologias no painel/)
    expect(tile('Nota média')).toHaveTextContent('5,0')
    expect(within(tile('Nota média')).getByText('Praticante')).toBeInTheDocument()
    expect(tile('Prática real')).toHaveTextContent(/^Prática real3de 5 /)
    expect(tile('Sei por saber')).toHaveTextContent(/^Sei por saber1/)
    expect(tile('Evidências')).toHaveTextContent(/^Evidências7/)
  })

  it('tiles com filtro levam à lista filtrada', async () => {
    renderView()
    await esperarResumo()

    expect(within(tile('Stacks')).getByRole('link')).toHaveAttribute('href', '/stacks')
    expect(within(tile('Prática real')).getByRole('link')).toHaveAttribute(
      'href',
      '/stacks?pratica=real',
    )
    for (const rotulo of ['Nota média', 'Sei por saber', 'Evidências']) {
      expect(within(tile(rotulo)).queryByRole('link')).not.toBeInTheDocument()
    }
  })

  it('mostra a distribuição pelas 5 faixas, com link só nas que têm stacks', async () => {
    renderView()
    await esperarResumo()

    const lista = within(regiao('Distribuição por nível')).getByRole('list', {
      name: 'Stacks por nível',
    })
    const linhas = within(lista).getAllByRole('listitem')
    expect(linhas.map((li) => li.textContent)).toEqual([
      'Iniciante0 stacks',
      'Aprendiz2 stacks',
      'Praticante2 stacks',
      'Sênior0 stacks',
      'Mestre1 stack',
    ])

    const links = within(lista).getAllByRole('link')
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/stacks?nivel=aprendiz',
      '/stacks?nivel=praticante',
      '/stacks?nivel=mestre',
    ])
  })

  it('lista o top 3 com links para o detalhe', async () => {
    renderView()
    await esperarResumo()

    const itens = within(regiao('Top 3')).getAllByRole('listitem')
    expect(itens).toHaveLength(3)
    const esperado = [
      ['React', '/stacks/react', '8,4'],
      ['Node.js', '/stacks/nodejs', '5,5'],
      ['jQuery', '/stacks/jquery', '4,9'],
    ]
    itens.forEach((item, i) => {
      const [nome, href, nota] = esperado[i]
      expect(within(item).getByRole('link', { name: nome })).toHaveAttribute('href', href)
      expect(item).toHaveTextContent(`Nota: ${nota}`)
    })
  })

  it('lista as stacks esfriando com a perda de nota', async () => {
    renderView()
    await esperarResumo()

    const itens = within(regiao('Esfriando')).getAllByRole('listitem')
    expect(itens).toHaveLength(1)
    const [jquery] = itens
    expect(within(jquery).getByRole('link', { name: 'jQuery' })).toHaveAttribute(
      'href',
      '/stacks/jquery',
    )
    expect(jquery).toHaveTextContent('Sem uso há 55 meses')
    expect(jquery).toHaveTextContent('6,1')
    expect(jquery).toHaveTextContent('4,9')
    expect(jquery).toHaveTextContent('(−20%)')
  })

  it('avisa quando nenhuma stack está esfriando', async () => {
    renderView(new AdapterFake(stacksDoSeed().filter((s) => s.id !== 'jquery')))
    await esperarResumo()
    expect(regiao('Esfriando')).toHaveTextContent('Nenhuma stack perdendo nota por falta de uso.')
  })

  it('reserva as seções de categoria e teoria × prática', async () => {
    renderView()
    await esperarResumo()
    expect(regiao('Por categoria')).toHaveTextContent('Em breve')
    expect(regiao('Teoria × prática')).toHaveTextContent('Em breve')
  })
})
