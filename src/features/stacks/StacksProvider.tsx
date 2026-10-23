/**
 * Estado das stacks com persistência pessimista.
 *
 * Cada escrita calcula o próximo StacksFile a partir do último estado SALVO,
 * chama adapter.salvar e só então atualiza o estado com o que o adapter
 * devolveu. Em falha, o estado anterior é mantido e `erro` é exposto.
 * Carregar e escrever passam por uma fila única: operações disparadas em
 * sequência (mesmo sem await) são aplicadas uma após a outra, na ordem.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Stack, StacksFile } from '../../domain/types'
import { StorageError, type StorageAdapter } from '../../storage'
import { StacksContext, type StacksContextValue, type StatusStacks } from './StacksContext'
import {
  adicionarStack,
  atualizarStack,
  removerStack,
  type AtualizacaoStack,
  type NovaStack,
  type ResultadoOperacao,
} from './stacksOperations'

export interface StacksProviderProps {
  adapter: StorageAdapter
  /** Data de referência (ou relógio) para snapshots e defaults. Padrão: agora. */
  hoje?: Date | (() => Date)
  children?: ReactNode
}

const SEM_STACKS: Stack[] = []

function paraStorageError(erro: unknown, mensagem: string): StorageError {
  if (erro instanceof StorageError) return erro
  const detalhe = erro instanceof Error ? erro.message : String(erro)
  return new StorageError(mensagem, [detalhe])
}

export function StacksProvider({ adapter, hoje, children }: StacksProviderProps) {
  const [dados, setDados] = useState<StacksFile | null>(null)
  const [status, setStatus] = useState<StatusStacks>('carregando')
  const [erro, setErro] = useState<StorageError | null>(null)
  const [salvando, setSalvando] = useState(false)

  /** Último estado salvo/carregado; lido por cada tarefa da fila. */
  const dadosRef = useRef<StacksFile | null>(null)
  const filaRef = useRef<Promise<unknown>>(Promise.resolve())
  const escritasPendentesRef = useRef(0)

  // Mantém o relógio atual acessível às tarefas sem recriar as operações.
  const hojeRef = useRef(hoje)
  useEffect(() => {
    hojeRef.current = hoje
  }, [hoje])

  const obterHoje = useCallback((): Date => {
    const h = hojeRef.current
    return typeof h === 'function' ? h() : (h ?? new Date())
  }, [])

  const enfileirar = useCallback(<T,>(tarefa: () => Promise<T>): Promise<T> => {
    const execucao = filaRef.current.then(tarefa)
    // A fila segue mesmo se esta tarefa falhar.
    filaRef.current = execucao.catch(() => undefined)
    return execucao
  }, [])

  const recarregar = useCallback(
    (): Promise<void> =>
      enfileirar(async () => {
        setStatus('carregando')
        try {
          const carregado = await adapter.carregar()
          dadosRef.current = carregado
          setDados(carregado)
          setErro(null)
          setStatus('pronto')
        } catch (e) {
          const falha = paraStorageError(e, 'Não foi possível carregar as stacks.')
          setErro(falha)
          setStatus('erro')
          throw falha
        }
      }),
    [adapter, enfileirar],
  )

  const escrever = useCallback(
    (calcular: (atual: StacksFile) => ResultadoOperacao): Promise<Stack> => {
      escritasPendentesRef.current++
      setSalvando(true)
      return enfileirar(async () => {
        const atual = dadosRef.current
        if (!atual) {
          const falha = new StorageError(
            'Não foi possível salvar as stacks: os dados ainda não foram carregados.',
          )
          setErro(falha)
          throw falha
        }
        // Erros de uso (ex.: id inexistente) rejeitam sem tocar em `erro`.
        const { dados: proximo, stack } = calcular(atual)
        let salvo: StacksFile
        try {
          salvo = await adapter.salvar(proximo)
        } catch (e) {
          const falha = paraStorageError(e, 'Não foi possível salvar as stacks.')
          setErro(falha)
          throw falha
        }
        dadosRef.current = salvo
        setDados(salvo)
        setErro(null)
        // Prefere a versão devolvida pelo adapter (fonte da verdade).
        return salvo.stacks.find((s) => s.id === stack.id) ?? stack
      }).finally(() => {
        escritasPendentesRef.current--
        if (escritasPendentesRef.current === 0) setSalvando(false)
      })
    },
    [adapter, enfileirar],
  )

  const adicionar = useCallback(
    (nova: NovaStack) => escrever((atual) => adicionarStack(atual, nova, { hoje: obterHoje() })),
    [escrever, obterHoje],
  )

  const atualizar = useCallback(
    (id: string, atualizacao: AtualizacaoStack) =>
      escrever((atual) => atualizarStack(atual, id, atualizacao, { hoje: obterHoje() })),
    [escrever, obterHoje],
  )

  const remover = useCallback(
    (id: string) => escrever((atual) => removerStack(atual, id)),
    [escrever],
  )

  const limparErro = useCallback(() => setErro(null), [])

  useEffect(() => {
    // A falha já fica exposta em `status`/`erro`.
    recarregar().catch(() => undefined)
  }, [recarregar])

  const valor = useMemo<StacksContextValue>(
    () => ({
      stacks: dados?.stacks ?? SEM_STACKS,
      status,
      erro,
      salvando,
      recarregar,
      adicionar,
      atualizar,
      remover,
      limparErro,
    }),
    [dados, status, erro, salvando, recarregar, adicionar, atualizar, remover, limparErro],
  )

  return <StacksContext.Provider value={valor}>{children}</StacksContext.Provider>
}
