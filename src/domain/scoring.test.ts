import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SCORING_CONFIG,
  calcularNota,
  detalharNota,
  fatorDecaimento,
  mesesDesde,
  normalizarPesos,
  pontuarEvidencias,
  seiPorSaber,
} from './scoring'
import type { Dimensoes, Evidencia, Stack, TipoEvidencia } from './types'

/** Data de referência fixa (local): 15/10/2026. */
const HOJE = new Date(2026, 9, 15)

function ev(tipo: TipoEvidencia): Evidencia {
  return { titulo: tipo, descricao: '', tipo }
}

function stack(dimensoes: Partial<Dimensoes> = {}, evidencias: Evidencia[] = []): Stack {
  return {
    id: 'ts',
    nome: 'TypeScript',
    categoria: 'Linguagens',
    tags: [],
    dimensoes: { teoria: 0, pratica: 0, profundidade: 0, ultimoUso: '2026-10-15', ...dimensoes },
    experiencia: { tipo: 'estudo', meses: 0 },
    evidencias,
    historico: [],
  }
}

/** pratica 7, profundidade 6, teoria 8, evidências 4 (repo + certificado) => 6.6 */
const PADRAO = stack({ pratica: 7, profundidade: 6, teoria: 8 }, [ev('repo'), ev('certificado')])

/** Tudo no máximo => nota base 10. */
function maxima(ultimoUso: string): Stack {
  return stack({ pratica: 10, profundidade: 10, teoria: 10, ultimoUso }, [
    ev('emprego'),
    ev('emprego'),
    ev('projeto'),
  ])
}

describe('DEFAULT_SCORING_CONFIG', () => {
  it('tem os pesos da spec somando 1', () => {
    const { pesos } = DEFAULT_SCORING_CONFIG
    expect(pesos).toEqual({ pratica: 0.4, profundidade: 0.3, teoria: 0.2, evidencias: 0.1 })
    expect(pesos.pratica + pesos.profundidade + pesos.teoria + pesos.evidencias).toBeCloseTo(1)
  })
})

describe('calcularNota - média ponderada', () => {
  it('aplica os pesos padrão', () => {
    expect(calcularNota(PADRAO, { hoje: HOJE })).toBe(6.6)
  })

  it('aceita pesos customizados (sobrescrita parcial)', () => {
    const config = { pesos: { pratica: 1, profundidade: 0, teoria: 0, evidencias: 0 } }
    expect(calcularNota(PADRAO, { hoje: HOJE, config })).toBe(7)
    // só teoria zerada: (7*0.4 + 6*0.3 + 4*0.1) / 0.8 = 6.25 => 6.3
    expect(calcularNota(PADRAO, { hoje: HOJE, config: { pesos: { teoria: 0 } } })).toBe(6.3)
  })

  it('normaliza pesos que não somam 1', () => {
    const proporcional = { pesos: { pratica: 4, profundidade: 3, teoria: 2, evidencias: 1 } }
    expect(calcularNota(PADRAO, { hoje: HOJE, config: proporcional })).toBe(6.6)

    const metade = { pesos: { pratica: 2, profundidade: 0, teoria: 2, evidencias: 0 } }
    expect(calcularNota(PADRAO, { hoje: HOJE, config: metade })).toBe(7.5)
  })

  it('rejeita pesos negativos ou com soma 0', () => {
    expect(() =>
      normalizarPesos({ pratica: -1, profundidade: 1, teoria: 1, evidencias: 1 }),
    ).toThrow(RangeError)
    expect(() =>
      normalizarPesos({ pratica: 0, profundidade: 0, teoria: 0, evidencias: 0 }),
    ).toThrow(RangeError)
  })
})

describe('componente de evidências', () => {
  it('soma pontos por tipo', () => {
    expect(pontuarEvidencias([])).toBe(0)
    expect(pontuarEvidencias([ev('emprego')])).toBe(4)
    expect(pontuarEvidencias([ev('projeto')])).toBe(3)
    expect(pontuarEvidencias([ev('repo'), ev('certificado')])).toBe(4)
    expect(pontuarEvidencias([ev('emprego'), ev('projeto'), ev('repo')])).toBe(9)
  })

  it('limita a soma a 10', () => {
    expect(pontuarEvidencias([ev('emprego'), ev('projeto'), ev('repo'), ev('certificado')])).toBe(
      10,
    )
    expect(pontuarEvidencias([ev('emprego'), ev('emprego'), ev('emprego')])).toBe(10)
  })

  it('aceita pontos customizados', () => {
    const config = { pontosEvidencia: { certificado: 0, repo: 5 } }
    const s = stack({}, [ev('certificado'), ev('repo'), ev('repo'), ev('repo')])
    const detalhe = detalharNota(s, { hoje: HOJE, config })
    expect(detalhe.componentes.evidencias.valor).toBe(10)
    expect(calcularNota(s, { hoje: HOJE, config })).toBe(1)
  })
})

describe('decaimento por recência', () => {
  it.each([
    ['0 meses', '2026-10-15', 1, 10],
    ['6 meses', '2026-04-15', 1, 10],
    ['21 meses', '2025-01-15', 0.9, 9],
    ['36 meses', '2023-10-15', 0.8, 8],
    ['60 meses', '2021-10-15', 0.8, 8],
    ['data futura', '2027-03-01', 1, 10],
  ])('%s', (_rotulo, ultimoUso, fator, nota) => {
    const detalhe = detalharNota(maxima(ultimoUso), { hoje: HOJE })
    expect(detalhe.notaBase).toBeCloseTo(10)
    expect(detalhe.fatorDecaimento).toBeCloseTo(fator, 10)
    expect(detalhe.nota).toBe(nota)
  })

  it('é linear entre a carência e o máximo', () => {
    expect(fatorDecaimento(6)).toBe(1)
    expect(fatorDecaimento(12)).toBeCloseTo(0.96, 10)
    expect(fatorDecaimento(21)).toBeCloseTo(0.9, 10)
    expect(fatorDecaimento(36)).toBeCloseTo(0.8, 10)
    expect(fatorDecaimento(1000)).toBeCloseTo(0.8, 10)
  })

  it('usa os parâmetros do config', () => {
    const config = { decaimento: { carenciaMeses: 0, mesesPerdaMaxima: 12, perdaMaxima: 0.5 } }
    expect(calcularNota(maxima('2026-04-15'), { hoje: HOJE, config })).toBe(7.5)
    expect(calcularNota(maxima('2020-01-01'), { hoje: HOJE, config })).toBe(5)
  })

  it('conta meses por calendário e ignora datas futuras ou inválidas', () => {
    expect(mesesDesde('2026-10-15', HOJE)).toBe(0)
    expect(mesesDesde('2026-04-15', HOJE)).toBe(6)
    expect(mesesDesde('2025-01-15', HOJE)).toBe(21)
    expect(mesesDesde('2026-10-30', HOJE)).toBe(0)
    expect(mesesDesde('invalida', HOJE)).toBe(0)
  })

  it('usa a data atual quando hoje não é informado', () => {
    expect(calcularNota(maxima('2999-01-01'))).toBe(10)
  })
})

describe('clamp e arredondamento', () => {
  it('limita dimensões fora de 0-10', () => {
    const alta = stack({ pratica: 15, profundidade: 12, teoria: 11 }, [
      ev('emprego'),
      ev('emprego'),
      ev('emprego'),
    ])
    expect(calcularNota(alta, { hoje: HOJE })).toBe(10)

    const negativa = stack({ pratica: -5, profundidade: -1, teoria: -3 })
    expect(calcularNota(negativa, { hoje: HOJE })).toBe(0)
  })

  it('arredonda a 1 casa decimal', () => {
    const soPratica = { pesos: { pratica: 1, profundidade: 0, teoria: 0, evidencias: 0 } }
    const nota = (pratica: number) =>
      calcularNota(stack({ pratica }), { hoje: HOJE, config: soPratica })
    expect(nota(6.64)).toBe(6.6)
    expect(nota(6.65)).toBe(6.7)
    expect(nota(6.66)).toBe(6.7)
    expect(nota(9.96)).toBe(10)
    // 0.1*0.4 + 0.2*0.3 + 0.3*0.2 = 0.16 => 0.2
    expect(
      calcularNota(stack({ pratica: 0.1, profundidade: 0.2, teoria: 0.3 }), { hoje: HOJE }),
    ).toBe(0.2)
  })
})

describe('detalharNota', () => {
  it('expõe valor, peso e contribuição de cada componente', () => {
    const d = detalharNota(PADRAO, { hoje: HOJE })
    expect(d.componentes.pratica).toEqual({
      valor: 7,
      peso: 0.4,
      contribuicao: expect.closeTo(2.8),
    })
    expect(d.componentes.profundidade.contribuicao).toBeCloseTo(1.8)
    expect(d.componentes.teoria.contribuicao).toBeCloseTo(1.6)
    expect(d.componentes.evidencias).toEqual({
      valor: 4,
      peso: 0.1,
      contribuicao: expect.closeTo(0.4),
    })
    expect(d.notaBase).toBeCloseTo(6.6)
    expect(d.mesesSemUso).toBe(0)
    expect(d.fatorDecaimento).toBe(1)
    expect(d.nota).toBe(6.6)
  })

  it('reporta pesos normalizados', () => {
    const d = detalharNota(PADRAO, {
      hoje: HOJE,
      config: { pesos: { pratica: 2, profundidade: 1, teoria: 1, evidencias: 0 } },
    })
    expect(d.componentes.pratica.peso).toBe(0.5)
    expect(d.componentes.teoria.peso).toBe(0.25)
    expect(d.componentes.evidencias.peso).toBe(0)
  })
})

describe('seiPorSaber', () => {
  it.each([
    [7, 3, true],
    [10, 0, true],
    [6.9, 3, false],
    [7, 3.1, false],
    [6.9, 3.1, false],
  ])('teoria %d, prática %d => %s', (teoria, pratica, esperado) => {
    expect(seiPorSaber(stack({ teoria, pratica }))).toBe(esperado)
  })

  it('usa limiares do config', () => {
    const s = stack({ teoria: 6, pratica: 4 })
    expect(seiPorSaber(s)).toBe(false)
    expect(seiPorSaber(s, { seiPorSaber: { teoriaMinima: 6, praticaMaxima: 4 } })).toBe(true)
  })
})
