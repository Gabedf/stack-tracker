import { useState } from 'react'
import { StorageError } from '../../storage'

export type EstadoEnvio =
  | { tipo: 'ocioso' }
  | { tipo: 'salvando' }
  | { tipo: 'sucesso'; mensagem: string }
  | { tipo: 'erro'; mensagem: string; detalhes: string[] }

function descreverErro(erro: unknown): { mensagem: string; detalhes: string[] } {
  if (erro instanceof StorageError) return { mensagem: erro.message, detalhes: erro.detalhes }
  if (erro instanceof Error && erro.message) return { mensagem: erro.message, detalhes: [] }
  return { mensagem: 'Não foi possível salvar.', detalhes: [] }
}

export interface InlineEdit<T> {
  rascunho: T
  /** true se o rascunho difere do valor salvo. */
  alterado: boolean
  envio: EstadoEnvio
  alterar(mudancas: Partial<T>): void
  /** Volta o rascunho ao valor salvo e limpa mensagens. */
  desfazer(): void
  /**
   * Persiste o rascunho. Em sucesso, mostra `mensagemSucesso`; em falha, mostra
   * o erro e mantém o rascunho para nova tentativa.
   */
  salvar(persistir: (rascunho: T) => Promise<unknown>, mensagemSucesso: string): Promise<void>
}

/**
 * Estado de um editor inline: rascunho local comparado ao valor salvo
 * (`original`), com salvar/desfazer e feedback de sucesso ou erro.
 */
export function useInlineEdit<T extends object>(
  original: T,
  iguais: (a: T, b: T) => boolean,
): InlineEdit<T> {
  const [rascunho, setRascunho] = useState<T>(original)
  const [envio, setEnvio] = useState<EstadoEnvio>({ tipo: 'ocioso' })

  function alterar(mudancas: Partial<T>) {
    setRascunho((atual) => ({ ...atual, ...mudancas }))
    // Mensagem de sucesso antiga não descreve mais o rascunho.
    setEnvio((atual) => (atual.tipo === 'sucesso' ? { tipo: 'ocioso' } : atual))
  }

  function desfazer() {
    setRascunho(original)
    setEnvio({ tipo: 'ocioso' })
  }

  async function salvar(persistir: (rascunho: T) => Promise<unknown>, mensagemSucesso: string) {
    setEnvio({ tipo: 'salvando' })
    try {
      await persistir(rascunho)
      setEnvio({ tipo: 'sucesso', mensagem: mensagemSucesso })
    } catch (erro) {
      setEnvio({ tipo: 'erro', ...descreverErro(erro) })
    }
  }

  return {
    rascunho,
    alterado: !iguais(rascunho, original),
    envio,
    alterar,
    desfazer,
    salvar,
  }
}
