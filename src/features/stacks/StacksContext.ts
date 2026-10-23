import { createContext } from 'react'
import type { Stack, StacksFile } from '../../domain/types'
import type { StorageError } from '../../storage'
import type { AtualizacaoStack, NovaStack } from './stacksOperations'

export type StatusStacks = 'carregando' | 'pronto' | 'erro'

/** Chamado após cada escrita salva com sucesso, com o estado anterior e o salvo. */
export type OuvinteEscrita = (antes: StacksFile, depois: StacksFile) => void

export interface StacksContextValue {
  /** Stacks do último estado salvo (ou carregado) com sucesso. */
  stacks: Stack[]
  status: StatusStacks
  /** Última falha de persistência (carregar ou salvar). */
  erro: StorageError | null
  /** true enquanto houver operação de escrita pendente. */
  salvando: boolean
  /** Lê de novo os dados do adapter. */
  recarregar(): Promise<void>
  /** Cria a stack (com snapshot inicial), salva e resolve com ela. */
  adicionar(dados: NovaStack): Promise<Stack>
  /** Atualiza a stack (snapshot se nota/dimensões mudaram), salva e resolve com ela. */
  atualizar(id: string, atualizacao: AtualizacaoStack): Promise<Stack>
  /** Remove a stack, salva e resolve com a stack removida. */
  remover(id: string): Promise<Stack>
  limparErro(): void
  /**
   * Avisa `ouvinte` após cada escrita do usuário (adicionar, atualizar, remover)
   * salva com sucesso. Carregar/recarregar não avisa. Devolve o cancelamento.
   */
  assinarEscritas(ouvinte: OuvinteEscrita): () => void
}

export const StacksContext = createContext<StacksContextValue | null>(null)
