import { describe, expect, it } from 'vitest'
import type { Stack } from '../../domain/types'
import { HOJE_SEED, stackDoSeed, stacksDoSeed } from '../../test/seed'
import { calcularResumo, estatisticasPorCategoria } from './dashboardStats'

/*
 * Valores esperados calculados à mão a partir de data/seed.json, com hoje = 23/10/2026.
 * Pesos: prática 0,4 · profundidade 0,3 · teoria 0,2 · evidências 0,1.
 * Evidências: emprego 4, projeto 3, repo 2, certificado 2 (máx. 10).
 *
 *   react       8×.4 + 8×.3 + 9×.2 + 10×.1 = 8,4  (uso há < 1 mês)        -> 8,4 Mestre
 *   nodejs      6×.4 + 5×.3 + 7×.2 +  2×.1 = 5,5  (uso há ~4,7 meses)     -> 5,5 Praticante
 *   kubernetes  2×.4 + 4×.3 + 8×.2 +  2×.1 = 3,8  (uso há ~1 mês)         -> 3,8 Aprendiz
 *   jquery      7×.4 + 5×.3 + 7×.2 +  4×.1 = 6,1  (uso há ~56 meses: ×0,8) -> 4,9 Praticante
 *   postgresql  3×.4 + 2×.3 + 4×.2 +  0    = 2,6  (uso há < 1 mês)        -> 2,6 Aprendiz
 *
 *   média = (8,4 + 5,5 + 3,8 + 4,9 + 2,6) / 5 = 25,2 / 5 = 5,04 -> 5,0 (Praticante)
 */

const hoje = HOJE_SEED

function ids(lista: { stack: Stack }[]): string[] {
  return lista.map((item) => item.stack.id)
}

describe('calcularResumo com o seed', () => {
  const resumo = calcularResumo(stacksDoSeed(), { hoje })

  it('conta o total de stacks', () => {
    expect(resumo.total).toBe(5)
  })

  it('calcula a nota média com 1 casa e o nível geral', () => {
    expect(resumo.notaMedia).toBe(5)
    expect(resumo.nivelGeral.id).toBe('praticante')
  })

  it('distribui as stacks pelas 5 faixas de nível, inclusive as vazias', () => {
    expect(
      resumo.distribuicaoPorNivel.map(({ nivel, quantidade }) => [nivel.id, quantidade]),
    ).toEqual([
      ['iniciante', 0],
      ['aprendiz', 2],
      ['praticante', 2],
      ['senior', 0],
      ['mestre', 1],
    ])
  })

  it('conta "sei por saber" (teoria >= 7 e prática <= 3): só kubernetes', () => {
    expect(resumo.seiPorSaber).toBe(1)
  })

  it('conta prática real (projeto pessoal ou produção): react, nodejs e jquery', () => {
    expect(resumo.praticaReal).toBe(3)
  })

  it('soma as evidências: 4 + 1 + 1 + 1 + 0', () => {
    expect(resumo.evidencias).toBe(7)
  })

  it('lista o top 3 por nota', () => {
    expect(ids(resumo.top)).toEqual(['react', 'nodejs', 'jquery'])
    expect(resumo.top.map((t) => t.nota)).toEqual([8.4, 5.5, 4.9])
  })

  it('lista só as stacks com decaimento: jquery perde 20%', () => {
    expect(ids(resumo.esfriando)).toEqual(['jquery'])
    const [jquery] = resumo.esfriando
    expect(jquery.nota).toBe(4.9)
    expect(jquery.notaBase).toBe(6.1)
    expect(jquery.perda).toBeCloseTo(0.2)
    expect(jquery.mesesSemUso).toBeGreaterThan(36)
  })
})

describe('calcularResumo em casos limite', () => {
  it('sem stacks devolve zeros, sem NaN', () => {
    const resumo = calcularResumo([], { hoje })
    expect(resumo).toMatchObject({
      total: 0,
      notaMedia: 0,
      seiPorSaber: 0,
      praticaReal: 0,
      evidencias: 0,
      top: [],
      esfriando: [],
    })
    expect(resumo.nivelGeral.id).toBe('iniciante')
    expect(resumo.distribuicaoPorNivel).toHaveLength(5)
    expect(resumo.distribuicaoPorNivel.every((d) => d.quantidade === 0)).toBe(true)
  })

  it('com uma stack só, a média é a própria nota', () => {
    const resumo = calcularResumo([stackDoSeed('kubernetes')], { hoje })
    expect(resumo.total).toBe(1)
    expect(resumo.notaMedia).toBe(3.8)
    expect(resumo.nivelGeral.id).toBe('aprendiz')
    expect(resumo.seiPorSaber).toBe(1)
    expect(resumo.praticaReal).toBe(0)
    expect(resumo.evidencias).toBe(1)
    expect(ids(resumo.top)).toEqual(['kubernetes'])
    expect(resumo.esfriando).toEqual([])
  })

  it('desempata o top 3 pelo nome', () => {
    const base = stackDoSeed('postgresql')
    const copia = (id: string, nome: string): Stack => ({ ...base, id, nome })
    const resumo = calcularResumo([copia('c', 'Gama'), copia('a', 'Alfa'), copia('b', 'Beta')], {
      hoje,
    })
    expect(ids(resumo.top)).toEqual(['a', 'b', 'c'])
  })

  it('ordena as que esfriam pela maior perda', () => {
    const base = stackDoSeed('nodejs')
    const comUso = (id: string, ultimoUso: string): Stack => ({
      ...base,
      id,
      nome: id,
      dimensoes: { ...base.dimensoes, ultimoUso },
    })
    const resumo = calcularResumo(
      [
        comUso('pouca', '2025-10-23'),
        comUso('nenhuma', '2026-10-01'),
        comUso('muita', '2024-01-01'),
      ],
      { hoje },
    )
    expect(ids(resumo.esfriando)).toEqual(['muita', 'pouca'])
  })
})

describe('estatisticasPorCategoria', () => {
  it('agrupa o seed por categoria, em ordem alfabética', () => {
    expect(estatisticasPorCategoria(stacksDoSeed(), { hoje })).toEqual([
      // nodejs
      {
        categoria: 'Backend',
        quantidade: 1,
        notaMedia: 5.5,
        teoria: 7,
        pratica: 6,
        profundidade: 5,
      },
      // postgresql
      {
        categoria: 'Dados',
        quantidade: 1,
        notaMedia: 2.6,
        teoria: 4,
        pratica: 3,
        profundidade: 2,
      },
      // kubernetes
      {
        categoria: 'DevOps',
        quantidade: 1,
        notaMedia: 3.8,
        teoria: 8,
        pratica: 2,
        profundidade: 4,
      },
      // react + jquery: nota (8,4 + 4,9) / 2 = 6,65 -> 6,7; teoria (9 + 7) / 2;
      // prática (8 + 7) / 2; profundidade (8 + 5) / 2
      {
        categoria: 'Frontend',
        quantidade: 2,
        notaMedia: 6.7,
        teoria: 8,
        pratica: 7.5,
        profundidade: 6.5,
      },
    ])
  })

  it('sem stacks devolve lista vazia', () => {
    expect(estatisticasPorCategoria([], { hoje })).toEqual([])
  })

  it('com uma stack só, as médias são os próprios valores', () => {
    expect(estatisticasPorCategoria([stackDoSeed('react')], { hoje })).toEqual([
      {
        categoria: 'Frontend',
        quantidade: 1,
        notaMedia: 8.4,
        teoria: 9,
        pratica: 8,
        profundidade: 8,
      },
    ])
  })
})
