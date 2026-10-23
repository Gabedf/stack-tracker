import { describe, expect, it } from 'vitest'
import type { Evidencia, Stack, TipoExperiencia } from '../../domain/types'
import { HOJE_SEED, stacksDoSeed } from '../../test/seed'
import { normalizarTexto } from '../stacks/stackFiltering'
import { selecionarParaCurriculo, temComprovacao, type SelecaoCurriculo } from './resumeExport'
import { DEFAULT_OPCOES_CURRICULO, resolverOpcoesCurriculo } from './resumeOptions'

/*
 * Notas do seed com hoje = 23/10/2026 (ver dashboardStats.test.ts):
 *   react 8,4 Mestre · nodejs 5,5 Praticante · kubernetes 3,8 Aprendiz (sei por saber)
 *   jquery 4,9 Praticante · postgresql 2,6 Aprendiz (estudo, sem evidências)
 */

const hoje = HOJE_SEED

interface DadosFake {
  nome: string
  categoria?: string
  /** Valor de teoria, prática e profundidade (sem evidências: nota = 0,9 × valor). */
  valor?: number
  teoria?: number
  pratica?: number
  tipo?: TipoExperiencia
  meses?: number
  evidencias?: Evidencia[]
}

function fake({
  nome,
  categoria = 'Geral',
  valor = 5,
  teoria = valor,
  pratica = valor,
  tipo = 'projeto_pessoal',
  meses = 12,
  evidencias = [],
}: DadosFake): Stack {
  return {
    id: normalizarTexto(nome).replace(/\W+/g, '-'),
    nome,
    categoria,
    tags: [],
    dimensoes: { teoria, pratica, profundidade: valor, ultimoUso: '2026-10-01' },
    experiencia: { tipo, meses },
    evidencias,
    historico: [],
  }
}

function idsPorGrupo(selecao: SelecaoCurriculo): Record<string, string[]> {
  return Object.fromEntries(
    selecao.grupos.map((g) => [g.categoria, g.stacks.map((item) => item.stack.id)]),
  )
}

function motivos(selecao: SelecaoCurriculo): Record<string, string> {
  return Object.fromEntries(selecao.excluidas.map((e) => [e.stack.id, e.motivo]))
}

describe('opções do currículo', () => {
  it('tem padrões conservadores: só o comprovado, sem nota', () => {
    expect(DEFAULT_OPCOES_CURRICULO).toEqual({
      categorias: null,
      nivelMinimo: null,
      somenteComprovado: true,
      incluirSeiPorSaber: false,
      mostrarNivel: true,
      mostrarNota: false,
      mostrarTempo: true,
      incluirEvidencias: true,
      titulo: 'Competências técnicas',
    })
  })

  it('completa opções parciais e ignora campos undefined', () => {
    const o = resolverOpcoesCurriculo({ mostrarNota: true, titulo: undefined })
    expect(o.mostrarNota).toBe(true)
    expect(o.titulo).toBe('Competências técnicas')
    expect(o.somenteComprovado).toBe(true)
  })
})

describe('temComprovacao', () => {
  it('aceita evidência ou prática real (projeto pessoal / produção)', () => {
    const ev: Evidencia = { titulo: 'x', descricao: '', tipo: 'repo' }
    expect(temComprovacao(fake({ nome: 'A', tipo: 'estudo', evidencias: [ev] }))).toBe(true)
    expect(temComprovacao(fake({ nome: 'B', tipo: 'projeto_pessoal' }))).toBe(true)
    expect(temComprovacao(fake({ nome: 'C', tipo: 'producao' }))).toBe(true)
    expect(temComprovacao(fake({ nome: 'D', tipo: 'estudo' }))).toBe(false)
    expect(temComprovacao(fake({ nome: 'E', tipo: 'so_teoria' }))).toBe(false)
  })
})

describe('selecionarParaCurriculo com o seed', () => {
  it('por padrão só inclui o que tem evidência ou prática real', () => {
    const selecao = selecionarParaCurriculo(stacksDoSeed(), {}, { hoje })
    expect(idsPorGrupo(selecao)).toEqual({
      Backend: ['nodejs'],
      Frontend: ['react', 'jquery'],
    })
    expect(selecao.conhecimentoTeorico).toEqual([])
    expect(motivos(selecao)).toEqual({
      kubernetes: 'sei_por_saber',
      postgresql: 'sem_comprovacao',
    })
  })

  it('agrupa por categoria em ordem alfabética e ordena por nota desc', () => {
    const selecao = selecionarParaCurriculo(stacksDoSeed(), { somenteComprovado: false }, { hoje })
    expect(selecao.grupos.map((g) => g.categoria)).toEqual(['Backend', 'Dados', 'Frontend'])
    const frontend = selecao.grupos.find((g) => g.categoria === 'Frontend')
    expect(frontend?.stacks.map((s) => [s.stack.id, s.nota, s.nivel.id])).toEqual([
      ['react', 8.4, 'mestre'],
      ['jquery', 4.9, 'praticante'],
    ])
  })

  it('somenteComprovado=false inclui todas, menos a sei por saber', () => {
    const selecao = selecionarParaCurriculo(stacksDoSeed(), { somenteComprovado: false }, { hoje })
    expect(idsPorGrupo(selecao)).toEqual({
      Backend: ['nodejs'],
      Dados: ['postgresql'],
      Frontend: ['react', 'jquery'],
    })
    expect(motivos(selecao)).toEqual({ kubernetes: 'sei_por_saber' })
  })

  it('incluirSeiPorSaber põe a stack na seção de conhecimento teórico', () => {
    const selecao = selecionarParaCurriculo(
      stacksDoSeed(),
      { somenteComprovado: false, incluirSeiPorSaber: true },
      { hoje },
    )
    expect(selecao.conhecimentoTeorico.map((s) => s.stack.id)).toEqual(['kubernetes'])
    expect(selecao.grupos.map((g) => g.categoria)).toEqual(['Backend', 'Dados', 'Frontend'])
    expect(selecao.excluidas).toEqual([])
  })

  it('incluirSeiPorSaber não tem efeito com somenteComprovado ligado', () => {
    const selecao = selecionarParaCurriculo(stacksDoSeed(), { incluirSeiPorSaber: true }, { hoje })
    expect(selecao.conhecimentoTeorico).toEqual([])
    expect(motivos(selecao).kubernetes).toBe('sei_por_saber')
  })

  it('combina filtro de categoria e nível mínimo', () => {
    const selecao = selecionarParaCurriculo(
      stacksDoSeed(),
      { categorias: ['Frontend', 'Backend', 'DevOps'], nivelMinimo: 'senior' },
      { hoje },
    )
    expect(idsPorGrupo(selecao)).toEqual({ Frontend: ['react'] })
    expect(motivos(selecao)).toEqual({
      nodejs: 'nivel',
      kubernetes: 'nivel',
      jquery: 'nivel',
      postgresql: 'categoria',
    })
  })

  it('nível mínimo é inclusivo no limite inferior da faixa', () => {
    const selecao = selecionarParaCurriculo(stacksDoSeed(), { nivelMinimo: 'praticante' }, { hoje })
    expect(idsPorGrupo(selecao)).toEqual({ Backend: ['nodejs'], Frontend: ['react', 'jquery'] })
  })

  it('lista vazia de categorias exclui tudo', () => {
    const selecao = selecionarParaCurriculo(stacksDoSeed(), { categorias: [] }, { hoje })
    expect(selecao.grupos).toEqual([])
    expect(selecao.excluidas.every((e) => e.motivo === 'categoria')).toBe(true)
    expect(selecao.excluidas).toHaveLength(5)
  })

  it('não altera o array recebido', () => {
    const stacks = stacksDoSeed()
    const ordemOriginal = stacks.map((s) => s.id)
    selecionarParaCurriculo(stacks, { somenteComprovado: false }, { hoje })
    expect(stacks.map((s) => s.id)).toEqual(ordemOriginal)
  })
})

describe('selecionarParaCurriculo com dados sintéticos', () => {
  it('estudo com evidência entra; estudo sem evidência fica de fora', () => {
    const ev: Evidencia = { titulo: 'Curso', descricao: '', tipo: 'certificado' }
    const selecao = selecionarParaCurriculo(
      [
        fake({ nome: 'Com evidência', tipo: 'estudo', evidencias: [ev] }),
        fake({ nome: 'Sem evidência', tipo: 'estudo' }),
      ],
      {},
      { hoje },
    )
    expect(idsPorGrupo(selecao)).toEqual({ Geral: ['com-evidencia'] })
    expect(motivos(selecao)).toEqual({ 'sem-evidencia': 'sem_comprovacao' })
  })

  it('desempata nota igual pelo nome (pt-BR) e ordena categorias com acento', () => {
    const selecao = selecionarParaCurriculo(
      [
        fake({ nome: 'Zeta', categoria: 'Ética', valor: 6 }),
        fake({ nome: 'beta', categoria: 'Ética', valor: 6 }),
        fake({ nome: 'Alfa', categoria: 'Ética', valor: 4 }),
        fake({ nome: 'Gama', categoria: 'Dados', valor: 6 }),
        fake({ nome: 'Delta', categoria: 'Front', valor: 6 }),
      ],
      {},
      { hoje },
    )
    expect(selecao.grupos.map((g) => g.categoria)).toEqual(['Dados', 'Ética', 'Front'])
    expect(idsPorGrupo(selecao)['Ética']).toEqual(['beta', 'zeta', 'alfa'])
  })
})
