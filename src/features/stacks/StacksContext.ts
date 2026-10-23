import { createContext } from 'react'
import type { Stack, StacksFile } from '../../domain/types'
import type { StorageError } from '../../storage'
import type { AtualizacaoStack, NovaStack } from './stacksOperations'

export type StatusStacks = 'carregando' | 'pronto' | 'erro'

/**
 * De onde veio a escrita: 'usuario' (adicionar, atualizar, remover) ou
 * 'importacao' (substituirTudo). Importar não é progresso do usuário.
 */
export type OrigemEscrita = 'usuario' | 'importacao'

export interface InfoEscrita {
  origem: OrigemEscrita
}

/** Chamado após cada escrita salva com sucesso, com o estado anterior, o salvo e a origem. */
export type OuvinteEscrita = (antes: StacksFile, depois: StacksFile, info: InfoEscrita) => void

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
  /**
   * Troca o arquivo inteiro (ex.: importação), pela mesma fila e persistência
   * pessimista. Rejeita sem salvar se o arquivo não passar no schema; em falha
   * do adapter mantém o estado e expõe `erro`. Resolve com o que foi salvo.
   */
  substituirTudo(arquivo: StacksFile): Promise<StacksFile>
  limparErro(): void
  /**
   * Avisa `ouvinte` após cada escrita salva com sucesso, com a origem
   * ('usuario' para adicionar/atualizar/remover, 'importacao' para
   * substituirTudo). Carregar/recarregar não avisa. Devolve o cancelamento.
   */
  assinarEscritas(ouvinte: OuvinteEscrita): () => void
}

export const StacksContext = createContext<StacksContextValue | null>(null)
