import { describe, expect, it } from 'vitest'
import { TIPOS_EXPERIENCIA } from '../domain/types'
import { ROTULO_EXPERIENCIA, formatarNota } from './formatacao'

describe('formatarNota', () => {
  it.each([
    [7.4, '7,4'],
    [10, '10,0'],
    [0, '0,0'],
    [3.25, '3,3'],
    [Number.NaN, '0,0'],
  ])('%s -> %s', (nota, esperado) => {
    expect(formatarNota(nota)).toBe(esperado)
  })
})

describe('ROTULO_EXPERIENCIA', () => {
  it('tem rótulo para todo tipo de experiência', () => {
    for (const tipo of TIPOS_EXPERIENCIA) expect(ROTULO_EXPERIENCIA[tipo]).toBeTruthy()
  })
})
