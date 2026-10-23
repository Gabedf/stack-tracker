import { describe, expect, it } from 'vitest'
// Conteúdo do seed fictício (data/seed.json) como texto.
import seedTexto from '../../data/seed.json?raw'
import { calcularNota, mesesDesde, seiPorSaber } from '../domain/scoring'
import type { StacksFile } from '../domain/types'
import { carregarStacksFile } from './stacksFileLoader'

const HOJE_SEED = new Date(2026, 9, 23)

function dataLocal(data: string): Date {
  const [ano, mes, dia] = data.split('-').map(Number)
  return new Date(ano, mes - 1, dia)
}

function carregarSeed(): StacksFile {
  const resultado = carregarStacksFile(seedTexto)
  if (!resultado.ok) throw new Error(resultado.erros.join('\n'))
  return resultado.dados
}

describe('carregarStacksFile', () => {
  it('aceita um StacksFile válido', () => {
    const resultado = carregarStacksFile(JSON.stringify({ versao: 1, stacks: [] }))
    expect(resultado).toEqual({ ok: true, dados: { versao: 1, stacks: [] } })
  })

  it('rejeita string vazia ou só com espaços', () => {
    expect(carregarStacksFile('')).toEqual({ ok: false, erros: ['O arquivo está vazio.'] })
    expect(carregarStacksFile('  \n\t ')).toEqual({ ok: false, erros: ['O arquivo está vazio.'] })
  })

  it('rejeita JSON malformado com mensagem amigável, sem lançar', () => {
    const resultado = carregarStacksFile('{ "versao": 1, "stacks": [ }')
    expect(resultado.ok).toBe(false)
    if (resultado.ok) return
    expect(resultado.erros).toHaveLength(1)
    expect(resultado.erros[0]).toMatch(/^O arquivo não é um JSON válido/)
  })

  it('rejeita JSON válido fora do schema, repassando os erros do schema', () => {
    const resultado = carregarStacksFile(JSON.stringify({ versao: 2, stacks: [{ id: '' }] }))
    expect(resultado.ok).toBe(false)
    if (resultado.ok) return
    expect(resultado.erros).toContain('versao: Versão do arquivo não suportada (esperado 1).')
    expect(resultado.erros.some((e) => e.startsWith('stacks[0].'))).toBe(true)
  })

  it('rejeita JSON válido que não é objeto', () => {
    for (const texto of ['[]', '42', 'null', '"texto"']) {
      const resultado = carregarStacksFile(texto)
      expect(resultado.ok).toBe(false)
    }
  })
})

describe('seed data/seed.json', () => {
  it('passa no schema', () => {
    const resultado = carregarStacksFile(seedTexto)
    expect(resultado.ok ? [] : resultado.erros).toEqual([])
  })

  it('tem 5 stacks em pelo menos 3 categorias', () => {
    const { stacks } = carregarSeed()
    expect(stacks).toHaveLength(5)
    expect(new Set(stacks.map((s) => s.categoria)).size).toBeGreaterThanOrEqual(3)
  })

  it('tem uma stack "sei por saber" só de teoria', () => {
    const { stacks } = carregarSeed()
    const stack = stacks.find((s) => seiPorSaber(s))
    expect(stack).toBeDefined()
    expect(stack?.experiencia.tipo).toBe('so_teoria')
  })

  it('tem uma stack de produção com evidências de vários tipos', () => {
    const { stacks } = carregarSeed()
    const stack = stacks.find(
      (s) =>
        s.experiencia.tipo === 'producao' && new Set(s.evidencias.map((e) => e.tipo)).size >= 3,
    )
    expect(stack).toBeDefined()
  })

  it('tem uma stack sem uso há mais de 3 anos (decaimento)', () => {
    const { stacks } = carregarSeed()
    expect(stacks.some((s) => mesesDesde(s.dimensoes.ultimoUso, HOJE_SEED) > 36)).toBe(true)
  })

  it('tem exatamente uma stack com histórico vazio; as demais têm 3 a 5 snapshots', () => {
    const { stacks } = carregarSeed()
    expect(stacks.filter((s) => s.historico.length === 0)).toHaveLength(1)
    for (const s of stacks.filter((s) => s.historico.length > 0)) {
      expect(s.historico.length).toBeGreaterThanOrEqual(3)
      expect(s.historico.length).toBeLessThanOrEqual(5)
    }
  })

  it('usa só URLs fictícias em example.com', () => {
    const { stacks } = carregarSeed()
    const urls = stacks.flatMap((s) => s.evidencias.flatMap((e) => (e.url ? [e.url] : [])))
    expect(urls.length).toBeGreaterThan(0)
    for (const url of urls) expect(new URL(url).hostname).toMatch(/(^|\.)example\.com$/)
  })

  it('tem histórico em ordem cronológica com notas coerentes com as dimensões', () => {
    const { stacks } = carregarSeed()
    for (const stack of stacks) {
      const datas = stack.historico.map((h) => h.data)
      expect(datas).toEqual([...datas].sort())
      for (const registro of stack.historico) {
        const nota = calcularNota(
          { ...stack, dimensoes: registro.dimensoes },
          { hoje: dataLocal(registro.data) },
        )
        expect(nota, `${stack.id} em ${registro.data}`).toBe(registro.nota)
      }
    }
  })
})
