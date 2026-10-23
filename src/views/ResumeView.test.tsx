import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Stack, StacksFile } from '../domain/types'
import {
  CHAVE_CURRICULO_STORAGE,
  DEFAULT_OPCOES_CURRICULO,
  gerarMarkdownCurriculo,
  type OpcoesCurriculo,
} from '../features/resume'
import { StacksProvider } from '../features/stacks'
import { StorageError, type StorageAdapter } from '../storage'
import { HOJE_SEED, stacksDoSeed } from '../test/seed'
import { ThemeProvider } from '../themes'
import { ResumeView } from './ResumeView'

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
  return render(
    <ThemeProvider>
      <StacksProvider adapter={adapter} hoje={HOJE_SEED}>
        <MemoryRouter initialEntries={['/curriculo']}>
          <ResumeView hoje={HOJE_SEED} />
        </MemoryRouter>
      </StacksProvider>
    </ThemeProvider>,
  )
}

async function esperarFiltros() {
  return screen.findByRole('form', { name: 'Filtros do currículo' })
}

function markdownEsperado(opcoes: Partial<OpcoesCurriculo> = DEFAULT_OPCOES_CURRICULO) {
  return gerarMarkdownCurriculo(stacksDoSeed(), opcoes, { hoje: HOJE_SEED })
}

function textoMarkdown(): string {
  return (screen.getByLabelText('Markdown do currículo') as HTMLTextAreaElement).value
}

function painelVisual() {
  return screen.getByRole('tabpanel', { name: 'Visualizar' })
}

function categoriasNoPreview(): string[] {
  return within(painelVisual())
    .getAllByRole('heading', { level: 3 })
    .map((h) => h.textContent ?? '')
}

function checkbox(nome: string | RegExp) {
  return screen.getByRole('checkbox', { name: nome })
}

const SO_COMPROVADO = 'Só o que tem evidência ou prática real'
const SEI_POR_SABER = /Incluir “sei por saber”/

/** Markdown padrão do seed (hoje = 23/10/2026), igual ao de resumeExport.test.ts. */
const MARKDOWN_PADRAO_SEED = [
  '## Competências técnicas',
  '',
  '### Backend',
  '',
  '- **Node.js** — Praticante · 1 ano e 2 meses · Projeto pessoal',
  '  - [api-tarefas](https://git.example.com/exemplo/api-tarefas) — API REST de tarefas com autenticação JWT.',
  '',
  '### Frontend',
  '',
  '- **React** — Mestre · 3 anos · Produção',
  '  - [Desenvolvedor frontend na Empresa Exemplo](https://empresa.example.com) — Manutenção e evolução de um painel administrativo em React.',
  '  - [Loja Exemplo](https://loja.example.com) — E-commerce fictício com carrinho, checkout e testes de componentes.',
  '  - [react-ui-kit](https://git.example.com/exemplo/react-ui-kit) — Biblioteca de componentes acessíveis.',
  '  - [Certificado React Avançado](https://cursos.example.com/certificados/react-avancado) — Curso online de padrões avançados.',
  '- **jQuery** — Praticante · 1 ano e 8 meses · Produção',
  '  - Estágio na Agência Exemplo — Sites institucionais com jQuery e plugins.',
  '',
].join('\n')

const clipboardOriginal = Object.getOwnPropertyDescriptor(navigator, 'clipboard')

function simularClipboard(writeText: (texto: string) => Promise<void>) {
  const fn = vi.fn(writeText)
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: fn } })
  return fn
}

function simularExecCommand(resultado: boolean) {
  const fn = vi.fn<(comando: string) => boolean>(() => resultado)
  Object.defineProperty(document, 'execCommand', { configurable: true, value: fn })
  return fn
}

/** O Blob do jsdom não tem .text(). */
function lerBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader()
    leitor.onload = () => resolve(String(leitor.result))
    leitor.onerror = () => reject(leitor.error)
    leitor.readAsText(blob)
  })
}

beforeEach(() => localStorage.clear())

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
  if (clipboardOriginal) Object.defineProperty(navigator, 'clipboard', clipboardOriginal)
  else Reflect.deleteProperty(navigator, 'clipboard')
  Reflect.deleteProperty(document, 'execCommand')
})

describe('ResumeView: estados', () => {
  it('mostra o carregamento enquanto os dados não chegam', () => {
    const adapter = new AdapterFake(stacksDoSeed())
    adapter.pendente = true
    renderView(adapter)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Currículo')
    expect(screen.getByRole('status')).toHaveTextContent('Carregando stacks…')
  })

  it('mostra o erro de carregamento com opção de tentar de novo', async () => {
    const adapter = new AdapterFake(stacksDoSeed())
    adapter.falharCarregar = new StorageError('Arquivo inválido')
    renderView(adapter)
    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent('Não foi possível carregar as stacks.')
    expect(within(alerta).getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
  })

  it('sem stacks mostra o estado vazio com link para adicionar', async () => {
    renderView(new AdapterFake([]))
    const vazio = await screen.findByRole('region', { name: 'Nenhuma stack para o currículo' })
    expect(within(vazio).getByRole('link', { name: 'Adicionar stacks' })).toHaveAttribute(
      'href',
      '/stacks',
    )
    expect(screen.queryByRole('form', { name: 'Filtros do currículo' })).not.toBeInTheDocument()
  })
})

describe('ResumeView: Markdown e preview', () => {
  it('gera o Markdown esperado com as opções padrão', async () => {
    renderView()
    await esperarFiltros()
    expect(textoMarkdown()).toBe(MARKDOWN_PADRAO_SEED)
    expect(textoMarkdown()).toBe(markdownEsperado())
  })

  it('renderiza a seleção como HTML semântico, com links', async () => {
    renderView()
    await esperarFiltros()
    const painel = painelVisual()

    expect(within(painel).getByRole('heading', { level: 2 })).toHaveTextContent(
      'Competências técnicas',
    )
    expect(categoriasNoPreview()).toEqual(['Backend', 'Frontend'])

    const backend = within(painel).getByRole('heading', { name: 'Backend' }).closest('section')!
    const [node] = within(backend).getAllByRole('listitem')
    expect(node).toHaveTextContent(
      /^Node\.js — Praticante · 1 ano e 2 meses · Projeto pessoalapi-tarefas — API REST/,
    )
    expect(within(node).getByRole('link', { name: 'api-tarefas' })).toHaveAttribute(
      'href',
      'https://git.example.com/exemplo/api-tarefas',
    )
    // Evidência sem URL vira texto, sem link.
    expect(
      within(painel)
        .getByText(/^Estágio na Agência Exemplo/)
        .closest('a'),
    ).toBeNull()
    expect(within(painel).getAllByRole('link')).toHaveLength(5)
  })

  it('desligar "só comprovado" inclui o PostgreSQL no preview e no Markdown', async () => {
    renderView()
    await esperarFiltros()
    expect(within(painelVisual()).queryByText('PostgreSQL')).not.toBeInTheDocument()

    fireEvent.click(checkbox(SO_COMPROVADO))

    expect(categoriasNoPreview()).toEqual(['Backend', 'Dados', 'Frontend'])
    expect(within(painelVisual()).getByText('PostgreSQL')).toBeInTheDocument()
    expect(textoMarkdown()).toContain('- **PostgreSQL** — Aprendiz')
    expect(textoMarkdown()).toBe(markdownEsperado({ somenteComprovado: false }))
  })

  it('o filtro de categoria muda preview e Markdown; "nenhuma" e "todas"', async () => {
    renderView()
    await esperarFiltros()
    const categorias = screen.getByRole('group', { name: 'Categorias' })

    fireEvent.click(within(categorias).getByRole('checkbox', { name: 'Frontend' }))
    expect(categoriasNoPreview()).toEqual(['Backend'])
    expect(textoMarkdown()).toBe(markdownEsperado({ categorias: ['Backend', 'Dados', 'DevOps'] }))

    fireEvent.click(within(categorias).getByRole('button', { name: 'Nenhuma' }))
    expect(
      within(categorias)
        .getAllByRole('checkbox')
        .every((c) => !(c as HTMLInputElement).checked),
    ).toBe(true)
    expect(painelVisual()).toHaveTextContent('Nenhuma stack atende aos filtros escolhidos.')
    expect(textoMarkdown()).toBe(markdownEsperado({ categorias: [] }))

    fireEvent.click(within(categorias).getByRole('button', { name: 'Todas' }))
    expect(textoMarkdown()).toBe(MARKDOWN_PADRAO_SEED)
  })

  it('nível mínimo, título e opções de exibição mudam o Markdown', async () => {
    renderView()
    await esperarFiltros()

    fireEvent.change(screen.getByLabelText('Nível mínimo'), { target: { value: 'mestre' } })
    fireEvent.change(screen.getByLabelText('Título da seção'), { target: { value: 'Stacks' } })
    fireEvent.click(checkbox('Nota (0 a 10)'))
    fireEvent.click(checkbox('Evidências (links e descrições)'))

    const esperado =
      '## Stacks\n\n### Frontend\n\n- **React** — Mestre · Nota 8,4 · 3 anos · Produção\n'
    expect(textoMarkdown()).toBe(esperado)
    expect(within(painelVisual()).getByRole('heading', { level: 2 })).toHaveTextContent('Stacks')
    expect(within(painelVisual()).queryAllByRole('link')).toHaveLength(0)
  })

  it('"sei por saber" só habilita com "só comprovado" desligado', async () => {
    renderView()
    await esperarFiltros()
    expect(checkbox(SEI_POR_SABER)).toBeDisabled()
    expect(checkbox(SEI_POR_SABER)).not.toBeChecked()
    expect(checkbox(SEI_POR_SABER)).toHaveAccessibleDescription(/Disponível só com/)

    fireEvent.click(checkbox(SO_COMPROVADO))
    expect(checkbox(SEI_POR_SABER)).toBeEnabled()
    fireEvent.click(checkbox(SEI_POR_SABER))
    expect(categoriasNoPreview()).toEqual(['Backend', 'Dados', 'Frontend', 'Conhecimento teórico'])
    expect(within(painelVisual()).getByText('Kubernetes')).toBeInTheDocument()
    expect(textoMarkdown()).toBe(
      markdownEsperado({ somenteComprovado: false, incluirSeiPorSaber: true }),
    )

    fireEvent.click(checkbox(SO_COMPROVADO))
    expect(checkbox(SEI_POR_SABER)).toBeDisabled()
    expect(checkbox(SEI_POR_SABER)).not.toBeChecked()
    expect(within(painelVisual()).queryByText('Kubernetes')).not.toBeInTheDocument()
  })

  it('lista as stacks de fora com o motivo', async () => {
    renderView()
    await esperarFiltros()
    expect(screen.getByText('3 stacks incluídas, 2 de fora')).toBeInTheDocument()

    const lista = screen.getByRole('list', { name: 'Stacks de fora' })
    expect(
      within(lista)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual([
      'Kubernetes — Sei por saber: teoria alta, pouca prática',
      'PostgreSQL — Sem evidência nem prática real',
    ])

    fireEvent.click(screen.getByRole('button', { name: 'Nenhuma' }))
    expect(screen.getByText('0 stacks incluídas, 5 de fora')).toBeInTheDocument()
    const motivos = within(screen.getByRole('list', { name: 'Stacks de fora' }))
      .getAllByRole('listitem')
      .map((li) => li.textContent)
    expect(motivos).toHaveLength(5)
    expect(motivos).toContain('Node.js — Categoria fora do filtro')
    expect(motivos.every((m) => m?.endsWith('— Categoria fora do filtro'))).toBe(true)
  })
})

describe('ResumeView: abas', () => {
  it('troca de aba pelo teclado (setas, Home e End)', async () => {
    renderView()
    await esperarFiltros()
    const lista = screen.getByRole('tablist', { name: 'Formato da prévia' })
    const visualizar = within(lista).getByRole('tab', { name: 'Visualizar' })
    const markdown = within(lista).getByRole('tab', { name: 'Markdown' })

    expect(visualizar).toHaveAttribute('aria-selected', 'true')
    expect(visualizar).toHaveAttribute('tabindex', '0')
    expect(markdown).toHaveAttribute('tabindex', '-1')
    expect(screen.queryByRole('tabpanel', { name: 'Markdown' })).not.toBeInTheDocument()

    visualizar.focus()
    fireEvent.keyDown(visualizar, { key: 'ArrowRight' })
    expect(markdown).toHaveAttribute('aria-selected', 'true')
    expect(markdown).toHaveFocus()
    const painel = screen.getByRole('tabpanel', { name: 'Markdown' })
    expect(within(painel).getByRole('textbox', { name: 'Markdown do currículo' })).toHaveAttribute(
      'readonly',
    )
    expect(screen.queryByRole('tabpanel', { name: 'Visualizar' })).not.toBeInTheDocument()

    fireEvent.keyDown(markdown, { key: 'ArrowRight' })
    expect(visualizar).toHaveAttribute('aria-selected', 'true')
    expect(visualizar).toHaveFocus()

    fireEvent.keyDown(visualizar, { key: 'ArrowLeft' })
    expect(markdown).toHaveFocus()
    fireEvent.keyDown(markdown, { key: 'Home' })
    expect(visualizar).toHaveFocus()
    fireEvent.keyDown(visualizar, { key: 'End' })
    expect(markdown).toHaveAttribute('aria-selected', 'true')

    fireEvent.click(visualizar)
    expect(visualizar).toHaveAttribute('aria-selected', 'true')
  })
})

describe('ResumeView: ações', () => {
  it('copiar usa a Clipboard API com o Markdown e anuncia "Copiado!"', async () => {
    const writeText = simularClipboard(async () => {})
    renderView()
    await esperarFiltros()

    fireEvent.click(screen.getByRole('button', { name: 'Copiar Markdown' }))
    expect(await screen.findByText('Copiado!')).toHaveAttribute('aria-live', 'polite')
    expect(writeText).toHaveBeenCalledWith(MARKDOWN_PADRAO_SEED)
  })

  it('se a Clipboard API falhar, copia pelo fallback com execCommand', async () => {
    const writeText = simularClipboard(async () => {
      throw new Error('negado')
    })
    let copiado = ''
    const execCommand = simularExecCommand(true)
    execCommand.mockImplementation(() => {
      const areas = document.body.querySelectorAll<HTMLTextAreaElement>(':scope > textarea')
      copiado = areas[areas.length - 1].value
      return true
    })
    renderView()
    await esperarFiltros()

    fireEvent.click(screen.getByRole('button', { name: 'Copiar Markdown' }))
    expect(await screen.findByText('Copiado!')).toBeInTheDocument()
    expect(writeText).toHaveBeenCalled()
    expect(execCommand).toHaveBeenCalledWith('copy')
    expect(copiado).toBe(MARKDOWN_PADRAO_SEED)
    // A textarea temporária é removida.
    expect(document.querySelectorAll('textarea')).toHaveLength(1)
  })

  it('anuncia o erro quando nenhuma forma de copiar funciona', async () => {
    Reflect.deleteProperty(navigator, 'clipboard')
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined })
    simularExecCommand(false)
    renderView()
    await esperarFiltros()

    fireEvent.click(screen.getByRole('button', { name: 'Copiar Markdown' }))
    expect(await screen.findByText(/Não foi possível copiar/)).toHaveAttribute('role', 'status')
    expect(screen.queryByText('Copiado!')).not.toBeInTheDocument()
  })

  it('baixar gera um .md com o Markdown', async () => {
    const blobs: Blob[] = []
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn((blob: Blob) => {
        blobs.push(blob)
        return 'blob:curriculo'
      }),
    })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
    const cliques: HTMLAnchorElement[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      cliques.push(this)
    })
    renderView()
    await esperarFiltros()

    fireEvent.click(screen.getByRole('button', { name: 'Baixar .md' }))
    expect(cliques).toHaveLength(1)
    expect(cliques[0].download).toBe('curriculo-stacks.md')
    expect(cliques[0].href).toBe('blob:curriculo')
    expect(blobs[0].type).toBe('text/markdown;charset=utf-8')
    expect(await lerBlob(blobs[0])).toBe(MARKDOWN_PADRAO_SEED)
    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:curriculo'))
  })

  it('imprimir chama window.print', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {})
    renderView()
    await esperarFiltros()

    fireEvent.click(screen.getByRole('button', { name: 'Imprimir' }))
    expect(print).toHaveBeenCalledTimes(1)
  })

  it('o painel visual fica no DOM (para a impressão) com a aba Markdown ativa', async () => {
    renderView()
    await esperarFiltros()
    fireEvent.click(screen.getByRole('tab', { name: 'Markdown' }))
    const visual = document.querySelector('.curriculo-painel-visual')
    expect(visual).toHaveAttribute('hidden')
    expect(visual?.querySelector('.curriculo-impressao')).toHaveTextContent('React')
  })
})

describe('ResumeView: persistência', () => {
  it('as opções persistem no localStorage e voltam ao remontar', async () => {
    const { unmount } = renderView()
    await esperarFiltros()

    fireEvent.click(checkbox(SO_COMPROVADO))
    fireEvent.change(screen.getByLabelText('Nível mínimo'), { target: { value: 'praticante' } })
    fireEvent.change(screen.getByLabelText('Título da seção'), {
      target: { value: 'Tecnologias' },
    })
    const esperado = markdownEsperado({
      somenteComprovado: false,
      nivelMinimo: 'praticante',
      titulo: 'Tecnologias',
    })
    expect(textoMarkdown()).toBe(esperado)

    const salvo = JSON.parse(localStorage.getItem(CHAVE_CURRICULO_STORAGE) ?? 'null')
    expect(salvo).toEqual({
      ...DEFAULT_OPCOES_CURRICULO,
      somenteComprovado: false,
      nivelMinimo: 'praticante',
      titulo: 'Tecnologias',
    })

    unmount()
    renderView()
    await esperarFiltros()
    expect(checkbox(SO_COMPROVADO)).not.toBeChecked()
    expect(screen.getByLabelText('Nível mínimo')).toHaveValue('praticante')
    expect(screen.getByLabelText('Título da seção')).toHaveValue('Tecnologias')
    expect(textoMarkdown()).toBe(esperado)
  })

  it.each([
    ['JSON quebrado', '{nao é json'],
    ['tipo errado', JSON.stringify({ ...DEFAULT_OPCOES_CURRICULO, mostrarNota: 'sim' })],
    ['nível inexistente', JSON.stringify({ ...DEFAULT_OPCOES_CURRICULO, nivelMinimo: 'deus' })],
    ['campo faltando', JSON.stringify({ titulo: 'X' })],
  ])('valor salvo inválido (%s) cai no padrão', async (_, valor) => {
    localStorage.setItem(CHAVE_CURRICULO_STORAGE, valor)
    renderView()
    await esperarFiltros()
    expect(textoMarkdown()).toBe(MARKDOWN_PADRAO_SEED)
    expect(checkbox(SO_COMPROVADO)).toBeChecked()
  })

  it('restaurar padrão volta às opções padrão e salva', async () => {
    localStorage.setItem(
      CHAVE_CURRICULO_STORAGE,
      JSON.stringify({ ...DEFAULT_OPCOES_CURRICULO, mostrarNota: true, categorias: ['Backend'] }),
    )
    renderView()
    await esperarFiltros()
    expect(checkbox('Nota (0 a 10)')).toBeChecked()
    expect(categoriasNoPreview()).toEqual(['Backend'])

    fireEvent.click(screen.getByRole('button', { name: 'Restaurar padrão' }))
    expect(checkbox('Nota (0 a 10)')).not.toBeChecked()
    expect(textoMarkdown()).toBe(MARKDOWN_PADRAO_SEED)
    expect(JSON.parse(localStorage.getItem(CHAVE_CURRICULO_STORAGE) ?? 'null')).toEqual(
      DEFAULT_OPCOES_CURRICULO,
    )
  })
})
