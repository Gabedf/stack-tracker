/**
 * Histórico de evolução de uma stack. Funções puras e imutáveis, sem React.
 *
 * Um snapshot registra data, dimensões e nota calculada num momento do tempo.
 * Só é gravado quando algo muda em relação ao último snapshot.
 */

import { calcularNota, type OpcoesNota } from './scoring'
import type { DataISO, Dimensoes, RegistroHistorico, Stack } from './types'

/** Data local no formato ISO "YYYY-MM-DD" (mesmo referencial de `mesesDesde`). */
export function paraDataISO(data: Date): DataISO {
  const ano = String(data.getFullYear()).padStart(4, '0')
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

/** Snapshot do estado atual da stack (dimensões copiadas, nota recalculada). */
export function criarSnapshot(stack: Stack, opcoes: OpcoesNota = {}): RegistroHistorico {
  const hoje = opcoes.hoje ?? new Date()
  return {
    data: paraDataISO(hoje),
    dimensoes: { ...stack.dimensoes },
    nota: calcularNota(stack, { ...opcoes, hoje }),
  }
}

function dimensoesIguais(a: Dimensoes, b: Dimensoes): boolean {
  return (
    a.teoria === b.teoria &&
    a.pratica === b.pratica &&
    a.profundidade === b.profundidade &&
    a.ultimoUso === b.ultimoUso
  )
}

/** true se nota e dimensões do snapshot são iguais às do registro anterior. */
export function snapshotIgual(a: RegistroHistorico, b: RegistroHistorico): boolean {
  return a.nota === b.nota && dimensoesIguais(a.dimensoes, b.dimensoes)
}

/**
 * Registra um snapshot no fim do histórico se nota ou dimensões mudaram em
 * relação ao último snapshot. Sem mudança, devolve a MESMA referência.
 * Nunca muta a stack de entrada.
 */
export function registrarSnapshot(stack: Stack, opcoes: OpcoesNota = {}): Stack {
  const novo = criarSnapshot(stack, opcoes)
  const historico = stack.historico
  const ultimo = historico[historico.length - 1] as RegistroHistorico | undefined

  if (!ultimo) return { ...stack, historico: [novo] }
  if (snapshotIgual(ultimo, novo)) return stack

  // Decisão: um ponto por dia. Se o último snapshot é de hoje, ele é
  // substituído (vale o estado mais recente do dia), evitando vários pontos
  // na mesma data no gráfico de evolução. O histórico é sempre anexado em
  // ordem cronológica, então basta olhar o último registro.
  if (ultimo.data === novo.data) {
    return { ...stack, historico: [...historico.slice(0, -1), novo] }
  }
  return { ...stack, historico: [...historico, novo] }
}
