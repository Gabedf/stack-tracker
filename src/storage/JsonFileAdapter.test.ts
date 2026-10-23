import { describe, expect, it, vi } from 'vitest'
import type { StacksFile } from '../domain/types'
import { JsonFileAdapter, type FuncaoFetch } from './JsonFileAdapter'
import { StorageError } from './StorageAdapter'

const DADOS: StacksFile = {
  versao: 1,
  stacks: [
    {
      id: 'ts',
      nome: 'TypeScript',
      categoria: 'Linguagem',
      tags: ['front'],
      dimensoes: { teoria: 7, pratica: 6, profundidade: 5, ultimoUso: '2026-10-01' },
      experiencia: { tipo: 'projeto_pessoal', meses: 12 },
      evidencias: [],
      historico: [],
    },
  ],
}

function respostaJson(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}

function fetchFalso(resposta: Response | (() => Promise<Response>)) {
  return vi.fn<FuncaoFetch>(() =>
    typeof resposta === 'function' ? resposta() : Promise.resolve(resposta),
  )
}

async function capturarErro(promessa: Promise<unknown>): Promise<StorageError> {
  const erro = await promessa.then(
    () => {
      throw new Error('Esperava rejeição, mas a promessa resolveu.')
    },
    (e: unknown) => e,
  )
  expect(erro).toBeInstanceOf(StorageError)
  return erro as StorageError
}

describe('JsonFileAdapter.carregar', () => {
  it('faz GET em /api/stacks e devolve os dados validados', async () => {
    const fetch = fetchFalso(respostaJson(DADOS))
    const adapter = new JsonFileAdapter({ fetch })

    await expect(adapter.carregar()).resolves.toEqual(DADOS)
    expect(fetch).toHaveBeenCalledTimes(1)
    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe('/api/stacks')
    expect(init?.method).toBe('GET')
  })

  it('usa a baseUrl informada (sem barra duplicada)', async () => {
    const fetch = fetchFalso(respostaJson(DADOS))
    await new JsonFileAdapter({ baseUrl: 'http://localhost:5173/', fetch }).carregar()
    expect(fetch.mock.calls[0][0]).toBe('http://localhost:5173/api/stacks')
  })

  it('rejeita resposta 200 fora do schema com StorageError e detalhes', async () => {
    const fetch = fetchFalso(respostaJson({ versao: 2, stacks: [] }))
    const erro = await capturarErro(new JsonFileAdapter({ fetch }).carregar())

    expect(erro.message).toMatch(/carregar.*formato inválido/)
    expect(erro.status).toBe(200)
    expect(erro.detalhes).toEqual([expect.stringMatching(/^versao: Versão do arquivo/)])
  })

  it('rejeita resposta 200 que não é JSON', async () => {
    const fetch = fetchFalso(new Response('<html>oops</html>', { status: 200 }))
    const erro = await capturarErro(new JsonFileAdapter({ fetch }).carregar())
    expect(erro.message).toMatch(/não é um JSON válido/)
  })

  it('converte 500 do servidor em StorageError usando os erros do corpo', async () => {
    const fetch = fetchFalso(respostaJson({ erros: ['Arquivo inválido: data/stacks.json'] }, 500))
    const erro = await capturarErro(new JsonFileAdapter({ fetch }).carregar())

    expect(erro.status).toBe(500)
    expect(erro.message).toMatch(/^Não foi possível carregar as stacks/)
    expect(erro.detalhes).toEqual(['Arquivo inválido: data/stacks.json'])
  })

  it('converte erro de rede em StorageError', async () => {
    const fetch = fetchFalso(() => Promise.reject(new TypeError('Failed to fetch')))
    const erro = await capturarErro(new JsonFileAdapter({ fetch }).carregar())

    expect(erro.message).toMatch(/sem conexão com o servidor/)
    expect(erro.status).toBeUndefined()
    expect(erro.detalhes).toEqual(['Failed to fetch'])
  })
})

describe('JsonFileAdapter.salvar', () => {
  it('envia PUT com JSON e Content-Type e devolve o resultado validado', async () => {
    const fetch = fetchFalso(respostaJson(DADOS))
    const adapter = new JsonFileAdapter({ fetch })

    await expect(adapter.salvar(DADOS)).resolves.toEqual(DADOS)
    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe('/api/stacks')
    expect(init?.method).toBe('PUT')
    expect(new Headers(init?.headers).get('Content-Type')).toBe('application/json')
    expect(JSON.parse(String(init?.body))).toEqual(DADOS)
  })

  it('não confia na resposta do PUT: corpo inválido vira StorageError', async () => {
    const fetch = fetchFalso(respostaJson({ ok: true }))
    const erro = await capturarErro(new JsonFileAdapter({ fetch }).salvar(DADOS))
    expect(erro.message).toMatch(/salvar.*formato inválido/)
    expect(erro.detalhes.length).toBeGreaterThan(0)
  })

  it('converte 400 com erros em StorageError com os detalhes do servidor', async () => {
    const erros = ['stacks[0].nome: O nome não pode ficar vazio.']
    const fetch = fetchFalso(respostaJson({ erros }, 400))
    const erro = await capturarErro(new JsonFileAdapter({ fetch }).salvar(DADOS))

    expect(erro.status).toBe(400)
    expect(erro.message).toBe(
      'Não foi possível salvar as stacks: os dados foram recusados pelo servidor.',
    )
    expect(erro.detalhes).toEqual(erros)
  })

  it('converte 413 em StorageError mesmo sem corpo JSON', async () => {
    const fetch = fetchFalso(new Response('Payload Too Large', { status: 413 }))
    const erro = await capturarErro(new JsonFileAdapter({ fetch }).salvar(DADOS))

    expect(erro.status).toBe(413)
    expect(erro.message).toMatch(/grandes demais/)
    expect(erro.detalhes).toEqual([])
  })

  it('converte erro de rede em StorageError', async () => {
    const fetch = fetchFalso(() => Promise.reject(new TypeError('Failed to fetch')))
    const erro = await capturarErro(new JsonFileAdapter({ fetch }).salvar(DADOS))
    expect(erro.message).toMatch(/^Não foi possível salvar as stacks: sem conexão/)
  })
})
