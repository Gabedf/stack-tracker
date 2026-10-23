/**
 * Ficha do personagem (tema RPG). Funções puras, sem React.
 *
 * XP de uma stack = round(nota × XP_POR_PONTO_DE_NOTA). XP total = soma das stacks.
 * Nível numérico = floor(sqrt(xp / XP_BASE_NIVEL)), no mínimo 1 quando há stacks.
 * Ou seja, o nível n começa em XP_BASE_NIVEL × n² XP (1: 100, 2: 400, 3: 900...).
 */

import { nivelDaNota, type Nivel } from '../../domain/levels'
import { calcularNota } from '../../domain/scoring'
import type { Nota, Stack } from '../../domain/types'
import {
  calcularResumo,
  estatisticasPorCategoria,
  type EstatisticaCategoria,
  type OpcoesDashboard,
} from '../dashboard/dashboardStats'
import { CLASSE_RECRUTA, classeMulticlasse, nomeDaClasse } from './classes'

/** XP ganho por ponto de nota (nota 7,4 -> 740 XP). */
export const XP_POR_PONTO_DE_NOTA = 100
/** Divisor da fórmula de nível: nivel = floor(sqrt(xp / XP_BASE_NIVEL)). */
export const XP_BASE_NIVEL = 100
/** Nível mínimo de quem tem ao menos uma stack. */
export const NIVEL_MINIMO_COM_STACKS = 1
/** Diferença relativa máxima entre as duas maiores somas para virar multiclasse. */
export const MARGEM_MULTICLASSE = 0.1

const EPSILON = 1e-9
const COLLATOR = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true })

export interface ProgressoXp {
  xp: number
  nivel: number
  /** XP em que o nível atual começa. */
  xpDoNivelAtual: number
  /** XP em que o próximo nível começa. */
  xpProximoNivel: number
  /** Progresso (0-1) dentro do nível atual. */
  progresso: number
  /** XP que falta para o próximo nível. */
  faltam: number
}

export type TipoClasse = 'recruta' | 'pura' | 'multiclasse'

export interface ClassePersonagem {
  tipo: TipoClasse
  nome: string
  /** Categorias que definem a classe (0, 1 ou 2), da maior soma para a menor. */
  categorias: string[]
}

export interface HabilidadeCategoria extends EstatisticaCategoria, ProgressoXp {
  /** Soma das notas da categoria (1 casa). */
  somaNotas: Nota
}

export interface Personagem {
  classe: ClassePersonagem
  /** Título pela média das notas (Iniciante…Mestre). */
  titulo: Nivel
  notaMedia: Nota
  progresso: ProgressoXp
  totais: { stacks: number; evidencias: number; seiPorSaber: number }
  /** Por categoria, do maior XP para o menor (empate: nome A–Z). */
  habilidades: HabilidadeCategoria[]
}

function arredondar1(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 10) / 10
}

/** XP de uma nota. */
export function xpDaNota(nota: Nota): number {
  return Math.max(0, Math.round(nota * XP_POR_PONTO_DE_NOTA))
}

/** Nível pela fórmula pura (0 para xp < XP_BASE_NIVEL). */
export function nivelDoXp(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / XP_BASE_NIVEL))
}

/** XP em que o nível começa pela fórmula: XP_BASE_NIVEL × nivel². */
export function xpParaNivel(nivel: number): number {
  return XP_BASE_NIVEL * nivel * nivel
}

/**
 * Nível e progresso para um total de XP. Com `nivelMinimo`, o nível nunca fica
 * abaixo dele; nesse caso o nível "elevado" começa em 0 XP.
 */
export function progressoDoXp(xp: number, nivelMinimo = 0): ProgressoXp {
  const total = Math.max(0, xp)
  const pelaFormula = nivelDoXp(total)
  const nivel = Math.max(pelaFormula, nivelMinimo)
  const xpDoNivelAtual = pelaFormula < nivelMinimo ? 0 : xpParaNivel(nivel)
  const xpProximoNivel = xpParaNivel(nivel + 1)
  const faixa = xpProximoNivel - xpDoNivelAtual
  return {
    xp: total,
    nivel,
    xpDoNivelAtual,
    xpProximoNivel,
    progresso: Math.min(1, Math.max(0, (total - xpDoNivelAtual) / faixa)),
    faltam: xpProximoNivel - total,
  }
}

/**
 * Classe a partir da soma das notas por categoria: a maior define a classe; se a
 * segunda estiver a até MARGEM_MULTICLASSE da primeira, vira multiclasse.
 */
export function classeDoPersonagem(somas: ReadonlyMap<string, number>): ClassePersonagem {
  const ordenadas = [...somas.entries()].sort(([ca, a], [cb, b]) =>
    Math.abs(b - a) > EPSILON ? b - a : COLLATOR.compare(ca, cb),
  )
  if (ordenadas.length === 0) return { tipo: 'recruta', nome: CLASSE_RECRUTA, categorias: [] }

  const [[primeira, maior], segunda] = ordenadas
  if (segunda && maior - segunda[1] <= MARGEM_MULTICLASSE * maior + EPSILON) {
    return {
      tipo: 'multiclasse',
      nome: classeMulticlasse(primeira, segunda[0]),
      categorias: [primeira, segunda[0]],
    }
  }
  return { tipo: 'pura', nome: nomeDaClasse(primeira), categorias: [primeira] }
}

/** Habilidades por categoria: estatísticas + XP e nível (mesma fórmula), por XP decrescente. */
export function habilidadesPorCategoria(
  stacks: readonly Stack[],
  { hoje = new Date() }: OpcoesDashboard = {},
): HabilidadeCategoria[] {
  const notas = new Map<string, number[]>()
  for (const stack of stacks) {
    const nota = calcularNota(stack, { hoje })
    const lista = notas.get(stack.categoria)
    if (lista) lista.push(nota)
    else notas.set(stack.categoria, [nota])
  }

  return estatisticasPorCategoria(stacks, { hoje })
    .map((estatistica) => {
      const doGrupo = notas.get(estatistica.categoria) ?? []
      const xp = doGrupo.reduce((total, n) => total + xpDaNota(n), 0)
      return {
        ...estatistica,
        ...progressoDoXp(xp, NIVEL_MINIMO_COM_STACKS),
        somaNotas: arredondar1(doGrupo.reduce((a, b) => a + b, 0)),
      }
    })
    .sort((a, b) => b.xp - a.xp || COLLATOR.compare(a.categoria, b.categoria))
}

/** Ficha completa do personagem. */
export function calcularPersonagem(
  stacks: readonly Stack[],
  { hoje = new Date() }: OpcoesDashboard = {},
): Personagem {
  const resumo = calcularResumo(stacks, { hoje })
  const habilidades = habilidadesPorCategoria(stacks, { hoje })
  const xp = habilidades.reduce((total, h) => total + h.xp, 0)

  return {
    classe: classeDoPersonagem(new Map(habilidades.map((h) => [h.categoria, h.somaNotas]))),
    titulo: nivelDaNota(resumo.notaMedia),
    notaMedia: resumo.notaMedia,
    progresso: progressoDoXp(xp, stacks.length > 0 ? NIVEL_MINIMO_COM_STACKS : 0),
    totais: {
      stacks: resumo.total,
      evidencias: resumo.evidencias,
      seiPorSaber: resumo.seiPorSaber,
    },
    habilidades,
  }
}
