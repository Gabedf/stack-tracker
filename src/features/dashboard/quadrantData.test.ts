import { describe, expect, it } from 'vitest'
import { HOJE_SEED, stacksDoSeed } from '../../test/seed'
import {
  LIMIAR_QUADRANTE,
  MAX_ROTULOS,
  classificarQuadrante,
  contarPorQuadrante,
  pontosQuadrante,
  rotulosQueCabem,
  type PontoQuadrante,
} from './quadrantData'

describe('classificarQuadrante', () => {
  it('usa limiar 5 por padrão', () => {
    expect(LIMIAR_QUADRANTE).toBe(5)
  })

  it.each([
    [9, 8, 'dominio'],
    [8, 2, 'sei-por-saber'],
    [2, 8, 'pratica-intuitiva'],
    [1, 1, 'a-explorar'],
  ] as const)('teoria %d, prática %d -> %s', (teoria, pratica, esperado) => {
    expect(classificarQuadrante(teoria, pratica)).toBe(esperado)
  })

  it('o limiar conta como alto (inclusivo) nos dois eixos', () => {
    expect(classificarQuadrante(5, 5)).toBe('dominio')
    expect(classificarQuadrante(5, 4.9)).toBe('sei-por-saber')
    expect(classificarQuadrante(4.9, 5)).toBe('pratica-intuitiva')
    expect(classificarQuadrante(4.9, 4.9)).toBe('a-explorar')
  })

  it('cobre os extremos da escala', () => {
    expect(classificarQuadrante(0, 0)).toBe('a-explorar')
    expect(classificarQuadrante(10, 10)).toBe('dominio')
    expect(classificarQuadrante(10, 0)).toBe('sei-por-saber')
    expect(classificarQuadrante(0, 10)).toBe('pratica-intuitiva')
  })

  it('aceita outro limiar', () => {
    expect(classificarQuadrante(6, 6, 7)).toBe('a-explorar')
    expect(classificarQuadrante(7, 6.9, 7)).toBe('sei-por-saber')
    expect(classificarQuadrante(3, 3, 3)).toBe('dominio')
    expect(classificarQuadrante(0, 0, 0)).toBe('dominio')
  })
})

describe('pontosQuadrante com o seed', () => {
  const pontos = pontosQuadrante(stacksDoSeed(), { hoje: HOJE_SEED })

  it('posiciona as 5 stacks, ordenadas por quadrante e nome', () => {
    expect(pontos.map((p) => [p.id, p.teoria, p.pratica, p.nota, p.quadrante])).toEqual([
      ['jquery', 7, 7, 4.9, 'dominio'],
      ['nodejs', 7, 6, 5.5, 'dominio'],
      ['react', 9, 8, 8.4, 'dominio'],
      ['kubernetes', 8, 2, 3.8, 'sei-por-saber'],
      ['postgresql', 4, 3, 2.6, 'a-explorar'],
    ])
  })

  it('marca como sei por saber só kubernetes (teoria >= 7 e prática <= 3)', () => {
    expect(pontos.filter((p) => p.seiPorSaber).map((p) => p.id)).toEqual(['kubernetes'])
  })

  it('conta por quadrante, inclusive os vazios', () => {
    expect(contarPorQuadrante(pontos).map((c) => [c.quadrante.id, c.quantidade])).toEqual([
      ['dominio', 3],
      ['sei-por-saber', 1],
      ['pratica-intuitiva', 0],
      ['a-explorar', 1],
    ])
  })

  it('o limiar muda o quadrante sem mudar a marcação sei por saber', () => {
    const comLimiar8 = pontosQuadrante(stacksDoSeed(), { hoje: HOJE_SEED, limiar: 8 })
    const react = comLimiar8.find((p) => p.id === 'react')
    const jquery = comLimiar8.find((p) => p.id === 'jquery')
    expect(react?.quadrante).toBe('dominio')
    expect(jquery?.quadrante).toBe('a-explorar')
    expect(comLimiar8.find((p) => p.id === 'kubernetes')?.seiPorSaber).toBe(true)
  })
})

describe('rotulosQueCabem', () => {
  function ponto(id: string, teoria: number, pratica: number): PontoQuadrante {
    return {
      id,
      nome: id,
      teoria,
      pratica,
      nota: 0,
      quadrante: 'dominio',
      seiPorSaber: false,
    }
  }

  it('no seed, todos os nomes cabem', () => {
    const pontos = pontosQuadrante(stacksDoSeed(), { hoje: HOJE_SEED })
    expect(rotulosQueCabem(pontos).size).toBe(5)
  })

  it('pontos vizinhos ficam sem nome; os isolados mantêm', () => {
    const cabem = rotulosQueCabem([ponto('a', 5, 5), ponto('b', 6, 5.5), ponto('c', 1, 9)])
    expect([...cabem]).toEqual(['c'])
  })

  it(`com mais de ${MAX_ROTULOS} pontos, nenhum nome`, () => {
    const muitos = Array.from({ length: MAX_ROTULOS + 1 }, (_, i) => ponto(`s${i}`, i % 10, i))
    expect(rotulosQueCabem(muitos).size).toBe(0)
  })
})
