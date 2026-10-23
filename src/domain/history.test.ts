import { afterEach, describe, expect, it, vi } from 'vitest'
import { criarSnapshot, paraDataISO, registrarSnapshot } from './history'
import { StackSchema } from './schema'
import type { Dimensoes, RegistroHistorico, Stack } from './types'

/** Data de referência fixa (local): 15/10/2026. */
const HOJE = new Date(2026, 9, 15, 10, 0)
const MAIS_TARDE_HOJE = new Date(2026, 9, 15, 18, 30)
const AMANHA = new Date(2026, 9, 16)

/** pratica 7, profundidade 6, teoria 8, evidências repo + certificado => 6.6 */
function stack(dimensoes: Partial<Dimensoes> = {}, historico: RegistroHistorico[] = []): Stack {
  return {
    id: 'ts',
    nome: 'TypeScript',
    categoria: 'Linguagens',
    tags: [],
    dimensoes: { teoria: 8, pratica: 7, profundidade: 6, ultimoUso: '2026-10-15', ...dimensoes },
    experiencia: { tipo: 'estudo', meses: 0 },
    evidencias: [
      { titulo: 'repo', descricao: '', tipo: 'repo' },
      { titulo: 'cert', descricao: '', tipo: 'certificado' },
    ],
    historico,
  }
}

function congelarFundo<T>(valor: T): T {
  if (valor && typeof valor === 'object') {
    Object.values(valor).forEach(congelarFundo)
    Object.freeze(valor)
  }
  return valor
}

afterEach(() => {
  vi.useRealTimers()
})

describe('paraDataISO', () => {
  it('formata a data local como YYYY-MM-DD', () => {
    expect(paraDataISO(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })
})

describe('criarSnapshot', () => {
  it('registra data de hoje, cópia das dimensões e nota calculada', () => {
    const s = stack()
    const snap = criarSnapshot(s, { hoje: HOJE })

    expect(snap).toEqual({ data: '2026-10-15', dimensoes: s.dimensoes, nota: 6.6 })
    expect(snap.dimensoes).not.toBe(s.dimensoes)
  })

  it('usa a data atual quando hoje não é informado', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 1, 12))
    expect(criarSnapshot(stack()).data).toBe('2026-03-01')
  })

  it('repassa a config da nota', () => {
    const config = { pesos: { pratica: 1, profundidade: 0, teoria: 0, evidencias: 0 } }
    expect(criarSnapshot(stack(), { hoje: HOJE, config }).nota).toBe(7)
  })
})

describe('registrarSnapshot', () => {
  it('histórico vazio: adiciona o primeiro snapshot', () => {
    const s = stack()
    const r = registrarSnapshot(s, { hoje: HOJE })

    expect(r).not.toBe(s)
    expect(r.historico).toEqual([criarSnapshot(s, { hoje: HOJE })])
  })

  it('snapshot idêntico não duplica e devolve a mesma referência', () => {
    const s = registrarSnapshot(stack(), { hoje: HOJE })

    expect(registrarSnapshot(s, { hoje: MAIS_TARDE_HOJE })).toBe(s)
    expect(registrarSnapshot(s, { hoje: AMANHA })).toBe(s)
  })

  it.each<[keyof Dimensoes, number | string]>([
    ['teoria', 9],
    ['pratica', 8],
    ['profundidade', 7],
    ['ultimoUso', '2026-10-16'],
  ])('mudança em %s gera novo snapshot', (campo, valor) => {
    const s = registrarSnapshot(stack(), { hoje: HOJE })
    const alterada = { ...s, dimensoes: { ...s.dimensoes, [campo]: valor } }
    const r = registrarSnapshot(alterada, { hoje: AMANHA })

    expect(r.historico).toHaveLength(2)
    expect(r.historico[0]).toEqual(s.historico[0])
    expect(r.historico[1].data).toBe('2026-10-16')
    expect(r.historico[1].dimensoes[campo]).toBe(valor)
  })

  it('mudança só da nota (decaimento por outra data) gera novo snapshot', () => {
    const s = registrarSnapshot(stack({ ultimoUso: '2024-01-01' }), {
      hoje: new Date(2024, 5, 1),
    })
    const r = registrarSnapshot(s, { hoje: HOJE })

    expect(r.historico).toHaveLength(2)
    expect(r.historico[1].dimensoes).toEqual(r.historico[0].dimensoes)
    expect(r.historico[1].nota).toBeLessThan(r.historico[0].nota)
  })

  it('mesmo dia com mudança substitui o snapshot do dia', () => {
    const ontem: RegistroHistorico = {
      data: '2026-10-14',
      dimensoes: { teoria: 5, pratica: 5, profundidade: 5, ultimoUso: '2026-10-14' },
      nota: 4.6,
    }
    const s = registrarSnapshot(stack({}, [ontem]), { hoje: HOJE })
    expect(s.historico).toHaveLength(2)

    const alterada = { ...s, dimensoes: { ...s.dimensoes, pratica: 9 } }
    const r = registrarSnapshot(alterada, { hoje: MAIS_TARDE_HOJE })

    expect(r.historico).toHaveLength(2)
    expect(r.historico[0]).toBe(ontem)
    expect(r.historico[1]).toEqual(criarSnapshot(alterada, { hoje: MAIS_TARDE_HOJE }))
  })

  it('não muta a stack de entrada', () => {
    const anterior = criarSnapshot(stack({ pratica: 2 }), { hoje: new Date(2026, 9, 1) })
    const s = congelarFundo(stack({}, [anterior]))
    const copia = structuredClone(s)

    const r = registrarSnapshot(s, { hoje: HOJE })
    const r2 = registrarSnapshot(
      { ...r, dimensoes: { ...r.dimensoes, teoria: 10 } },
      { hoje: HOJE },
    )

    expect(s).toEqual(copia)
    expect(r.historico).not.toBe(s.historico)
    expect(r2.historico).not.toBe(r.historico)
    expect(r.historico).toHaveLength(2)
  })

  it('o snapshot não compartilha referência com as dimensões da stack', () => {
    const r = registrarSnapshot(stack(), { hoje: HOJE })
    expect(r.historico[0].dimensoes).not.toBe(r.dimensoes)
  })

  it('o resultado continua válido no StackSchema', () => {
    let s = registrarSnapshot(stack(), { hoje: HOJE })
    s = registrarSnapshot({ ...s, dimensoes: { ...s.dimensoes, pratica: 10 } }, { hoje: AMANHA })

    expect(StackSchema.safeParse(s).success).toBe(true)
  })
})
