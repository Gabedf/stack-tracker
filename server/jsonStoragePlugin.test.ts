// @vitest-environment node
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { StacksFile } from '../src/domain/types'
import {
  criarMiddleware,
  criarStorageHandlers,
  ErroValidacao,
  type StorageHandlers,
} from './jsonStoragePlugin'

const SEED: StacksFile = {
  versao: 1,
  stacks: [
    {
      id: 'ts',
      nome: 'TypeScript',
      categoria: 'Linguagens',
      tags: ['tipos'],
      dimensoes: { teoria: 7, pratica: 6, profundidade: 5, ultimoUso: '2026-01-10' },
      experiencia: { tipo: 'projeto_pessoal', meses: 12 },
      evidencias: [],
      historico: [],
    },
  ],
}

const NOVO: StacksFile = {
  versao: 1,
  stacks: [{ ...SEED.stacks[0], id: 'go', nome: 'Go', categoria: 'Backend' }],
}

let dir: string
let arquivoDados: string
let arquivoSeed: string
let handlers: StorageHandlers

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'painel-stacks-'))
  arquivoDados = path.join(dir, 'data', 'stacks.json')
  arquivoSeed = path.join(dir, 'data', 'seed.json')
  handlers = criarStorageHandlers({ arquivoDados, arquivoSeed })
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

async function escreverSeed(dados: unknown = SEED): Promise<void> {
  await mkdir(path.dirname(arquivoSeed), { recursive: true })
  await writeFile(arquivoSeed, JSON.stringify(dados), 'utf-8')
}

async function lerArquivoDados(): Promise<string> {
  return readFile(arquivoDados, 'utf-8')
}

describe('criarStorageHandlers', () => {
  it('ler cria o arquivo de dados a partir do seed quando não existe', async () => {
    await escreverSeed()
    expect(existsSync(arquivoDados)).toBe(false)

    expect(await handlers.ler()).toEqual(SEED)
    expect(JSON.parse(await lerArquivoDados())).toEqual(SEED)
  })

  it('ler sem seed cria um arquivo vazio válido', async () => {
    expect(await handlers.ler()).toEqual({ versao: 1, stacks: [] })
    expect(JSON.parse(await lerArquivoDados())).toEqual({ versao: 1, stacks: [] })
  })

  it('ler não recopia o seed se o arquivo de dados já existe', async () => {
    await escreverSeed()
    await handlers.gravar(NOVO)
    expect(await handlers.ler()).toEqual(NOVO)
  })

  it('ler rejeita um arquivo de dados inválido', async () => {
    await escreverSeed()
    await writeFile(arquivoDados, '{ quebrado', 'utf-8')
    await expect(handlers.ler()).rejects.toBeInstanceOf(ErroValidacao)
  })

  it('gravar válido altera o arquivo (2 espaços, newline final) e ler devolve o novo conteúdo', async () => {
    await escreverSeed()
    await handlers.ler()

    expect(await handlers.gravar(NOVO)).toEqual(NOVO)
    expect(await lerArquivoDados()).toBe(`${JSON.stringify(NOVO, null, 2)}\n`)
    expect(await handlers.ler()).toEqual(NOVO)
  })

  it('gravar inválido lança ErroValidacao sem tocar no arquivo', async () => {
    await escreverSeed()
    await handlers.ler()
    const antes = await lerArquivoDados()

    const erro = await handlers.gravar({ versao: 2, stacks: [] }).catch((e: unknown) => e)
    expect(erro).toBeInstanceOf(ErroValidacao)
    expect((erro as ErroValidacao).erros).toContain(
      'versao: Versão do arquivo não suportada (esperado 1).',
    )
    expect(await lerArquivoDados()).toBe(antes)
  })

  it('gravar não deixa arquivos temporários para trás', async () => {
    await handlers.gravar(NOVO)
    expect(await readdir(path.dirname(arquivoDados))).toEqual(['stacks.json'])
  })
})

describe('criarMiddleware (servidor http efêmero)', () => {
  let server: Server
  let base: string

  beforeEach(async () => {
    const middleware = criarMiddleware(handlers, { limiteCorpo: 1024 })
    server = createServer((req, res) =>
      middleware(req, res, () => {
        res.statusCode = 404
        res.end()
      }),
    )
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  })

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })

  const url = () => `${base}/api/stacks`
  const put = (body: string) => fetch(url(), { method: 'PUT', body })

  it('GET responde 200 com o conteúdo (criado a partir do seed)', async () => {
    await escreverSeed()
    const res = await fetch(url())
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toMatch(/application\/json/)
    expect(await res.json()).toEqual(SEED)
  })

  it('PUT válido responde 200, altera o arquivo e o GET seguinte devolve o novo conteúdo', async () => {
    await escreverSeed()
    const res = await put(JSON.stringify(NOVO))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(NOVO)
    expect(JSON.parse(await lerArquivoDados())).toEqual(NOVO)

    const get = await fetch(url())
    expect(await get.json()).toEqual(NOVO)
  })

  it('PUT fora do schema responde 400 com erros e não altera o arquivo', async () => {
    await escreverSeed()
    await fetch(url())
    const antes = await lerArquivoDados()

    const res = await put(JSON.stringify({ versao: 1, stacks: [{ id: '' }] }))
    expect(res.status).toBe(400)
    const corpo = (await res.json()) as { erros: string[] }
    expect(corpo.erros.length).toBeGreaterThan(0)
    expect(await lerArquivoDados()).toBe(antes)
  })

  it('PUT com JSON malformado responde 400', async () => {
    const res = await put('{ "versao": 1, ')
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ erros: ['O corpo da requisição não é um JSON válido.'] })
    expect(existsSync(arquivoDados)).toBe(false)
  })

  it('PUT acima do limite responde 413', async () => {
    const res = await put(JSON.stringify({ versao: 1, stacks: [], lixo: 'x'.repeat(2048) }))
    expect(res.status).toBe(413)
    expect(existsSync(arquivoDados)).toBe(false)
  })

  it('outros métodos respondem 405 com Allow', async () => {
    for (const method of ['POST', 'DELETE', 'PATCH']) {
      const res = await fetch(url(), { method })
      expect(res.status, method).toBe(405)
      expect(res.headers.get('allow')).toBe('GET, PUT')
    }
  })

  it('aceita query string e repassa outras rotas para o próximo middleware', async () => {
    await escreverSeed()
    expect((await fetch(`${url()}?t=1`)).status).toBe(200)
    expect((await fetch(`${base}/api/outra`)).status).toBe(404)
  })

  it('GET com arquivo de dados corrompido responde 500 com erros', async () => {
    await escreverSeed()
    await writeFile(arquivoDados, '{ quebrado', 'utf-8')
    const res = await fetch(url())
    expect(res.status).toBe(500)
    const corpo = (await res.json()) as { erros: string[] }
    expect(corpo.erros.length).toBeGreaterThan(0)
  })
})
