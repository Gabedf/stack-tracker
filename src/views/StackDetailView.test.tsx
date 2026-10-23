import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { formatarNota } from '../components/formatacao'
import { calcularNota, detalharNota } from '../domain/scoring'
import type { Stack, StacksFile } from '../domain/types'
import { StacksProvider } from '../features/stacks'
import { StorageError, type StorageAdapter } from '../storage'
import { HOJE_SEED, stackDoSeed, stacksDoSeed } from '../test/seed'
import { StackDetailView } from './StackDetailView'

/** Adapter em memória que registra cada chamada a salvar. */
class AdapterFake implements StorageAdapter {
  dados: StacksFile
  falharSalvar: StorageError | null = null
  constructor(stacks: Stack[] = stacksDoSeed()) {
    this.dados = { versao: 1, stacks: structuredClone(stacks) }
  }
  readonly carregar = vi.fn(async (): Promise<StacksFile> => structuredClone(this.dados))
  readonly salvar = vi.fn(async (dados: StacksFile): Promise<StacksFile> => {
    if (this.falharSalvar) throw this.falharSalvar
    this.dados = structuredClone(dados)
    return structuredClone(this.dados)
  })
  /** Stack com o id informado no último arquivo enviado a salvar. */
  ultimaSalva(id: string): Stack {
    const chamada = this.salvar.mock.lastCall
    if (!chamada) throw new Error('salvar não foi chamado')
    const stack = chamada[0].stacks.find((s) => s.id === id)
    if (!stack) throw new Error(`Stack "${id}" não foi salva`)
    return stack
  }
}

function Local() {
  return <span data-testid="local">{useLocation().pathname}</span>
}

function renderDetalhe(id: string, adapter: StorageAdapter = new AdapterFake()) {
  render(
    <StacksProvider adapter={adapter} hoje={HOJE_SEED}>
      <MemoryRouter initialEntries={[`/stacks/${id}`]}>
        <Routes>
          <Route path="/stacks/:id" element={<StackDetailView hoje={HOJE_SEED} />} />
          <Route path="/stacks" element={<h1>Lista de stacks</h1>} />
        </Routes>
        <Local />
      </MemoryRouter>
    </StacksProvider>,
  )
  return adapter
}

const botao = (nome: string, dentro: HTMLElement = document.body) =>
  within(dentro).getByRole('button', { name: nome })
const mudar = (rotulo: string, valor: string) =>
  fireEvent.change(screen.getByLabelText(rotulo), { target: { value: valor } })
const formDimensoes = () => screen.getByRole('form', { name: 'Editar dimensões' })
const formExperiencia = () => screen.getByRole('form', { name: 'Editar experiência' })

const FORMATO_PONTOS = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
})

describe('StackDetailView', () => {
  it('renderiza os dados da stack do seed', async () => {
    renderDetalhe('react')
    const titulo = await screen.findByRole('heading', { level: 1, name: 'React' })
    const cabecalho = titulo.closest('header')!
    const react = stackDoSeed('react')

    expect(within(cabecalho).getByText(react.categoria)).toBeInTheDocument()
    const tags = within(cabecalho).getByRole('list', { name: 'Tags' })
    expect(
      within(tags)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(react.tags)
    expect(cabecalho).toHaveTextContent(
      `Nota: ${formatarNota(calcularNota(react, { hoje: HOJE_SEED }))}`,
    )
    expect(within(cabecalho).getByText('Mestre')).toBeInTheDocument()
    expect(within(cabecalho).getByText('Produção')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Editar stack' })).toHaveAttribute(
      'href',
      '/stacks/react/editar',
    )
    expect(document.title).toBe('React · Painel de Stacks')

    // Editores começam com os valores salvos.
    expect(screen.getByLabelText('Prática')).toHaveValue('8')
    expect(screen.getByLabelText('Último uso')).toHaveValue('2026-10-09')
    expect(screen.getByLabelText('Tipo de experiência')).toHaveValue('producao')
    expect(screen.getByLabelText('Meses de experiência')).toHaveValue(36)

    // Resumo do histórico.
    const evolucao = screen.getByRole('region', { name: 'Evolução' })
    expect(evolucao).toHaveTextContent('5 snapshots · último em 10/10/2026')
    expect(
      within(within(evolucao).getByRole('list', { name: 'Snapshots do histórico' })).getAllByRole(
        'listitem',
      ),
    ).toHaveLength(5)
  })

  it('o link Voltar leva para a lista', async () => {
    renderDetalhe('react')
    fireEvent.click(await screen.findByRole('link', { name: 'Voltar para Stacks' }))
    expect(screen.getByTestId('local')).toHaveTextContent('/stacks')
  })

  it.each(['react', 'jquery', 'nodejs'])(
    'composição da nota de %s bate com detalharNota',
    async (id) => {
      renderDetalhe(id)
      const composicao = await screen.findByRole('region', { name: 'Composição da nota' })
      const detalhe = detalharNota(stackDoSeed(id), { hoje: HOJE_SEED })

      const linhas: [string, keyof typeof detalhe.componentes][] = [
        ['Prática', 'pratica'],
        ['Profundidade', 'profundidade'],
        ['Teoria', 'teoria'],
        ['Evidências', 'evidencias'],
      ]
      for (const [rotulo, componente] of linhas) {
        const { valor, peso, contribuicao } = detalhe.componentes[componente]
        const linha = within(composicao).getByRole('rowheader', { name: rotulo }).closest('tr')!
        const celulas = within(linha)
          .getAllByRole('cell')
          .map((c) => c.textContent)
        expect(celulas).toEqual([
          formatarNota(valor),
          `${Math.round(peso * 100)}%`,
          FORMATO_PONTOS.format(contribuicao),
        ])
      }

      const base = within(composicao).getByRole('rowheader', { name: 'Nota base (soma)' })
      expect(base.closest('tr')).toHaveTextContent(FORMATO_PONTOS.format(detalhe.notaBase))
      expect(composicao).toHaveTextContent(`Nota final${formatarNota(detalhe.nota)} / 10`)

      if (detalhe.fatorDecaimento < 1) {
        const perda = Math.round((1 - detalhe.fatorDecaimento) * 100)
        const meses = Math.floor(detalhe.mesesSemUso)
        expect(composicao).toHaveTextContent(`−${perda}% por ${meses} meses sem uso`)
      } else {
        expect(composicao).toHaveTextContent('Sem perda por recência')
      }
    },
  )

  it('mostra o decaimento por recência de uma stack parada', async () => {
    renderDetalhe('jquery')
    const composicao = await screen.findByRole('region', { name: 'Composição da nota' })
    // jQuery: último uso em 2022-02-25, mais de 36 meses antes de 2026-10-23.
    expect(composicao).toHaveTextContent('−20% por 55 meses sem uso')
  })

  describe('editor de dimensões', () => {
    it('salva via atualizar, persiste e acrescenta 1 snapshot ao histórico', async () => {
      const adapter = renderDetalhe('react') as AdapterFake
      await screen.findByRole('heading', { level: 1, name: 'React' })
      const original = stackDoSeed('react')

      mudar('Prática', '9.5')
      mudar('Último uso', '2026-10-20')
      expect(screen.getByText('9,5')).toBeInTheDocument()
      fireEvent.click(botao('Salvar dimensões'))

      expect(await within(formDimensoes()).findByText('Dimensões salvas.')).toHaveAttribute(
        'role',
        'status',
      )
      expect(adapter.salvar).toHaveBeenCalledTimes(1)
      const salva = adapter.ultimaSalva('react')
      const dimensoes = { ...original.dimensoes, pratica: 9.5, ultimoUso: '2026-10-20' }
      expect(salva.dimensoes).toEqual(dimensoes)
      expect(salva.experiencia).toEqual(original.experiencia)
      expect(salva.historico).toHaveLength(original.historico.length + 1)
      expect(salva.historico.slice(0, -1)).toEqual(original.historico)
      expect(salva.historico.at(-1)).toEqual({
        data: '2026-10-23',
        dimensoes,
        nota: calcularNota(salva, { hoje: HOJE_SEED }),
      })

      // A tela reflete o estado salvo e não há mais nada para salvar.
      expect(botao('Salvar dimensões')).toBeDisabled()
      expect(screen.getByRole('region', { name: 'Evolução' })).toHaveTextContent(
        '6 snapshots · último em 23/10/2026',
      )
      const nota = formatarNota(calcularNota(salva, { hoje: HOJE_SEED }))
      expect(screen.getByRole('heading', { level: 1 }).closest('header')).toHaveTextContent(
        `Nota: ${nota}`,
      )
    })

    it('sem mudança não é possível salvar e nada é gravado', async () => {
      const adapter = renderDetalhe('react') as AdapterFake
      await screen.findByRole('heading', { level: 1, name: 'React' })

      expect(botao('Salvar dimensões')).toBeDisabled()
      expect(botao('Desfazer', formDimensoes())).toBeDisabled()
      fireEvent.submit(formDimensoes())

      // Mudar e voltar ao valor original também não habilita.
      mudar('Teoria', '5')
      expect(botao('Salvar dimensões')).toBeEnabled()
      mudar('Teoria', '9')
      expect(botao('Salvar dimensões')).toBeDisabled()
      fireEvent.submit(formDimensoes())

      await Promise.resolve()
      expect(adapter.salvar).not.toHaveBeenCalled()
      expect(adapter.dados.stacks.find((s) => s.id === 'react')!.historico).toHaveLength(5)
    })

    it('Desfazer volta aos valores salvos sem gravar', async () => {
      const adapter = renderDetalhe('react') as AdapterFake
      await screen.findByRole('heading', { level: 1, name: 'React' })

      mudar('Profundidade', '3')
      fireEvent.click(botao('Desfazer', formDimensoes()))

      expect(screen.getByLabelText('Profundidade')).toHaveValue('8')
      expect(botao('Salvar dimensões')).toBeDisabled()
      expect(adapter.salvar).not.toHaveBeenCalled()
    })

    it('data de último uso inválida mostra o erro e bloqueia o salvar', async () => {
      renderDetalhe('react')
      await screen.findByRole('heading', { level: 1, name: 'React' })

      mudar('Último uso', '')
      const campo = screen.getByLabelText('Último uso')
      expect(campo).toHaveAttribute('aria-invalid', 'true')
      expect(campo).toHaveAccessibleDescription('Data inválida: use o formato AAAA-MM-DD.')
      expect(botao('Salvar dimensões')).toBeDisabled()
    })

    it('erro do adapter mostra alerta e mantém os valores editados', async () => {
      const adapter = new AdapterFake()
      adapter.falharSalvar = new StorageError('Não foi possível salvar as stacks.', ['disco cheio'])
      renderDetalhe('react', adapter)
      await screen.findByRole('heading', { level: 1, name: 'React' })

      mudar('Prática', '9.5')
      fireEvent.click(botao('Salvar dimensões'))

      const alerta = await within(formDimensoes()).findByRole('alert')
      expect(alerta).toHaveTextContent('Não foi possível salvar as stacks.')
      expect(alerta).toHaveTextContent('disco cheio')
      expect(screen.getByLabelText('Prática')).toHaveValue('9.5')
      expect(botao('Salvar dimensões')).toBeEnabled()
      expect(within(formDimensoes()).getByRole('status')).toBeEmptyDOMElement()
      expect(adapter.dados.stacks.find((s) => s.id === 'react')!.dimensoes.pratica).toBe(8)

      // Nova tentativa depois que o problema some.
      adapter.falharSalvar = null
      fireEvent.click(botao('Salvar dimensões'))
      expect(await within(formDimensoes()).findByText('Dimensões salvas.')).toHaveAttribute(
        'role',
        'status',
      )
      expect(within(formDimensoes()).queryByRole('alert')).not.toBeInTheDocument()
      expect(adapter.dados.stacks.find((s) => s.id === 'react')!.dimensoes.pratica).toBe(9.5)
    })
  })

  describe('editor de experiência', () => {
    it('persiste e não gera snapshot quando a nota não muda', async () => {
      const adapter = renderDetalhe('react') as AdapterFake
      await screen.findByRole('heading', { level: 1, name: 'React' })
      const original = stackDoSeed('react')

      mudar('Tipo de experiência', 'estudo')
      mudar('Meses de experiência', '40')
      fireEvent.click(botao('Salvar experiência'))

      expect(await within(formExperiencia()).findByText('Experiência salva.')).toHaveAttribute(
        'role',
        'status',
      )
      expect(adapter.salvar).toHaveBeenCalledTimes(1)
      const salva = adapter.ultimaSalva('react')
      expect(salva.experiencia).toEqual({ tipo: 'estudo', meses: 40 })
      expect(salva.dimensoes).toEqual(original.dimensoes)

      // Experiência não entra na nota: nada mudou, então nenhum snapshot novo.
      expect(calcularNota(salva, { hoje: HOJE_SEED })).toBe(
        calcularNota(original, { hoje: HOJE_SEED }),
      )
      expect(calcularNota(salva, { hoje: HOJE_SEED })).toBe(original.historico.at(-1)!.nota)
      expect(salva.historico).toEqual(original.historico)
      expect(botao('Salvar experiência')).toBeDisabled()
    })

    it('gera snapshot se a nota atual já difere do último snapshot (decaimento)', async () => {
      const adapter = renderDetalhe('jquery') as AdapterFake
      await screen.findByRole('heading', { level: 1, name: 'jQuery' })
      const original = stackDoSeed('jquery')
      const notaAtual = calcularNota(original, { hoje: HOJE_SEED })
      expect(notaAtual).not.toBe(original.historico.at(-1)!.nota)

      mudar('Meses de experiência', '24')
      fireEvent.click(botao('Salvar experiência'))
      expect(await within(formExperiencia()).findByText('Experiência salva.')).toBeInTheDocument()
      expect(adapter.salvar).toHaveBeenCalledTimes(1)

      const salva = adapter.ultimaSalva('jquery')
      expect(salva.historico).toHaveLength(original.historico.length + 1)
      expect(salva.historico.at(-1)).toEqual({
        data: '2026-10-23',
        dimensoes: original.dimensoes,
        nota: notaAtual,
      })
    })

    it('meses inválidos mostram erro e bloqueiam o salvar', async () => {
      const adapter = renderDetalhe('react') as AdapterFake
      await screen.findByRole('heading', { level: 1, name: 'React' })

      mudar('Meses de experiência', '-1')
      const campo = screen.getByLabelText('Meses de experiência')
      expect(campo).toHaveAttribute('aria-invalid', 'true')
      expect(campo).toHaveAccessibleDescription('Meses não pode ser negativo.')
      expect(botao('Salvar experiência')).toBeDisabled()
      fireEvent.submit(formExperiencia())
      expect(adapter.salvar).not.toHaveBeenCalled()
    })

    it('erro do adapter mostra alerta e mantém os valores editados', async () => {
      const adapter = new AdapterFake()
      adapter.falharSalvar = new StorageError('Não foi possível salvar as stacks.')
      renderDetalhe('react', adapter)
      await screen.findByRole('heading', { level: 1, name: 'React' })

      mudar('Tipo de experiência', 'estudo')
      fireEvent.click(botao('Salvar experiência'))

      expect(await within(formExperiencia()).findByRole('alert')).toHaveTextContent(
        'Não foi possível salvar as stacks.',
      )
      expect(screen.getByLabelText('Tipo de experiência')).toHaveValue('estudo')
      expect(adapter.dados.stacks.find((s) => s.id === 'react')!.experiencia.tipo).toBe('producao')
    })
  })

  describe('evidências', () => {
    const regiao = () => screen.getByRole('region', { name: 'Evidências' })
    const itens = () =>
      within(within(regiao()).getByRole('list', { name: 'Lista de evidências' })).getAllByRole(
        'listitem',
      )
    const formNova = () => screen.getByRole('form', { name: 'Nova evidência' })
    const notaNoCabecalho = () =>
      screen.getByRole('heading', { level: 1 }).closest('header')!.textContent

    it('lista tipo, título com link externo e descrição', async () => {
      renderDetalhe('react')
      await screen.findByRole('heading', { level: 1, name: 'React' })
      const react = stackDoSeed('react')

      expect(itens()).toHaveLength(react.evidencias.length)
      const primeiro = itens()[0]
      expect(primeiro).toHaveTextContent('Emprego')
      expect(primeiro).toHaveTextContent(react.evidencias[0].descricao)
      const link = within(primeiro).getByRole('link', {
        name: 'Desenvolvedor frontend na Empresa Exemplo (abre em nova aba)',
      })
      expect(link).toHaveAttribute('href', 'https://empresa.example.com')
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
      expect(
        itens().map((li) => within(li).getByRole('heading', { level: 3 }).textContent),
      ).toEqual(react.evidencias.map((e) => `${e.titulo} (abre em nova aba)`))
    })

    it('evidência sem URL mostra o título sem link', async () => {
      renderDetalhe('jquery')
      await screen.findByRole('heading', { level: 1, name: 'jQuery' })
      const [item] = itens()
      expect(within(item).getByRole('heading', { level: 3 })).toHaveTextContent(
        'Estágio na Agência Exemplo',
      )
      expect(within(item).queryByRole('link')).not.toBeInTheDocument()
    })

    it('stack sem evidências mostra o estado vazio', async () => {
      renderDetalhe('postgresql')
      await screen.findByRole('heading', { level: 1, name: 'PostgreSQL' })
      expect(regiao()).toHaveTextContent('Nenhuma evidência ainda')
      expect(regiao()).toHaveTextContent('evidências aumentam a nota')
      expect(within(regiao()).queryByRole('list')).not.toBeInTheDocument()
      expect(botao('Adicionar evidência', regiao())).toBeInTheDocument()
    })

    it('adicionar persiste, aparece na lista, altera a nota e gera snapshot', async () => {
      const adapter = renderDetalhe('nodejs') as AdapterFake
      await screen.findByRole('heading', { level: 1, name: 'Node.js' })
      const original = stackDoSeed('nodejs')
      const notaAntes = calcularNota(original, { hoje: HOJE_SEED })

      fireEvent.click(botao('Adicionar evidência'))
      const form = formNova()
      expect(within(form).getByLabelText('Título')).toHaveFocus()
      expect(botao('Salvar evidência', form)).toBeDisabled()

      const nova = {
        titulo: 'Backend na Empresa Exemplo',
        url: 'https://empresa.example.com/vagas',
        descricao: 'APIs Node.js em produção.',
        tipo: 'emprego' as const,
      }
      fireEvent.change(within(form).getByLabelText('Título'), { target: { value: nova.titulo } })
      fireEvent.change(within(form).getByLabelText('Tipo'), { target: { value: 'emprego' } })
      fireEvent.change(within(form).getByLabelText('URL (opcional)'), {
        target: { value: nova.url },
      })
      fireEvent.change(within(form).getByLabelText('Descrição'), {
        target: { value: nova.descricao },
      })
      fireEvent.click(botao('Salvar evidência', form))

      expect(await within(regiao()).findByText('Evidência adicionada.')).toHaveAttribute(
        'role',
        'status',
      )
      expect(adapter.salvar).toHaveBeenCalledTimes(1)
      const salva = adapter.ultimaSalva('nodejs')
      expect(salva.evidencias).toEqual([...original.evidencias, nova])

      const notaDepois = calcularNota(salva, { hoje: HOJE_SEED })
      expect(notaDepois).toBeGreaterThan(notaAntes)
      expect(salva.historico).toHaveLength(original.historico.length + 1)
      expect(salva.historico.at(-1)).toEqual({
        data: '2026-10-23',
        dimensoes: original.dimensoes,
        nota: notaDepois,
      })

      // Formulário fecha, a lista mostra a nova evidência e a nota reage.
      expect(screen.queryByRole('form', { name: 'Nova evidência' })).not.toBeInTheDocument()
      expect(itens()).toHaveLength(2)
      expect(
        within(itens()[1]).getByRole('link', {
          name: 'Backend na Empresa Exemplo (abre em nova aba)',
        }),
      ).toBeInTheDocument()
      expect(itens()[1]).toHaveTextContent('Emprego')
      expect(notaNoCabecalho()).toContain(`Nota: ${formatarNota(notaDepois)}`)
      expect(screen.getByRole('region', { name: 'Composição da nota' })).toHaveTextContent(
        `Nota final${formatarNota(notaDepois)} / 10`,
      )
      expect(botao('Adicionar evidência')).toHaveFocus()
    })

    it('valida título vazio e URL inválida sem gravar', async () => {
      const adapter = renderDetalhe('nodejs') as AdapterFake
      await screen.findByRole('heading', { level: 1, name: 'Node.js' })
      fireEvent.click(botao('Adicionar evidência'))
      const form = formNova()
      const titulo = within(form).getByLabelText('Título')
      const url = within(form).getByLabelText('URL (opcional)')

      // Erro só aparece depois de sair do campo.
      fireEvent.change(titulo, { target: { value: '   ' } })
      expect(titulo).not.toHaveAttribute('aria-invalid')
      fireEvent.blur(titulo)
      expect(titulo).toHaveAttribute('aria-invalid', 'true')
      expect(titulo).toHaveAccessibleDescription('O título não pode ficar vazio.')

      fireEvent.change(url, { target: { value: 'nao-e-url' } })
      fireEvent.blur(url)
      expect(url).toHaveAttribute('aria-invalid', 'true')
      expect(url).toHaveAccessibleDescription(
        expect.stringContaining('URL inválida: use um endereço http(s) completo.'),
      )

      // Tentar salvar foca o primeiro campo inválido e não grava.
      fireEvent.click(botao('Salvar evidência', form))
      expect(titulo).toHaveFocus()
      fireEvent.change(titulo, { target: { value: 'api-tarefas v2' } })
      expect(titulo).not.toHaveAttribute('aria-invalid')
      fireEvent.click(botao('Salvar evidência', form))
      expect(url).toHaveFocus()
      expect(adapter.salvar).not.toHaveBeenCalled()

      // URL corrigida (ou vazia) libera o salvar.
      fireEvent.change(url, { target: { value: 'ftp://exemplo.com' } })
      expect(url).toHaveAttribute('aria-invalid', 'true')
      fireEvent.change(url, { target: { value: '' } })
      expect(url).not.toHaveAttribute('aria-invalid')
      fireEvent.click(botao('Salvar evidência', form))
      expect(await within(regiao()).findByText('Evidência adicionada.')).toBeInTheDocument()
      expect(adapter.ultimaSalva('nodejs').evidencias.at(-1)).toEqual({
        titulo: 'api-tarefas v2',
        descricao: '',
        tipo: 'repo',
      })
    })

    it('Cancelar fecha o formulário sem gravar e devolve o foco', async () => {
      const adapter = renderDetalhe('nodejs') as AdapterFake
      await screen.findByRole('heading', { level: 1, name: 'Node.js' })
      fireEvent.click(botao('Adicionar evidência'))
      fireEvent.change(within(formNova()).getByLabelText('Título'), {
        target: { value: 'Rascunho' },
      })
      fireEvent.click(botao('Cancelar', formNova()))

      expect(screen.queryByRole('form', { name: 'Nova evidência' })).not.toBeInTheDocument()
      expect(botao('Adicionar evidência')).toHaveFocus()
      expect(itens()).toHaveLength(1)
      expect(adapter.salvar).not.toHaveBeenCalled()
    })

    it('editar persiste a evidência alterada', async () => {
      const adapter = renderDetalhe('react') as AdapterFake
      await screen.findByRole('heading', { level: 1, name: 'React' })
      const original = stackDoSeed('react')

      fireEvent.click(botao('Editar evidência Loja Exemplo'))
      const form = screen.getByRole('form', { name: 'Editar evidência Loja Exemplo' })
      expect(within(form).getByLabelText('Título')).toHaveValue('Loja Exemplo')
      expect(within(form).getByLabelText('Tipo')).toHaveValue('projeto')
      expect(within(form).getByLabelText('URL (opcional)')).toHaveValue('https://loja.example.com')

      fireEvent.change(within(form).getByLabelText('Título'), {
        target: { value: 'Loja Exemplo 2.0' },
      })
      fireEvent.change(within(form).getByLabelText('URL (opcional)'), { target: { value: '' } })
      fireEvent.change(within(form).getByLabelText('Descrição'), {
        target: { value: 'Reescrita com React 19.' },
      })
      fireEvent.click(botao('Salvar evidência', form))

      expect(await within(regiao()).findByText('Evidência atualizada.')).toHaveAttribute(
        'role',
        'status',
      )
      expect(adapter.salvar).toHaveBeenCalledTimes(1)
      const salva = adapter.ultimaSalva('react')
      expect(salva.evidencias).toEqual([
        original.evidencias[0],
        { titulo: 'Loja Exemplo 2.0', descricao: 'Reescrita com React 19.', tipo: 'projeto' },
        ...original.evidencias.slice(2),
      ])
      expect(within(itens()[1]).getByRole('heading', { level: 3 })).toHaveTextContent(
        'Loja Exemplo 2.0',
      )
      expect(within(itens()[1]).queryByRole('link')).not.toBeInTheDocument()
      expect(botao('Editar evidência Loja Exemplo 2.0')).toHaveFocus()
    })

    it('remover pede confirmação; cancelar não remove e confirmar persiste', async () => {
      const adapter = renderDetalhe('react') as AdapterFake
      await screen.findByRole('heading', { level: 1, name: 'React' })
      const original = stackDoSeed('react')
      const titulo = original.evidencias[0].titulo
      const nomeRemover = `Remover evidência ${titulo}`

      fireEvent.click(botao(nomeRemover))
      let confirmacao = screen.getByRole('group', { name: `Remover “${titulo}”?` })
      expect(botao(nomeRemover)).toHaveAttribute('aria-expanded', 'true')
      expect(botao('Cancelar remoção', confirmacao)).toHaveFocus()

      fireEvent.click(botao('Cancelar remoção', confirmacao))
      expect(screen.queryByRole('group')).not.toBeInTheDocument()
      expect(botao(nomeRemover)).toHaveFocus()
      expect(itens()).toHaveLength(4)

      // Esc também cancela.
      fireEvent.click(botao(nomeRemover))
      fireEvent.keyDown(screen.getByRole('group'), { key: 'Escape' })
      expect(screen.queryByRole('group')).not.toBeInTheDocument()
      expect(adapter.salvar).not.toHaveBeenCalled()

      fireEvent.click(botao(nomeRemover))
      confirmacao = screen.getByRole('group', { name: `Remover “${titulo}”?` })
      fireEvent.click(botao('Confirmar remoção', confirmacao))

      expect(await within(regiao()).findByText('Evidência removida.')).toHaveAttribute(
        'role',
        'status',
      )
      expect(adapter.salvar).toHaveBeenCalledTimes(1)
      const salva = adapter.ultimaSalva('react')
      expect(salva.evidencias).toEqual(original.evidencias.slice(1))
      // Sem o emprego, os pontos de evidência caem e a nota muda: novo snapshot.
      const notaDepois = calcularNota(salva, { hoje: HOJE_SEED })
      expect(notaDepois).toBeLessThan(calcularNota(original, { hoje: HOJE_SEED }))
      expect(salva.historico).toHaveLength(original.historico.length + 1)
      expect(salva.historico.at(-1)!.nota).toBe(notaDepois)

      expect(itens()).toHaveLength(3)
      expect(within(regiao()).queryByText(titulo)).not.toBeInTheDocument()
      expect(notaNoCabecalho()).toContain(`Nota: ${formatarNota(notaDepois)}`)
      expect(botao('Adicionar evidência')).toHaveFocus()
    })

    it('falha do adapter ao adicionar mostra alerta e mantém o formulário', async () => {
      const adapter = new AdapterFake()
      adapter.falharSalvar = new StorageError('Não foi possível salvar as stacks.', ['disco cheio'])
      renderDetalhe('nodejs', adapter)
      await screen.findByRole('heading', { level: 1, name: 'Node.js' })

      fireEvent.click(botao('Adicionar evidência'))
      fireEvent.change(within(formNova()).getByLabelText('Título'), {
        target: { value: 'Nova lib' },
      })
      fireEvent.click(botao('Salvar evidência', formNova()))

      const alerta = await within(formNova()).findByRole('alert')
      expect(alerta).toHaveTextContent('Não foi possível salvar as stacks.')
      expect(alerta).toHaveTextContent('disco cheio')
      expect(within(formNova()).getByLabelText('Título')).toHaveValue('Nova lib')
      expect(itens()).toHaveLength(1)
      expect(adapter.dados.stacks.find((s) => s.id === 'nodejs')!.evidencias).toHaveLength(1)

      // Nova tentativa depois que o problema some.
      adapter.falharSalvar = null
      fireEvent.click(botao('Salvar evidência', formNova()))
      expect(await within(regiao()).findByText('Evidência adicionada.')).toBeInTheDocument()
      expect(adapter.dados.stacks.find((s) => s.id === 'nodejs')!.evidencias).toHaveLength(2)
    })

    it('falha do adapter ao remover mostra alerta e mantém a confirmação', async () => {
      const adapter = new AdapterFake()
      adapter.falharSalvar = new StorageError('Não foi possível salvar as stacks.')
      renderDetalhe('nodejs', adapter)
      await screen.findByRole('heading', { level: 1, name: 'Node.js' })

      fireEvent.click(botao('Remover evidência api-tarefas'))
      fireEvent.click(botao('Confirmar remoção'))

      const confirmacao = screen.getByRole('group', { name: 'Remover “api-tarefas”?' })
      expect(await within(confirmacao).findByRole('alert')).toHaveTextContent(
        'Não foi possível salvar as stacks.',
      )
      expect(botao('Confirmar remoção', confirmacao)).toBeEnabled()
      expect(itens()).toHaveLength(1)
      expect(adapter.dados.stacks.find((s) => s.id === 'nodejs')!.evidencias).toHaveLength(1)
    })
  })

  describe('estados', () => {
    it('mostra carregando enquanto os dados não chegam', () => {
      renderDetalhe('react', { carregar: () => new Promise(() => {}), salvar: vi.fn() })
      expect(screen.getByRole('status')).toHaveTextContent('Carregando a stack react')
    })

    it('mostra alerta se o carregamento falhar', async () => {
      renderDetalhe('react', {
        carregar: () => Promise.reject(new StorageError('Arquivo corrompido.')),
        salvar: vi.fn(),
      })
      const alerta = await screen.findByRole('alert')
      expect(alerta).toHaveTextContent('Não foi possível carregar as stacks.')
      expect(alerta).toHaveTextContent('Arquivo corrompido.')
    })

    it('id inexistente mostra mensagem e link para a lista', async () => {
      renderDetalhe('nao-existe')
      expect(
        await screen.findByRole('heading', { level: 1, name: 'Stack não encontrada' }),
      ).toBeInTheDocument()
      expect(screen.getByText('nao-existe')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('link', { name: 'Voltar para Stacks' }))
      expect(screen.getByTestId('local')).toHaveTextContent('/stacks')
      expect(screen.getByRole('heading', { level: 1, name: 'Lista de stacks' })).toBeInTheDocument()
    })
  })
})
