/**
 * Persistência local do Painel de Stacks: plugin do Vite que expõe
 * GET/PUT /api/stacks lendo e gravando data/stacks.json (arquivo de trabalho,
 * ignorado pelo git). Se o arquivo não existir, é criado a partir do seed
 * fictício data/seed.json.
 *
 * A lógica de arquivo (`criarStorageHandlers`) e a de HTTP (`criarMiddleware`)
 * ficam separadas do plugin para poderem ser testadas sem subir o Vite.
 */

import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'node:path'
import type { Plugin } from 'vite'
import { parseStacksFile } from '../src/domain/schema'
import { VERSAO_STACKS_FILE, type StacksFile } from '../src/domain/types'
import { carregarStacksFile } from '../src/storage/stacksFileLoader'

export const ROTA_STACKS = '/api/stacks'
export const LIMITE_CORPO_BYTES = 1024 * 1024

/** Dados que não passam no schema (no corpo do PUT ou em um arquivo em disco). */
export class ErroValidacao extends Error {
  readonly erros: string[]

  constructor(erros: string[], mensagem = 'Dados inválidos.') {
    super(mensagem)
    this.name = 'ErroValidacao'
    this.erros = erros
  }
}

export interface OpcoesStorage {
  /** Caminho absoluto do arquivo de trabalho (ex.: data/stacks.json). */
  arquivoDados: string
  /** Caminho absoluto do seed usado quando o arquivo de trabalho não existe. */
  arquivoSeed: string
}

export interface StorageHandlers {
  ler(): Promise<StacksFile>
  gravar(corpo: unknown): Promise<StacksFile>
}

function ehArquivoInexistente(erro: unknown): boolean {
  return erro instanceof Error && (erro as NodeJS.ErrnoException).code === 'ENOENT'
}

async function lerTextoSeExistir(arquivo: string): Promise<string | undefined> {
  try {
    return await readFile(arquivo, 'utf-8')
  } catch (erro) {
    if (ehArquivoInexistente(erro)) return undefined
    throw erro
  }
}

function validarTexto(texto: string, arquivo: string): StacksFile {
  const resultado = carregarStacksFile(texto)
  if (!resultado.ok) {
    throw new ErroValidacao(resultado.erros, `Arquivo inválido: ${arquivo}`)
  }
  return resultado.dados
}

/** Escrita atômica: grava num temporário na mesma pasta e renomeia por cima. */
async function escreverAtomico(arquivo: string, dados: StacksFile): Promise<void> {
  await mkdir(path.dirname(arquivo), { recursive: true })
  const temporario = `${arquivo}.${randomUUID()}.tmp`
  try {
    await writeFile(temporario, `${JSON.stringify(dados, null, 2)}\n`, 'utf-8')
    await rename(temporario, arquivo)
  } catch (erro) {
    await rm(temporario, { force: true })
    throw erro
  }
}

export function criarStorageHandlers({
  arquivoDados,
  arquivoSeed,
}: OpcoesStorage): StorageHandlers {
  return {
    async ler() {
      const texto = await lerTextoSeExistir(arquivoDados)
      if (texto !== undefined) return validarTexto(texto, arquivoDados)

      const textoSeed = await lerTextoSeExistir(arquivoSeed)
      const dados: StacksFile =
        textoSeed === undefined
          ? { versao: VERSAO_STACKS_FILE, stacks: [] }
          : validarTexto(textoSeed, arquivoSeed)
      await escreverAtomico(arquivoDados, dados)
      return dados
    },

    async gravar(corpo) {
      const resultado = parseStacksFile(corpo)
      if (!resultado.ok) throw new ErroValidacao(resultado.erros)
      await escreverAtomico(arquivoDados, resultado.dados)
      return resultado.dados
    },
  }
}

// --- HTTP ---

class ErroCorpoGrande extends Error {}

function responderJson(res: ServerResponse, status: number, corpo: unknown): void {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(corpo))
}

function lerCorpo(req: IncomingMessage, limite: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const tamanhoDeclarado = Number(req.headers['content-length'])
    if (tamanhoDeclarado > limite) {
      req.resume()
      reject(new ErroCorpoGrande())
      return
    }

    const partes: Buffer[] = []
    let total = 0
    let estourou = false
    req.on('data', (parte: Buffer) => {
      if (estourou) return
      total += parte.length
      if (total > limite) {
        estourou = true
        partes.length = 0
        reject(new ErroCorpoGrande())
        return
      }
      partes.push(parte)
    })
    req.on('end', () => {
      if (!estourou) resolve(Buffer.concat(partes).toString('utf-8'))
    })
    req.on('error', reject)
  })
}

export type Middleware = (req: IncomingMessage, res: ServerResponse, next: () => void) => void

export function criarMiddleware(
  handlers: StorageHandlers,
  { limiteCorpo = LIMITE_CORPO_BYTES }: { limiteCorpo?: number } = {},
): Middleware {
  async function tratar(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (req.method === 'GET') {
      responderJson(res, 200, await handlers.ler())
      return
    }

    if (req.method === 'PUT') {
      let texto: string
      try {
        texto = await lerCorpo(req, limiteCorpo)
      } catch (erro) {
        if (!(erro instanceof ErroCorpoGrande)) throw erro
        res.setHeader('Connection', 'close')
        responderJson(res, 413, {
          erros: [`O corpo da requisição excede o limite de ${limiteCorpo} bytes.`],
        })
        return
      }

      let corpo: unknown
      try {
        corpo = JSON.parse(texto)
      } catch {
        responderJson(res, 400, { erros: ['O corpo da requisição não é um JSON válido.'] })
        return
      }

      try {
        responderJson(res, 200, await handlers.gravar(corpo))
      } catch (erro) {
        if (!(erro instanceof ErroValidacao)) throw erro
        responderJson(res, 400, { erros: erro.erros })
      }
      return
    }

    res.setHeader('Allow', 'GET, PUT')
    responderJson(res, 405, { erros: [`Método ${req.method ?? ''} não permitido.`] })
  }

  return (req, res, next) => {
    const caminho = new URL(req.url ?? '/', 'http://localhost').pathname
    if (caminho !== ROTA_STACKS) {
      next()
      return
    }

    tratar(req, res).catch((erro: unknown) => {
      const erros =
        erro instanceof ErroValidacao
          ? [erro.message, ...erro.erros]
          : [erro instanceof Error ? erro.message : String(erro)]
      if (res.headersSent) {
        res.end()
        return
      }
      responderJson(res, 500, { erros })
    })
  }
}

// --- Plugin ---

export interface OpcoesPlugin {
  /** Arquivo de trabalho, relativo à raiz do projeto. Padrão: data/stacks.json. */
  arquivoDados?: string
  /** Seed fictício, relativo à raiz do projeto. Padrão: data/seed.json. */
  arquivoSeed?: string
}

export function jsonStoragePlugin(opcoes: OpcoesPlugin = {}): Plugin {
  let middleware: Middleware | undefined

  return {
    name: 'painel-de-stacks:json-storage',
    configResolved(config) {
      const handlers = criarStorageHandlers({
        arquivoDados: path.resolve(config.root, opcoes.arquivoDados ?? 'data/stacks.json'),
        arquivoSeed: path.resolve(config.root, opcoes.arquivoSeed ?? 'data/seed.json'),
      })
      middleware = criarMiddleware(handlers)
    },
    configureServer(server) {
      if (middleware) server.middlewares.use(middleware)
    },
    configurePreviewServer(server) {
      if (middleware) server.middlewares.use(middleware)
    },
  }
}
