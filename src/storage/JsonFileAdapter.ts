/**
 * StorageAdapter que persiste via GET/PUT /api/stacks (plugin local do Vite,
 * que grava data/stacks.json). Não confia no servidor: toda resposta é
 * validada com o schema antes de chegar à UI.
 */

import { parseStacksFile } from '../domain/schema'
import type { StacksFile } from '../domain/types'
import { StorageError, type StorageAdapter } from './StorageAdapter'

export const CAMINHO_API_STACKS = '/api/stacks'

export type FuncaoFetch = typeof fetch

export interface OpcoesJsonFileAdapter {
  /** Origem do servidor (ex.: "http://localhost:5173"). Padrão: mesma origem. */
  baseUrl?: string
  /** Implementação de fetch (injetável para testes). Padrão: fetch global. */
  fetch?: FuncaoFetch
}

type Operacao = 'carregar' | 'salvar'

const PREFIXOS: Record<Operacao, string> = {
  carregar: 'Não foi possível carregar as stacks',
  salvar: 'Não foi possível salvar as stacks',
}

function motivoPorStatus(status: number): string {
  if (status === 400) return 'os dados foram recusados pelo servidor.'
  if (status === 413) return 'os dados são grandes demais para salvar.'
  if (status >= 500) return 'o servidor encontrou um erro ao acessar o arquivo de dados.'
  return `o servidor respondeu com erro (HTTP ${status}).`
}

function ehListaDeTextos(valor: unknown): valor is string[] {
  return Array.isArray(valor) && valor.every((item) => typeof item === 'string')
}

/** Extrai `erros: string[]` do corpo de uma resposta de erro, se houver. */
function extrairErros(texto: string): string[] {
  try {
    const corpo: unknown = JSON.parse(texto)
    if (typeof corpo === 'object' && corpo !== null && 'erros' in corpo) {
      const { erros } = corpo
      if (ehListaDeTextos(erros)) return erros
    }
  } catch {
    // Corpo não é JSON: sem detalhes estruturados.
  }
  return []
}

export class JsonFileAdapter implements StorageAdapter {
  private readonly url: string
  private readonly fetch: FuncaoFetch

  constructor({ baseUrl = '', fetch: fetchInjetado }: OpcoesJsonFileAdapter = {}) {
    this.url = `${baseUrl.replace(/\/+$/, '')}${CAMINHO_API_STACKS}`
    // Resolvido na chamada para respeitar stubs do fetch global feitos depois.
    this.fetch = fetchInjetado ?? ((...args) => globalThis.fetch(...args))
  }

  carregar(): Promise<StacksFile> {
    return this.requisitar('carregar', { method: 'GET', headers: { Accept: 'application/json' } })
  }

  salvar(dados: StacksFile): Promise<StacksFile> {
    return this.requisitar('salvar', {
      method: 'PUT',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    })
  }

  private async requisitar(operacao: Operacao, init: RequestInit): Promise<StacksFile> {
    const prefixo = PREFIXOS[operacao]

    let resposta: Response
    let texto: string
    try {
      resposta = await this.fetch(this.url, init)
      texto = await resposta.text()
    } catch (erro) {
      const detalhe = erro instanceof Error ? erro.message : String(erro)
      throw new StorageError(
        `${prefixo}: sem conexão com o servidor. Verifique se o app está rodando.`,
        [detalhe],
      )
    }

    if (!resposta.ok) {
      throw new StorageError(
        `${prefixo}: ${motivoPorStatus(resposta.status)}`,
        extrairErros(texto),
        resposta.status,
      )
    }

    let corpo: unknown
    try {
      corpo = JSON.parse(texto)
    } catch {
      throw new StorageError(
        `${prefixo}: a resposta do servidor não é um JSON válido.`,
        [],
        resposta.status,
      )
    }

    const resultado = parseStacksFile(corpo)
    if (!resultado.ok) {
      throw new StorageError(
        `${prefixo}: a resposta do servidor tem formato inválido.`,
        resultado.erros,
        resposta.status,
      )
    }
    return resultado.dados
  }
}
