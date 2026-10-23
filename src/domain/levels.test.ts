import { describe, expect, it } from 'vitest'
import { NIVEIS, nivelDaNota, progressoNoNivel } from './levels'

describe('NIVEIS', () => {
  it('lista os níveis em ordem crescente e contíguos de 0 a 10', () => {
    expect(NIVEIS.map((n) => n.nome)).toEqual([
      'Iniciante',
      'Aprendiz',
      'Praticante',
      'Sênior',
      'Mestre',
    ])
    expect(NIVEIS[0].min).toBe(0)
    expect(NIVEIS[NIVEIS.length - 1].max).toBe(10)
    for (let i = 1; i < NIVEIS.length; i++) {
      expect(NIVEIS[i].min).toBe(NIVEIS[i - 1].max)
    }
  })
})

describe('nivelDaNota', () => {
  it.each([
    [0, 'iniciante'],
    [1.99, 'iniciante'],
    [2, 'aprendiz'],
    [3.99, 'aprendiz'],
    [4, 'praticante'],
    [5.99, 'praticante'],
    [6, 'senior'],
    [7.99, 'senior'],
    [8, 'mestre'],
    [9.99, 'mestre'],
    [10, 'mestre'],
  ])('nota %d => %s', (nota, id) => {
    expect(nivelDaNota(nota).id).toBe(id)
  })

  it('limita notas fora de 0-10', () => {
    expect(nivelDaNota(-1).id).toBe('iniciante')
    expect(nivelDaNota(11).id).toBe('mestre')
    expect(nivelDaNota(Number.NaN).id).toBe('iniciante')
  })
})

describe('progressoNoNivel', () => {
  it.each([
    [0, 0],
    [1, 0.5],
    [1.99, 0.995],
    [2, 0],
    [3, 0.5],
    [7.99, 0.995],
    [8, 0],
    [9, 0.5],
    [10, 1],
  ])('nota %d => %d', (nota, esperado) => {
    expect(progressoNoNivel(nota)).toBeCloseTo(esperado, 10)
  })

  it('fica entre 0 e 1 para notas fora da faixa', () => {
    expect(progressoNoNivel(-5)).toBe(0)
    expect(progressoNoNivel(15)).toBe(1)
  })
})
