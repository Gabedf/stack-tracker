/**
 * Lógica pura do gráfico por categoria (radar ou barras). Sem React.
 */

import { NOTA_MAXIMA, NOTA_MINIMA } from '../../domain/levels'
import { formatarNota } from '../formatacao'

export interface ItemCategoria {
  categoria: string
  /** Valor de 0 a 10 (fora disso é limitado à escala). */
  valor: number
  /** Quantidade de itens na categoria (opcional; aparece no tooltip e na tabela). */
  quantidade?: number
}

export type FormaGraficoCategorias = 'radar' | 'barras'

/**
 * Faixa em que o radar funciona. Com 1-2 categorias não existe polígono (vira
 * um ponto ou uma reta) e acima de 8 os rótulos se atropelam e a área do
 * polígono fica difícil de comparar: nesses casos, barras horizontais.
 */
export const MIN_CATEGORIAS_RADAR = 3
export const MAX_CATEGORIAS_RADAR = 8

export function formaGraficoCategorias(quantidade: number): FormaGraficoCategorias {
  return quantidade >= MIN_CATEGORIAS_RADAR && quantidade <= MAX_CATEGORIAS_RADAR
    ? 'radar'
    : 'barras'
}

/** Valor limitado à escala fixa 0-10 (NaN vira 0). */
export function valorNaEscala(valor: number): number {
  if (Number.isNaN(valor)) return NOTA_MINIMA
  return Math.min(NOTA_MAXIMA, Math.max(NOTA_MINIMA, valor))
}

/**
 * Resumo textual para o aria-label. Ex.:
 * "Nota média por categoria, de 0 a 10: Backend 5,5; Dados 2,6. Maior: Backend (5,5); menor: Dados (2,6)."
 */
export function resumoCategorias(itens: readonly ItemCategoria[], rotuloValor: string): string {
  if (itens.length === 0) return `${rotuloValor} por categoria: nenhuma categoria.`

  const valores = itens.map((i) => ({ ...i, valor: valorNaEscala(i.valor) }))
  const lista = valores.map((i) => `${i.categoria} ${formatarNota(i.valor)}`).join('; ')
  const base = `${rotuloValor} por categoria, de 0 a 10: ${lista}.`
  if (valores.length < 2) return base

  // Empate: fica a primeira na ordem recebida.
  const maior = valores.reduce((a, b) => (b.valor > a.valor ? b : a))
  const menor = valores.reduce((a, b) => (b.valor < a.valor ? b : a))
  if (maior.valor === menor.valor) return `${base} Todas com o mesmo valor.`
  return (
    `${base} Maior: ${maior.categoria} (${formatarNota(maior.valor)}); ` +
    `menor: ${menor.categoria} (${formatarNota(menor.valor)}).`
  )
}
