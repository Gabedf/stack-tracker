import { describe, expect, it } from 'vitest'
import type { RegistroHistorico } from '../../domain/types'
import { dominioTempo, resumoEvolucao, serieEvolucao, tempoDaData } from './evolutionData'

function registro(data: string, nota: number, teoria = 5, pratica = 4, profundidade = 3) {
  return {
    data,
    nota,
    dimensoes: { teoria, pratica, profundidade, ultimoUso: data },
  } satisfies RegistroHistorico
}

describe('tempoDaData', () => {
  it('converte a data ISO em instante UTC, sem depender do fuso', () => {
    expect(tempoDaData('2026-03-15')).toBe(Date.UTC(2026, 2, 15))
  })

  it('devolve NaN para data inválida', () => {
    expect(tempoDaData('15/03/2026')).toBeNaN()
  })
})

describe('serieEvolucao', () => {
  it('devolve série vazia para histórico vazio', () => {
    expect(serieEvolucao([])).toEqual([])
  })

  it('ordena por data crescente sem mutar a entrada', () => {
    const historico = [
      registro('2026-05-01', 7),
      registro('2025-01-10', 3),
      registro('2025-09-20', 5),
    ]
    const copia = structuredClone(historico)

    const serie = serieEvolucao(historico)

    expect(serie.map((p) => p.data)).toEqual(['2025-01-10', '2025-09-20', '2026-05-01'])
    expect(historico).toEqual(copia)
  })

  it('mantém a ordem de registro entre snapshots da mesma data', () => {
    const serie = serieEvolucao([
      registro('2026-02-01', 4),
      registro('2026-01-01', 2),
      registro('2026-02-01', 5),
    ])
    expect(serie.map((p) => p.nota)).toEqual([2, 4, 5])
  })

  it('mapeia nota, nível, dimensões e instante de cada snapshot', () => {
    const [ponto] = serieEvolucao([registro('2026-04-02', 6.5, 8, 6, 5)])
    expect(ponto).toEqual({
      data: '2026-04-02',
      tempo: Date.UTC(2026, 3, 2),
      nota: 6.5,
      nivel: 'Sênior',
      teoria: 8,
      pratica: 6,
      profundidade: 5,
    })
  })

  it('descarta snapshots com data inválida', () => {
    const serie = serieEvolucao([registro('data ruim', 1), registro('2026-01-01', 2)])
    expect(serie).toHaveLength(1)
    expect(serie[0].data).toBe('2026-01-01')
  })
})

describe('dominioTempo', () => {
  it('vai do primeiro ao último instante', () => {
    const serie = serieEvolucao([registro('2026-03-01', 5), registro('2026-01-01', 2)])
    expect(dominioTempo(serie)).toEqual([Date.UTC(2026, 0, 1), Date.UTC(2026, 2, 1)])
  })

  it('abre um dia para cada lado quando há um único instante', () => {
    const t = Date.UTC(2026, 0, 1)
    const dia = 24 * 60 * 60 * 1000
    expect(dominioTempo(serieEvolucao([registro('2026-01-01', 5)]))).toEqual([t - dia, t + dia])
  })
})

describe('resumoEvolucao', () => {
  it('descreve a variação do primeiro ao último registro', () => {
    const serie = serieEvolucao([
      registro('2026-06-30', 7.25),
      registro('2025-01-05', 3),
      registro('2025-08-01', 5),
    ])
    expect(resumoEvolucao(serie)).toBe(
      'Nota foi de 3,0 em 05/01/2025 para 7,3 em 30/06/2026 (3 registros).',
    )
  })

  it('descreve o registro único', () => {
    expect(resumoEvolucao(serieEvolucao([registro('2026-01-01', 4)]))).toBe(
      'Nota 4,0 em 01/01/2026 (único registro).',
    )
  })

  it('trata histórico vazio', () => {
    expect(resumoEvolucao([])).toBe('Sem histórico de evolução.')
  })
})
