/**
 * Exportação para currículo. Funções puras, sem React.
 *
 * `selecionarParaCurriculo` aplica os filtros e agrupa por categoria; as
 * stacks deixadas de fora vêm com o motivo, para a UI explicar o filtro.
 */

import { NIVEIS, nivelDaNota, type Nivel } from '../../domain/levels'
import { calcularNota, seiPorSaber } from '../../domain/scoring'
import type { Nota, Stack } from '../../domain/types'
import { temPraticaReal } from '../stacks/stackFiltering'
import { resolverOpcoesCurriculo, type OpcoesCurriculo } from './resumeOptions'

export interface OpcoesCalculoCurriculo {
  /** Data de referência para o decaimento das notas. Padrão: agora. */
  hoje?: Date
}

export interface StackCurriculo {
  stack: Stack
  nota: Nota
  nivel: Nivel
}

export interface GrupoCurriculo {
  categoria: string
  /** Nota desc; empate: nome A–Z. */
  stacks: StackCurriculo[]
}

/** Motivos de exclusão, na ordem em que são verificados. */
export const MOTIVOS_EXCLUSAO = ['categoria', 'nivel', 'sei_por_saber', 'sem_comprovacao'] as const
export type MotivoExclusao = (typeof MOTIVOS_EXCLUSAO)[number]

export const ROTULO_MOTIVO_EXCLUSAO: Record<MotivoExclusao, string> = {
  categoria: 'Categoria fora do filtro',
  nivel: 'Nível abaixo do mínimo',
  sei_por_saber: 'Sei por saber: teoria alta, pouca prática',
  sem_comprovacao: 'Sem evidência nem prática real',
}

export interface StackExcluida extends StackCurriculo {
  motivo: MotivoExclusao
}

export interface SelecaoCurriculo {
  /** Grupos não vazios, por categoria em ordem alfabética (pt-BR). */
  grupos: GrupoCurriculo[]
  /** Stacks "sei por saber" incluídas na seção separada (nota desc). */
  conhecimentoTeorico: StackCurriculo[]
  /** Stacks deixadas de fora, na ordem recebida, com o primeiro motivo que as excluiu. */
  excluidas: StackExcluida[]
}

const COLLATOR = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true })

/** Tem evidência registrada ou experiência em projeto pessoal/produção. */
export function temComprovacao(stack: Stack): boolean {
  return stack.evidencias.length > 0 || temPraticaReal(stack)
}

function compararItens(a: StackCurriculo, b: StackCurriculo): number {
  return (
    b.nota - a.nota ||
    COLLATOR.compare(a.stack.nome, b.stack.nome) ||
    (a.stack.id < b.stack.id ? -1 : a.stack.id > b.stack.id ? 1 : 0)
  )
}

type Destino = 'principal' | 'teorico' | MotivoExclusao

function classificar(item: StackCurriculo, o: OpcoesCurriculo, notaMinima: Nota): Destino {
  const { stack } = item
  if (o.categorias !== null && !o.categorias.includes(stack.categoria)) return 'categoria'
  if (item.nota < notaMinima) return 'nivel'
  if (seiPorSaber(stack)) {
    return o.incluirSeiPorSaber && !o.somenteComprovado ? 'teorico' : 'sei_por_saber'
  }
  if (o.somenteComprovado && !temComprovacao(stack)) return 'sem_comprovacao'
  return 'principal'
}

/** Filtra, agrupa por categoria e ordena. Não altera o array recebido. */
export function selecionarParaCurriculo(
  stacks: readonly Stack[],
  opcoes: Partial<OpcoesCurriculo> = {},
  { hoje = new Date() }: OpcoesCalculoCurriculo = {},
): SelecaoCurriculo {
  const o = resolverOpcoesCurriculo(opcoes)
  const notaMinima = NIVEIS.find((n) => n.id === o.nivelMinimo)?.min ?? 0

  const porCategoria = new Map<string, StackCurriculo[]>()
  const conhecimentoTeorico: StackCurriculo[] = []
  const excluidas: StackExcluida[] = []

  for (const stack of stacks) {
    const nota = calcularNota(stack, { hoje })
    const item: StackCurriculo = { stack, nota, nivel: nivelDaNota(nota) }
    const destino = classificar(item, o, notaMinima)
    if (destino === 'principal') {
      const grupo = porCategoria.get(stack.categoria) ?? []
      grupo.push(item)
      porCategoria.set(stack.categoria, grupo)
    } else if (destino === 'teorico') {
      conhecimentoTeorico.push(item)
    } else {
      excluidas.push({ ...item, motivo: destino })
    }
  }

  const grupos = [...porCategoria]
    .sort(([a], [b]) => COLLATOR.compare(a, b))
    .map(([categoria, itens]) => ({ categoria, stacks: itens.sort(compararItens) }))

  return { grupos, conhecimentoTeorico: conhecimentoTeorico.sort(compararItens), excluidas }
}
