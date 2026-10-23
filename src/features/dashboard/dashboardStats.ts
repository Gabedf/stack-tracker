/**
 * Estatísticas do dashboard. Funções puras, sem React.
 *
 * Tudo parte da nota calculada (com decaimento) de cada stack. Listas vazias
 * resultam em zeros, nunca em NaN.
 */

import { NIVEIS, nivelDaNota, type Nivel } from '../../domain/levels'
import { detalharNota, seiPorSaber } from '../../domain/scoring'
import type { Nota, Stack } from '../../domain/types'
import { temPraticaReal } from '../stacks/stackFiltering'

export interface OpcoesDashboard {
  /** Data de referência para o decaimento das notas. Padrão: agora. */
  hoje?: Date
}

export interface StackComNota {
  stack: Stack
  nota: Nota
}

export interface StackEsfriando extends StackComNota {
  /** Nota sem o decaimento (1 casa). */
  notaBase: Nota
  /** Fração perdida por falta de uso (0-1). */
  perda: number
  /** Meses (fracionários) desde o último uso. */
  mesesSemUso: number
}

export interface QuantidadePorNivel {
  nivel: Nivel
  quantidade: number
}

export interface ResumoDashboard {
  total: number
  /** Média das notas, com 1 casa decimal (0 sem stacks). */
  notaMedia: Nota
  /** Nível correspondente à nota média. */
  nivelGeral: Nivel
  /** Todas as faixas de NIVEIS, em ordem crescente, inclusive as vazias. */
  distribuicaoPorNivel: QuantidadePorNivel[]
  seiPorSaber: number
  /** Stacks com experiência em projeto pessoal ou produção. */
  praticaReal: number
  evidencias: number
  /** Até 3 stacks de maior nota (empate: nome A–Z). */
  top: StackComNota[]
  /** Stacks que perdem nota por falta de uso, da maior perda para a menor. */
  esfriando: StackEsfriando[]
}

export interface EstatisticaCategoria {
  categoria: string
  quantidade: number
  /** Médias com 1 casa decimal. */
  notaMedia: Nota
  teoria: Nota
  pratica: Nota
  profundidade: Nota
}

export const TAMANHO_TOP = 3

const COLLATOR = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true })

function arredondar1(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 10) / 10
}

/** Média com 1 casa; lista vazia -> 0. */
function media(valores: readonly number[]): number {
  if (valores.length === 0) return 0
  return arredondar1(valores.reduce((a, b) => a + b, 0) / valores.length)
}

function porNome(a: Stack, b: Stack): number {
  return COLLATOR.compare(a.nome, b.nome) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
}

export function calcularResumo(
  stacks: readonly Stack[],
  { hoje = new Date() }: OpcoesDashboard = {},
): ResumoDashboard {
  const detalhes = stacks.map((stack) => ({ stack, detalhe: detalharNota(stack, { hoje }) }))
  const notas = detalhes.map(({ detalhe }) => detalhe.nota)
  const notaMedia = media(notas)

  const distribuicaoPorNivel = NIVEIS.map((nivel) => ({
    nivel,
    quantidade: notas.filter((n) => nivelDaNota(n).id === nivel.id).length,
  }))

  const top = detalhes
    .map(({ stack, detalhe }) => ({ stack, nota: detalhe.nota }))
    .sort((a, b) => b.nota - a.nota || porNome(a.stack, b.stack))
    .slice(0, TAMANHO_TOP)

  const esfriando = detalhes
    .filter(({ detalhe }) => detalhe.fatorDecaimento < 1)
    .map(({ stack, detalhe }) => ({
      stack,
      nota: detalhe.nota,
      notaBase: arredondar1(detalhe.notaBase),
      perda: 1 - detalhe.fatorDecaimento,
      mesesSemUso: detalhe.mesesSemUso,
    }))
    .sort((a, b) => b.perda - a.perda || porNome(a.stack, b.stack))

  return {
    total: stacks.length,
    notaMedia,
    nivelGeral: nivelDaNota(notaMedia),
    distribuicaoPorNivel,
    seiPorSaber: stacks.filter((s) => seiPorSaber(s)).length,
    praticaReal: stacks.filter(temPraticaReal).length,
    evidencias: stacks.reduce((total, s) => total + s.evidencias.length, 0),
    top,
    esfriando,
  }
}

/** Estatísticas por categoria, em ordem alfabética (pt-BR). */
export function estatisticasPorCategoria(
  stacks: readonly Stack[],
  { hoje = new Date() }: OpcoesDashboard = {},
): EstatisticaCategoria[] {
  const grupos = new Map<string, Stack[]>()
  for (const stack of stacks) {
    const grupo = grupos.get(stack.categoria)
    if (grupo) grupo.push(stack)
    else grupos.set(stack.categoria, [stack])
  }

  return [...grupos.entries()]
    .sort(([a], [b]) => COLLATOR.compare(a, b))
    .map(([categoria, doGrupo]) => ({
      categoria,
      quantidade: doGrupo.length,
      notaMedia: media(doGrupo.map((s) => detalharNota(s, { hoje }).nota)),
      teoria: media(doGrupo.map((s) => s.dimensoes.teoria)),
      pratica: media(doGrupo.map((s) => s.dimensoes.pratica)),
      profundidade: media(doGrupo.map((s) => s.dimensoes.profundidade)),
    }))
}
