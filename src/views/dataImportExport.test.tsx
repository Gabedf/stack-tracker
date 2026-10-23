import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MotionProvider } from '../components/motion'
import type { Stack, StacksFile } from '../domain/types'
import { LevelUpProvider } from '../features/character'
import { TAMANHO_MAXIMO_BYTES } from '../features/data'
import { StacksProvider, useStacks } from '../features/stacks'
import { StorageError, type StorageAdapter } from '../storage'
import { HOJE_SEED, stacksDoSeed } from '../test/seed'
import { ThemeProvider } from '../themes'
import { DataView } from './DataView'

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
  ultimoSalvo(): StacksFile {
    const chamada = this.salvar.mock.lastCall
    if (!chamada) throw new Error('salvar não foi chamado')
    return chamada[0]
  }
}

function Local() {
  return <span data-testid="local">{useLocation().pathname}</span>
}

/** Ids das stacks no contexto, na ordem. */
function IdsNoPainel() {
  return (
    <span data-testid="ids">
      {useStacks()
        .stacks.map((s) => s.id)
        .join(',')}
    </span>
  )
}

function renderDados(adapter = new AdapterFake(stacksDoSeed())) {
  render(
    <ThemeProvider>
      <StacksProvider adapter={adapter} hoje={HOJE_SEED}>
        <MotionProvider reducedMotion="always">
          <LevelUpProvider hoje={HOJE_SEED}>
            <MemoryRouter initialEntries={['/dados']}>
              <Routes>
                <Route path="/dados" element={<DataView hoje={HOJE_SEED} />} />
                <Route path="/stacks" element={<h1>Stacks</h1>} />
              </Routes>
              <Local />
              <IdsNoPainel />
            </MemoryRouter>
          </LevelUpProvider>
        </MotionProvider>
      </StacksProvider>
    </ThemeProvider>,
  )
  return adapter
}

const IDS_SEED = stacksDoSeed()
  .map((s) => s.id)
  .join(',')
const idsNoPainel = () => screen.getByTestId('ids').textContent
const avisosLevelUp = () => screen.getByTestId('levelup-avisos')
const botao = (nome: string) => screen.getByRole('button', { name: nome })
const secaoImportar = () => screen.getByRole('region', { name: 'Importar' })

async function pronto() {
  await waitFor(() => expect(idsNoPainel()).toBe(IDS_SEED))
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

/** Captura o próximo download (Blob + nome) disparado pela página. */
function capturarDownloads() {
  const blobs: Blob[] = []
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn((blob: Blob) => {
      blobs.push(blob)
      return 'blob:dados'
    }),
  })
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
  const cliques: HTMLAnchorElement[] = []
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    cliques.push(this)
  })
  return { blobs, cliques }
}

async function escolherArquivo(conteudo: string, nome = 'backup.json') {
  const arquivo = new File([conteudo], nome, { type: 'application/json' })
  fireEvent.change(screen.getByLabelText('Arquivo JSON'), { target: { files: [arquivo] } })
  return arquivo
}

function colarEAnalisar(conteudo: string) {
  fireEvent.change(screen.getByLabelText('Ou cole o JSON (opcional)'), {
    target: { value: conteudo },
  })
  fireEvent.click(botao('Analisar JSON colado'))
}

function stackNova(id: string): Stack {
  return {
    id,
    nome: id.toUpperCase(),
    categoria: 'Frontend',
    tags: [],
    dimensoes: { teoria: 6, pratica: 6, profundidade: 6, ultimoUso: '2026-10-01' },
    experiencia: { tipo: 'estudo', meses: 3 },
    evidencias: [],
    historico: [],
  }
}

/** Arquivo com React alterado, Node.js igual e a stack nova "vue". */
function arquivoParcial(): StacksFile {
  const [react, node] = stacksDoSeed()
  return { versao: 1, stacks: [{ ...react, nome: 'React 19' }, node, stackNova('vue')] }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('exportar', () => {
  it('baixa o JSON com resumo e o texto reimporta idêntico (round-trip)', async () => {
    const { blobs, cliques } = capturarDownloads()
    const adapter = renderDados()
    await pronto()
    expect(screen.getByText(/com 5 stacks/)).toBeInTheDocument()

    fireEvent.click(botao('Baixar JSON'))
    expect(cliques).toHaveLength(1)
    expect(cliques[0].download).toBe('painel-stacks-2026-10-23.json')
    expect(blobs[0].type).toBe('application/json;charset=utf-8')
    const texto = await lerBlob(blobs[0])
    expect(texto).toBe(`${JSON.stringify(adapter.dados, null, 2)}\n`)

    // Reimporta o próprio export substituindo tudo: nada muda.
    await escolherArquivo(texto, cliques[0].download)
    await within(secaoImportar()).findByText('Prévia de “painel-stacks-2026-10-23.json”')
    expect(within(secaoImportar()).getByText('inalteradas').nextElementSibling).toHaveTextContent(
      '5',
    )
    fireEvent.click(screen.getByLabelText(/Substituir tudo/))
    fireEvent.click(botao('Importar'))
    fireEvent.click(botao('Confirmar substituição'))

    await screen.findByText(/Importação concluída/)
    expect(adapter.salvar).toHaveBeenCalledTimes(1)
    expect(adapter.ultimoSalvo()).toEqual({ versao: 1, stacks: stacksDoSeed() })
    expect(idsNoPainel()).toBe(IDS_SEED)
  })
})

describe('importar JSON inválido não corrompe os dados', () => {
  it.each([
    ['malformado', '{"versao": 1, "stacks": [', /não é um JSON válido/],
    ['vazio', '   ', /O arquivo está vazio\./],
    ['versão errada', JSON.stringify({ versao: 9, stacks: [] }), /Versão do arquivo não suportada/],
    [
      'schema inválido',
      JSON.stringify({ versao: 1, stacks: [{ ...stackNova('vue'), nome: '' }] }),
      /stacks\[0\]\.nome: O nome não pode ficar vazio\./,
    ],
    [
      'ids duplicados',
      JSON.stringify({ versao: 1, stacks: [stackNova('vue'), stackNova('vue')] }),
      /Id duplicado/,
    ],
  ])('%s: mostra o erro e não salva', async (_, conteudo, mensagem) => {
    const adapter = renderDados()
    await pronto()
    const antes = structuredClone(adapter.dados)

    await escolherArquivo(conteudo)
    const alerta = await within(secaoImportar()).findByRole('alert')
    expect(alerta).toHaveTextContent(mensagem)
    expect(alerta).toHaveTextContent('O arquivo precisa ter {"versao": 1, "stacks": [...]}.')
    expect(alerta).toHaveTextContent('Seus dados não foram alterados.')
    expect(screen.queryByRole('button', { name: 'Importar' })).not.toBeInTheDocument()

    expect(adapter.salvar).not.toHaveBeenCalled()
    expect(adapter.dados).toEqual(antes)
    expect(idsNoPainel()).toBe(IDS_SEED)
  })

  it('JSON colado inválido também não salva', async () => {
    const adapter = renderDados()
    await pronto()
    colarEAnalisar('[1, 2, 3]')
    expect(await within(secaoImportar()).findByRole('alert')).toHaveTextContent(
      'O arquivo deve ser um objeto JSON com "versao" e "stacks".',
    )
    expect(adapter.salvar).not.toHaveBeenCalled()
    expect(idsNoPainel()).toBe(IDS_SEED)
  })

  it('muitos erros: mostra os 10 primeiros e "e mais N"', async () => {
    const adapter = renderDados()
    await pronto()
    const stacks = Array.from({ length: 14 }, (_, i) => ({ ...stackNova(`s${i}`), nome: '' }))
    await escolherArquivo(JSON.stringify({ versao: 1, stacks }))
    const alerta = await within(secaoImportar()).findByRole('alert')
    const itens = within(alerta).getAllByRole('listitem')
    expect(itens).toHaveLength(11)
    expect(itens[10]).toHaveTextContent('… e mais 4 erros.')
    expect(adapter.salvar).not.toHaveBeenCalled()
  })

  it('arquivo acima de 2 MB é recusado com erro amigável', async () => {
    const adapter = renderDados()
    await pronto()
    await escolherArquivo('x'.repeat(TAMANHO_MAXIMO_BYTES + 1), 'enorme.json')
    expect(await within(secaoImportar()).findByRole('alert')).toHaveTextContent(
      /passa do limite de 2,0 MB/,
    )
    expect(adapter.salvar).not.toHaveBeenCalled()
    expect(idsNoPainel()).toBe(IDS_SEED)
  })
})

describe('importar JSON válido', () => {
  it('mostra a prévia com as contagens', async () => {
    renderDados()
    await pronto()
    colarEAnalisar(JSON.stringify(arquivoParcial()))
    const secao = secaoImportar()
    await within(secao).findByText('Prévia de “texto colado”')
    const valor = (rotulo: string) => within(secao).getByText(rotulo).nextElementSibling
    expect(valor('no arquivo')).toHaveTextContent('3')
    expect(valor('novas')).toHaveTextContent('1')
    expect(valor('substituem existentes (mesmo id)')).toHaveTextContent('1')
    expect(valor('inalteradas')).toHaveTextContent('1')
    expect(valor('do painel não estão no arquivo')).toHaveTextContent('3')
    expect(within(secao).getByText(/3 stacks serão removidas\./)).toBeInTheDocument()
  })

  it('mesclar (padrão) salva por id e mantém as que não estão no arquivo', async () => {
    const adapter = renderDados()
    await pronto()
    await escolherArquivo(JSON.stringify(arquivoParcial()))
    await within(secaoImportar()).findByText(/Prévia de/)
    expect(screen.getByLabelText(/Mesclar por id/)).toBeChecked()

    fireEvent.click(botao('Importar'))
    const sucesso = await screen.findByText(/Importação concluída: o painel agora tem 6 stacks\./)

    const [react, ...resto] = stacksDoSeed()
    expect(adapter.salvar).toHaveBeenCalledTimes(1)
    expect(adapter.ultimoSalvo()).toEqual({
      versao: 1,
      stacks: [{ ...react, nome: 'React 19' }, ...resto, stackNova('vue')],
    })
    expect(idsNoPainel()).toBe(`${IDS_SEED},vue`)
    expect(sucesso.closest('[role="status"]')).toHaveAttribute('aria-live', 'polite')

    fireEvent.click(within(sucesso).getByRole('link', { name: 'Ver stacks' }))
    expect(screen.getByTestId('local')).toHaveTextContent('/stacks')
  })

  it('substituir pede confirmação com quantas serão removidas e salva só o arquivo', async () => {
    const adapter = renderDados()
    await pronto()
    await escolherArquivo(JSON.stringify(arquivoParcial()))
    await within(secaoImportar()).findByText(/Prévia de/)

    fireEvent.click(screen.getByLabelText(/Substituir tudo/))
    fireEvent.click(botao('Importar'))
    const confirmacao = screen.getByRole('group', {
      name: 'Substituir tudo vai remover 3 stacks do painel. Continuar?',
    })
    expect(within(confirmacao).getByRole('button', { name: 'Voltar' })).toHaveFocus()
    expect(adapter.salvar).not.toHaveBeenCalled()

    // Voltar não salva; confirmar salva.
    fireEvent.click(within(confirmacao).getByRole('button', { name: 'Voltar' }))
    expect(adapter.salvar).not.toHaveBeenCalled()
    fireEvent.click(botao('Importar'))
    fireEvent.click(botao('Confirmar substituição'))

    await screen.findByText(/o painel agora tem 3 stacks\./)
    expect(adapter.salvar).toHaveBeenCalledTimes(1)
    expect(adapter.ultimoSalvo()).toEqual(arquivoParcial())
    expect(idsNoPainel()).toBe('react,nodejs,vue')
  })

  it('falha do adapter mantém o estado e mostra o erro', async () => {
    const adapter = renderDados()
    await pronto()
    const antes = structuredClone(adapter.dados)
    adapter.falharSalvar = new StorageError('Servidor fora do ar.', ['HTTP 500'])

    await escolherArquivo(JSON.stringify(arquivoParcial()))
    await within(secaoImportar()).findByText(/Prévia de/)
    fireEvent.click(botao('Importar'))

    const alerta = await within(secaoImportar()).findByRole('alert')
    expect(alerta).toHaveTextContent(
      'Não foi possível salvar a importação. Seus dados continuam como antes.',
    )
    expect(alerta).toHaveTextContent('Servidor fora do ar.')
    expect(alerta).toHaveTextContent('HTTP 500')
    expect(adapter.salvar).toHaveBeenCalledTimes(1)
    expect(adapter.dados).toEqual(antes)
    expect(idsNoPainel()).toBe(IDS_SEED)
    expect(screen.queryByText(/Importação concluída/)).not.toBeInTheDocument()

    // Dá para tentar de novo depois.
    adapter.falharSalvar = null
    fireEvent.click(botao('Importar'))
    await screen.findByText(/Importação concluída/)
    expect(idsNoPainel()).toBe(`${IDS_SEED},vue`)
  })

  it('importação que sobe stacks de nível não dispara o aviso de level-up', async () => {
    const adapter = renderDados()
    await pronto()
    const turbinadas = stacksDoSeed().map((s) => ({
      ...s,
      dimensoes: { ...s.dimensoes, teoria: 10, pratica: 10, profundidade: 10 },
    }))
    await escolherArquivo(JSON.stringify({ versao: 1, stacks: turbinadas }))
    await within(secaoImportar()).findByText(/Prévia de/)
    fireEvent.click(botao('Importar'))
    await screen.findByText(/Importação concluída/)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    expect(adapter.ultimoSalvo().stacks).toEqual(turbinadas)
    expect(avisosLevelUp()).toBeEmptyDOMElement()
  })
})
