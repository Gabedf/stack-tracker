/**
 * Dados do gráfico de evolução: transforma o histórico de uma stack numa série
 * ordenada por data. Funções puras, sem React nem Recharts.
 */

import { formatarData, formatarNota } from '../../components/formatacao'
import { nivelDaNota } from '../../domain/levels'
import type { DataISO, Nota, RegistroHistorico } from '../../domain/types'

/** Séries secundárias (dimensões) que podem ser ligadas no gráfico. */
export const DIMENSOES_SERIE = ['teoria', 'pratica', 'profundidade'] as const
export type DimensaoSerie = (typeof DIMENSOES_SERIE)[number]

export const ROTULO_DIMENSAO: Record<DimensaoSerie, string> = {
  teoria: 'Teoria',
  pratica: 'Prática',
  profundidade: 'Profundidade',
}

/** Um ponto do gráfico (um snapshot do histórico). */
export interface PontoEvolucao {
  data: DataISO
  /** Instante (ms, UTC) da data, usado como posição no eixo X. */
  tempo: number
  nota: Nota
  nivel: string
  teoria: Nota
  pratica: Nota
  profundidade: Nota
}

const UM_DIA_MS = 24 * 60 * 60 * 1000

/** Instante UTC de uma data ISO "YYYY-MM-DD" (sem depender do fuso local). */
export function tempoDaData(data: DataISO): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(data)
  if (!m) return Number.NaN
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

/**
 * Série do gráfico em ordem cronológica crescente. Snapshots da mesma data
 * mantêm a ordem em que foram registrados (ordenação estável). Snapshots com
 * data inválida são descartados. Não muta o histórico de entrada.
 */
export function serieEvolucao(historico: readonly RegistroHistorico[]): PontoEvolucao[] {
  return historico
    .map((registro) => ({ registro, tempo: tempoDaData(registro.data) }))
    .filter(({ tempo }) => !Number.isNaN(tempo))
    .sort((a, b) => a.tempo - b.tempo)
    .map(({ registro, tempo }) => ({
      data: registro.data,
      tempo,
      nota: registro.nota,
      nivel: nivelDaNota(registro.nota).nome,
      teoria: registro.dimensoes.teoria,
      pratica: registro.dimensoes.pratica,
      profundidade: registro.dimensoes.profundidade,
    }))
}

/**
 * Domínio do eixo X (ms). Com um único instante, abre um dia para cada lado
 * para o ponto ficar no meio do gráfico em vez de colado na borda.
 */
export function dominioTempo(pontos: readonly PontoEvolucao[]): [number, number] {
  if (pontos.length === 0) return [0, 0]
  const inicio = pontos[0].tempo
  const fim = pontos[pontos.length - 1].tempo
  return inicio === fim ? [inicio - UM_DIA_MS, fim + UM_DIA_MS] : [inicio, fim]
}

/** Resumo textual da evolução, usado como rótulo acessível do gráfico. */
export function resumoEvolucao(pontos: readonly PontoEvolucao[]): string {
  if (pontos.length === 0) return 'Sem histórico de evolução.'
  const primeiro = pontos[0]
  const ultimo = pontos[pontos.length - 1]
  if (pontos.length === 1) {
    return `Nota ${formatarNota(primeiro.nota)} em ${formatarData(primeiro.data)} (único registro).`
  }
  return (
    `Nota foi de ${formatarNota(primeiro.nota)} em ${formatarData(primeiro.data)} ` +
    `para ${formatarNota(ultimo.nota)} em ${formatarData(ultimo.data)} ` +
    `(${pontos.length} registros).`
  )
}
