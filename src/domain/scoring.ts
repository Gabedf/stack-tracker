/**
 * Nota calculada de uma stack (0-10). Funções puras, sem React.
 *
 * nota = média ponderada (prática, profundidade, teoria, evidências)
 *        × fator de decaimento por recência (a partir de dimensoes.ultimoUso),
 *        limitada a 0-10 e arredondada a 1 casa decimal.
 */

import { NOTA_MAXIMA, NOTA_MINIMA } from './levels'
import type { DataISO, Nota, Stack, TipoEvidencia } from './types'

export type ComponenteNota = 'pratica' | 'profundidade' | 'teoria' | 'evidencias'

export const COMPONENTES_NOTA: readonly ComponenteNota[] = [
  'pratica',
  'profundidade',
  'teoria',
  'evidencias',
]

export interface ScoringConfig {
  /** Pesos relativos; são normalizados se não somarem 1. */
  pesos: Record<ComponenteNota, number>
  /** Pontos por evidência, por tipo; a soma é limitada a 10. */
  pontosEvidencia: Record<TipoEvidencia, number>
  decaimento: {
    /** Meses sem uso antes de começar a perder nota. */
    carenciaMeses: number
    /** Meses sem uso em que a perda atinge o máximo (e estabiliza). */
    mesesPerdaMaxima: number
    /** Fração máxima perdida (0-1). */
    perdaMaxima: number
  }
  seiPorSaber: {
    /** Teoria mínima (inclusiva). */
    teoriaMinima: Nota
    /** Prática máxima (inclusiva). */
    praticaMaxima: Nota
  }
}

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  pesos: { pratica: 0.4, profundidade: 0.3, teoria: 0.2, evidencias: 0.1 },
  pontosEvidencia: { emprego: 4, projeto: 3, repo: 2, certificado: 2 },
  decaimento: { carenciaMeses: 6, mesesPerdaMaxima: 36, perdaMaxima: 0.2 },
  seiPorSaber: { teoriaMinima: 7, praticaMaxima: 3 },
}

/** Config parcial: cada seção pode ser sobrescrita campo a campo. */
export interface ScoringConfigParcial {
  pesos?: Partial<ScoringConfig['pesos']>
  pontosEvidencia?: Partial<ScoringConfig['pontosEvidencia']>
  decaimento?: Partial<ScoringConfig['decaimento']>
  seiPorSaber?: Partial<ScoringConfig['seiPorSaber']>
}

export interface OpcoesNota {
  config?: ScoringConfigParcial
  /** Data de referência para o decaimento (default: agora). */
  hoje?: Date
}

export interface ComponenteDetalhado {
  /** Valor do componente (0-10). */
  valor: number
  /** Peso normalizado (0-1). */
  peso: number
  /** valor × peso, antes do decaimento. */
  contribuicao: number
}

export interface DetalheNota {
  componentes: Record<ComponenteNota, ComponenteDetalhado>
  /** Média ponderada antes do decaimento. */
  notaBase: number
  /** Meses desde o último uso (0 se no futuro). */
  mesesSemUso: number
  /** Multiplicador aplicado à nota base (1 = sem perda). */
  fatorDecaimento: number
  /** Nota final: limitada a 0-10 e arredondada a 1 casa. */
  nota: Nota
}

export function resolverConfig(parcial: ScoringConfigParcial = {}): ScoringConfig {
  const d = DEFAULT_SCORING_CONFIG
  return {
    pesos: { ...d.pesos, ...parcial.pesos },
    pontosEvidencia: { ...d.pontosEvidencia, ...parcial.pontosEvidencia },
    decaimento: { ...d.decaimento, ...parcial.decaimento },
    seiPorSaber: { ...d.seiPorSaber, ...parcial.seiPorSaber },
  }
}

function clamp(valor: number, min = NOTA_MINIMA, max = NOTA_MAXIMA): number {
  if (Number.isNaN(valor)) return min
  return Math.min(max, Math.max(min, valor))
}

function arredondar1(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 10) / 10
}

/** Pesos normalizados para somar 1. Lança erro se algum for negativo ou a soma for 0. */
export function normalizarPesos(pesos: ScoringConfig['pesos']): ScoringConfig['pesos'] {
  const valores = COMPONENTES_NOTA.map((c) => pesos[c])
  if (valores.some((p) => !Number.isFinite(p) || p < 0)) {
    throw new RangeError('Pesos da nota devem ser números >= 0')
  }
  const soma = valores.reduce((a, b) => a + b, 0)
  if (soma === 0) throw new RangeError('A soma dos pesos da nota deve ser maior que 0')
  // Evita ruído de ponto flutuante (0.4+0.3+0.2+0.1 = 0.9999999999999999).
  if (Math.abs(soma - 1) < 1e-9) return { ...pesos }
  return {
    pratica: pesos.pratica / soma,
    profundidade: pesos.profundidade / soma,
    teoria: pesos.teoria / soma,
    evidencias: pesos.evidencias / soma,
  }
}

/** Componente de evidências (0-10): soma dos pontos por tipo, limitada a 10. */
export function pontuarEvidencias(
  evidencias: Stack['evidencias'],
  pontos: ScoringConfig['pontosEvidencia'] = DEFAULT_SCORING_CONFIG.pontosEvidencia,
): number {
  const soma = evidencias.reduce((total, ev) => total + (pontos[ev.tipo] ?? 0), 0)
  return clamp(soma)
}

/**
 * Meses (fracionários) entre `data` (YYYY-MM-DD) e `hoje`, por calendário.
 * Retorna 0 se a data estiver no futuro ou for inválida.
 */
export function mesesDesde(data: DataISO, hoje: Date): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(data)
  if (!m) return 0
  const [ano, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const meses =
    (hoje.getFullYear() - ano) * 12 + (hoje.getMonth() + 1 - mes) + (hoje.getDate() - dia) / 30
  return Math.max(0, meses)
}

/** Fator multiplicativo (1 - perda) para os meses sem uso informados. */
export function fatorDecaimento(
  mesesSemUso: number,
  decaimento: ScoringConfig['decaimento'] = DEFAULT_SCORING_CONFIG.decaimento,
): number {
  const { carenciaMeses, mesesPerdaMaxima, perdaMaxima } = decaimento
  const perdaMax = clamp(perdaMaxima, 0, 1)
  if (mesesSemUso <= carenciaMeses) return 1
  if (mesesSemUso >= mesesPerdaMaxima) return 1 - perdaMax
  const fracao = (mesesSemUso - carenciaMeses) / (mesesPerdaMaxima - carenciaMeses)
  return 1 - perdaMax * fracao
}

/** Cálculo completo, com a contribuição de cada componente (útil para a UI). */
export function detalharNota(stack: Stack, opcoes: OpcoesNota = {}): DetalheNota {
  const config = resolverConfig(opcoes.config)
  const hoje = opcoes.hoje ?? new Date()
  const pesos = normalizarPesos(config.pesos)

  const valores: Record<ComponenteNota, number> = {
    pratica: clamp(stack.dimensoes.pratica),
    profundidade: clamp(stack.dimensoes.profundidade),
    teoria: clamp(stack.dimensoes.teoria),
    evidencias: pontuarEvidencias(stack.evidencias, config.pontosEvidencia),
  }

  const componentes = {} as Record<ComponenteNota, ComponenteDetalhado>
  let notaBase = 0
  for (const c of COMPONENTES_NOTA) {
    const contribuicao = valores[c] * pesos[c]
    componentes[c] = { valor: valores[c], peso: pesos[c], contribuicao }
    notaBase += contribuicao
  }

  const mesesSemUso = mesesDesde(stack.dimensoes.ultimoUso, hoje)
  const fator = fatorDecaimento(mesesSemUso, config.decaimento)

  return {
    componentes,
    notaBase,
    mesesSemUso,
    fatorDecaimento: fator,
    nota: arredondar1(clamp(notaBase * fator)),
  }
}

/** Nota final da stack (0-10, 1 casa decimal). */
export function calcularNota(stack: Stack, opcoes?: OpcoesNota): Nota {
  return detalharNota(stack, opcoes).nota
}

/** "Sei por saber": teoria alta e prática baixa (limiares inclusivos). */
export function seiPorSaber(stack: Stack, config?: ScoringConfigParcial): boolean {
  const { teoriaMinima, praticaMaxima } = resolverConfig(config).seiPorSaber
  return stack.dimensoes.teoria >= teoriaMinima && stack.dimensoes.pratica <= praticaMaxima
}
