/**
 * Estado das stacks com persistência pessimista.
 *
 * Cada escrita calcula o próximo StacksFile a partir do último estado SALVO,
 * chama adapter.salvar e só então atualiza o estado com o que o adapter
 * devolveu. Em falha, o estado anterior é mantido e `erro` é exposto.
 * substituirTudo (importação) usa o mesmo caminho, com origem 'importacao'.
 * Carregar e escrever passam por uma fila única: operações disparadas em
 * sequência (mesmo sem await) são aplicadas uma após a outra, na ordem.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Stack, StacksFile } from '../../domain/types'
import { parseStacksFile } from '../../domain/schema'
import { StorageError, type StorageAdapter } from '../../storage'
import {
  StacksContext,
  type OrigemEscrita,
  type OuvinteEscrita,
  type StacksContextValue,
  type StatusStacks,
} from './StacksContext'
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
  /** Quem quer saber de cada escrita salva (ex.: detecção de level-up). */
  const ouvintesRef = useRef(new Set<OuvinteEscrita>())

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

  /**
   * Núcleo das escritas: calcula o próximo arquivo a partir do último salvo,
   * persiste e só então troca o estado e avisa os ouvintes.
   */
  const persistir = useCallback(
    <T,>(
      calcular: (atual: StacksFile) => { dados: StacksFile; resultado: (salvo: StacksFile) => T },
      origem: OrigemEscrita,
    ): Promise<T> => {
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
        const { dados: proximo, resultado } = calcular(atual)
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
        for (const ouvinte of [...ouvintesRef.current]) {
          try {
            ouvinte(atual, salvo, { origem })
          } catch {
            // Um ouvinte com defeito não desfaz uma escrita já salva.
          }
        }
        return resultado(salvo)
      }).finally(() => {
        escritasPendentesRef.current--
        if (escritasPendentesRef.current === 0) setSalvando(false)
      })
    },
    [adapter, enfileirar],
  )

  const escrever = useCallback(
    (calcular: (atual: StacksFile) => ResultadoOperacao): Promise<Stack> =>
      persistir((atual) => {
        const { dados: proximo, stack } = calcular(atual)
        return {
          dados: proximo,
          // Prefere a versão devolvida pelo adapter (fonte da verdade).
          resultado: (salvo) => salvo.stacks.find((s) => s.id === stack.id) ?? stack,
        }
      }, 'usuario'),
    [persistir],
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

  const substituirTudo = useCallback(
    (arquivo: StacksFile): Promise<StacksFile> =>
      persistir(() => {
        // Defesa em profundidade: nada fora do schema chega ao adapter.
        const validado = parseStacksFile(arquivo)
        if (!validado.ok) {
          throw new StorageError('O arquivo importado é inválido.', validado.erros)
        }
        return { dados: validado.dados, resultado: (salvo) => salvo }
      }, 'importacao'),
    [persistir],
  )

  const limparErro = useCallback(() => setErro(null), [])

  const assinarEscritas = useCallback((ouvinte: OuvinteEscrita) => {
    const ouvintes = ouvintesRef.current
    ouvintes.add(ouvinte)
    return () => {
      ouvintes.delete(ouvinte)
    }
  }, [])

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
      substituirTudo,
      limparErro,
      assinarEscritas,
    }),
    [
      dados,
      status,
      erro,
      salvando,
      recarregar,
      adicionar,
      atualizar,
      remover,
      substituirTudo,
      limparErro,
      assinarEscritas,
    ],
  )

  return <StacksContext.Provider value={valor}>{children}</StacksContext.Provider>
}
