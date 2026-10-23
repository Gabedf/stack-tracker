/**
 * Contrato de persistência do Painel de Stacks, independente de backend.
 *
 * A UI depende só desta interface. Hoje o JsonFileAdapter fala com o plugin
 * local do Vite; no futuro um ApiAdapter/Supabase implementará a mesma
 * interface sem mexer na UI.
 */

import type { StacksFile } from '../domain/types'

export interface StorageAdapter {
  /** Lê os dados persistidos, já validados. */
  carregar(): Promise<StacksFile>
  /** Persiste os dados e devolve o que foi efetivamente salvo, já validado. */
  salvar(dados: StacksFile): Promise<StacksFile>
}

/** Falha de persistência com mensagem amigável em português e detalhes. */
export class StorageError extends Error {
  /** Detalhes da falha (ex.: erros de validação devolvidos pelo servidor). */
  readonly detalhes: string[]
  /** Status HTTP, quando a falha veio de uma resposta do servidor. */
  readonly status?: number

  constructor(mensagem: string, detalhes: string[] = [], status?: number) {
    super(mensagem)
    this.name = 'StorageError'
    this.detalhes = detalhes
    this.status = status
  }
}
