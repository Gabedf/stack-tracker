import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Stack, StacksFile } from '../../domain/types'
import { StorageError, type StorageAdapter } from '../../storage'
import { StacksProvider } from './StacksProvider'
import { criarStack } from './stacksOperations'
import { useStacks } from './useStacks'

const HOJE = new Date(2026, 9, 15, 10, 0)
const AMANHA = new Date(2026, 9, 16, 9, 0)

function copiar<T>(valor: T): T {
  return JSON.parse(JSON.stringify(valor)) as T
}

/** Adapter em memória; simula serialização copiando os dados. */
class AdapterFake implements StorageAdapter {
  dados: StacksFile
  falharCarregar: StorageError | null = null
  falharSalvar: StorageError | null = null
  /** Se definido, cada salvar espera esta função liberar. */
  segurarSalvar: (() => Promise<void>) | null = null
  readonly carregar = vi.fn(async (): Promise<StacksFile> => {
    if (this.falharCarregar) throw this.falharCarregar
    return copiar(this.dados)
  })
  readonly salvar = vi.fn(async (dados: StacksFile): Promise<StacksFile> => {
    if (this.segurarSalvar) await this.segurarSalvar()
    if (this.falharSalvar) throw this.falharSalvar
    this.dados = copiar(dados)
    return copiar(this.dados)
  })

  constructor(stacks: Stack[] = []) {
    this.dados = { versao: 1, stacks: copiar(stacks) }
  }
}

function stackInicial(): Stack {
  return criarStack({ nome: 'React', categoria: 'Front', dimensoes: { pratica: 5 } }, [], {
    hoje: HOJE,
  })
}

function montar(adapter: AdapterFake, hoje: Date | (() => Date) = AMANHA) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <StacksProvider adapter={adapter} hoje={hoje}>
      {children}
    </StacksProvider>
  )
  return renderHook(() => useStacks(), { wrapper })
}

async function montarPronto(adapter: AdapterFake, hoje?: Date | (() => Date)) {
  const hook = montar(adapter, hoje)
  await waitFor(() => expect(hook.result.current.status).toBe('pronto'))
  return hook
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('StacksProvider / useStacks', () => {
  it('carrega as stacks do adapter no mount', async () => {
    const adapter = new AdapterFake([stackInicial()])
    const { result } = montar(adapter)

    expect(result.current.status).toBe('carregando')
    expect(result.current.stacks).toEqual([])

    await waitFor(() => expect(result.current.status).toBe('pronto'))
    expect(result.current.stacks.map((s) => s.id)).toEqual(['react'])
    expect(result.current.erro).toBeNull()
    expect(adapter.carregar).toHaveBeenCalledTimes(1)
  })

  it('adicionar gera id único, snapshot inicial e persiste', async () => {
    const adapter = new AdapterFake([stackInicial()])
    const { result } = await montarPronto(adapter)

    let criada: Stack | undefined
    await act(async () => {
      criada = await result.current.adicionar({ nome: 'React', categoria: 'Front' })
    })

    expect(criada?.id).toBe('react-2')
    expect(criada?.dimensoes.ultimoUso).toBe('2026-10-16')
    expect(criada?.historico).toEqual([
      { data: '2026-10-16', dimensoes: criada?.dimensoes, nota: 0 },
    ])
    expect(result.current.stacks.map((s) => s.id)).toEqual(['react', 'react-2'])
    expect(adapter.dados.stacks.map((s) => s.id)).toEqual(['react', 'react-2'])
    expect(result.current.salvando).toBe(false)
  })

  it('atualizar sem mudar dimensões não gera snapshot', async () => {
    const adapter = new AdapterFake([stackInicial()])
    const { result } = await montarPronto(adapter)

    await act(async () => {
      await result.current.atualizar('react', { tags: ['ui'], notas: 'hooks' })
    })

    const [react] = result.current.stacks
    expect(react.tags).toEqual(['ui'])
    expect(react.notas).toBe('hooks')
    expect(react.historico).toHaveLength(1)
    expect(adapter.dados.stacks[0].tags).toEqual(['ui'])
  })

  it('atualizar dimensões gera snapshot (também via função)', async () => {
    const adapter = new AdapterFake([stackInicial()])
    const { result } = await montarPronto(adapter)

    await act(async () => {
      await result.current.atualizar('react', (s) => ({
        ...s,
        dimensoes: { ...s.dimensoes, pratica: 9 },
      }))
    })

    const [react] = result.current.stacks
    expect(react.dimensoes.pratica).toBe(9)
    expect(react.historico).toHaveLength(2)
    expect(react.historico[1]).toMatchObject({ data: '2026-10-16', dimensoes: { pratica: 9 } })
  })

  it('usa o relógio injetado no momento da operação', async () => {
    let agora = HOJE
    const adapter = new AdapterFake()
    const { result } = await montarPronto(adapter, () => agora)

    agora = AMANHA
    let criada: Stack | undefined
    await act(async () => {
      criada = await result.current.adicionar({ nome: 'Go', categoria: 'Linguagens' })
    })

    expect(criada?.historico[0].data).toBe('2026-10-16')
  })

  it('remover tira a stack e resolve com ela', async () => {
    const adapter = new AdapterFake([stackInicial()])
    const { result } = await montarPronto(adapter)

    let removida: Stack | undefined
    await act(async () => {
      removida = await result.current.remover('react')
    })

    expect(removida?.id).toBe('react')
    expect(result.current.stacks).toEqual([])
    expect(adapter.dados.stacks).toEqual([])
  })

  it('falha no salvar mantém o estado anterior, expõe erro e limparErro limpa', async () => {
    const adapter = new AdapterFake([stackInicial()])
    const { result } = await montarPronto(adapter)
    const anterior = result.current.stacks
    const falha = new StorageError('Não foi possível salvar as stacks: servidor fora.', ['500'])
    adapter.falharSalvar = falha

    await act(async () => {
      await expect(result.current.atualizar('react', { dimensoes: { pratica: 10 } })).rejects.toBe(
        falha,
      )
    })

    expect(result.current.stacks).toBe(anterior)
    expect(result.current.erro).toBe(falha)
    expect(result.current.status).toBe('pronto')
    expect(result.current.salvando).toBe(false)

    act(() => result.current.limparErro())
    expect(result.current.erro).toBeNull()
  })

  it('erro inesperado do adapter vira StorageError', async () => {
    const adapter = new AdapterFake([stackInicial()])
    const { result } = await montarPronto(adapter)
    adapter.salvar.mockRejectedValueOnce(new TypeError('boom'))

    await act(async () => {
      await expect(result.current.remover('react')).rejects.toBeInstanceOf(StorageError)
    })

    expect(result.current.erro?.detalhes).toEqual(['boom'])
    expect(result.current.stacks).toHaveLength(1)
  })

  it('id inexistente rejeita sem salvar nem marcar erro de storage', async () => {
    const adapter = new AdapterFake()
    const { result } = await montarPronto(adapter)

    await act(async () => {
      await expect(result.current.remover('nada')).rejects.toThrow(/não encontrada/)
    })

    expect(adapter.salvar).not.toHaveBeenCalled()
    expect(result.current.erro).toBeNull()
  })

  it('operações disparadas sem await são serializadas e aplicadas na ordem', async () => {
    const adapter = new AdapterFake()
    const { result } = await montarPronto(adapter)

    const liberacoes: Array<() => void> = []
    adapter.segurarSalvar = () => new Promise<void>((resolve) => liberacoes.push(resolve))

    let p1!: Promise<Stack>
    let p2!: Promise<Stack>
    act(() => {
      p1 = result.current.adicionar({ nome: 'Go', categoria: 'Linguagens' })
      p2 = result.current.atualizar('go', { dimensoes: { pratica: 6 } })
    })

    // A segunda operação só começa depois que a primeira foi salva.
    await waitFor(() => expect(adapter.salvar).toHaveBeenCalledTimes(1))
    expect(result.current.salvando).toBe(true)
    await act(async () => {
      liberacoes[0]()
      await p1
    })
    await waitFor(() => expect(adapter.salvar).toHaveBeenCalledTimes(2))
    expect(adapter.salvar.mock.calls[1][0].stacks.map((s) => s.id)).toEqual(['go'])
    await act(async () => {
      liberacoes[1]()
      await p2
    })

    const [go] = result.current.stacks
    expect(result.current.stacks).toHaveLength(1)
    expect(go.dimensoes.pratica).toBe(6)
    expect(go.historico).toHaveLength(1) // mesmo dia: snapshot substituído
    expect(go.historico[0].dimensoes.pratica).toBe(6)
    expect(result.current.salvando).toBe(false)
  })

  it('uma falha no meio da fila não impede as operações seguintes', async () => {
    const adapter = new AdapterFake()
    const { result } = await montarPronto(adapter)
    adapter.salvar.mockRejectedValueOnce(new StorageError('falhou'))

    let p1!: Promise<Stack>
    let p2!: Promise<Stack>
    act(() => {
      p1 = result.current.adicionar({ nome: 'A', categoria: 'X' })
      p2 = result.current.adicionar({ nome: 'B', categoria: 'X' })
    })

    await act(async () => {
      await expect(p1).rejects.toThrow('falhou')
      await p2
    })

    expect(result.current.stacks.map((s) => s.id)).toEqual(['b'])
    expect(result.current.erro).toBeNull()
  })

  it("erro no carregar deixa status 'erro' e recarregar recupera", async () => {
    const adapter = new AdapterFake([stackInicial()])
    const falha = new StorageError('Não foi possível carregar as stacks: sem conexão.')
    adapter.falharCarregar = falha
    const { result } = montar(adapter)

    await waitFor(() => expect(result.current.status).toBe('erro'))
    expect(result.current.erro).toBe(falha)
    expect(result.current.stacks).toEqual([])

    adapter.falharCarregar = null
    await act(async () => {
      await result.current.recarregar()
    })

    expect(result.current.status).toBe('pronto')
    expect(result.current.erro).toBeNull()
    expect(result.current.stacks.map((s) => s.id)).toEqual(['react'])
  })

  it('assinarEscritas avisa só escritas salvas, com antes/depois, e cancela', async () => {
    const adapter = new AdapterFake([stackInicial()])
    const { result } = await montarPronto(adapter)
    const ouvinte = vi.fn()
    let cancelar = () => {}
    act(() => {
      cancelar = result.current.assinarEscritas(ouvinte)
    })

    await act(async () => {
      await result.current.recarregar()
    })
    expect(ouvinte).not.toHaveBeenCalled()

    await act(async () => {
      await result.current.atualizar('react', { dimensoes: { pratica: 9 } })
    })
    expect(ouvinte).toHaveBeenCalledTimes(1)
    const [antes, depois, info] = ouvinte.mock.calls[0] as [StacksFile, StacksFile, unknown]
    expect(antes.stacks[0].dimensoes.pratica).toBe(5)
    expect(depois.stacks[0].dimensoes.pratica).toBe(9)
    expect(info).toEqual({ origem: 'usuario' })

    adapter.falharSalvar = new StorageError('Disco cheio')
    await act(async () => {
      await result.current.atualizar('react', { dimensoes: { pratica: 1 } }).catch(() => {})
    })
    expect(ouvinte).toHaveBeenCalledTimes(1)

    adapter.falharSalvar = null
    cancelar()
    await act(async () => {
      await result.current.remover('react')
    })
    expect(ouvinte).toHaveBeenCalledTimes(1)
  })

  it('substituirTudo troca o arquivo inteiro e avisa com origem importacao', async () => {
    const adapter = new AdapterFake([stackInicial()])
    const { result } = await montarPronto(adapter)
    const ouvinte = vi.fn()
    act(() => {
      result.current.assinarEscritas(ouvinte)
    })
    const vue = criarStack({ nome: 'Vue', categoria: 'Front' }, [], { hoje: HOJE })

    let salvo: StacksFile | undefined
    await act(async () => {
      salvo = await result.current.substituirTudo({ versao: 1, stacks: [vue] })
    })

    expect(adapter.salvar).toHaveBeenCalledTimes(1)
    expect(adapter.salvar).toHaveBeenCalledWith({ versao: 1, stacks: [vue] })
    expect(salvo).toEqual({ versao: 1, stacks: [vue] })
    expect(result.current.stacks.map((s) => s.id)).toEqual(['vue'])
    expect(ouvinte).toHaveBeenCalledTimes(1)
    expect(ouvinte.mock.calls[0][2]).toEqual({ origem: 'importacao' })
  })

  it('substituirTudo com arquivo fora do schema rejeita sem salvar', async () => {
    const adapter = new AdapterFake([stackInicial()])
    const { result } = await montarPronto(adapter)
    const invalido = { versao: 1, stacks: [{ id: '' }] } as unknown as StacksFile

    await act(async () => {
      await expect(result.current.substituirTudo(invalido)).rejects.toMatchObject({
        name: 'StorageError',
        message: 'O arquivo importado é inválido.',
      })
    })

    expect(adapter.salvar).not.toHaveBeenCalled()
    expect(result.current.stacks.map((s) => s.id)).toEqual(['react'])
  })

  it('substituirTudo com falha no adapter mantém o estado e expõe erro', async () => {
    const adapter = new AdapterFake([stackInicial()])
    const { result } = await montarPronto(adapter)
    const ouvinte = vi.fn()
    act(() => {
      result.current.assinarEscritas(ouvinte)
    })
    adapter.falharSalvar = new StorageError('Disco cheio')

    await act(async () => {
      await result.current.substituirTudo({ versao: 1, stacks: [] }).catch(() => {})
    })

    expect(adapter.salvar).toHaveBeenCalledTimes(1)
    expect(result.current.stacks.map((s) => s.id)).toEqual(['react'])
    expect(result.current.erro?.message).toBe('Disco cheio')
    expect(result.current.salvando).toBe(false)
    expect(ouvinte).not.toHaveBeenCalled()
  })

  it('lança erro claro quando usado fora do provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderHook(() => useStacks())).toThrow(
      'useStacks deve ser usado dentro de um <StacksProvider>.',
    )
  })
})
