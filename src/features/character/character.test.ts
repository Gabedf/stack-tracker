import { describe, expect, it } from 'vitest'
import type { Stack } from '../../domain/types'
import { HOJE_SEED, stackDoSeed, stacksDoSeed } from '../../test/seed'
import {
  calcularPersonagem,
  classeDoPersonagem,
  habilidadesPorCategoria,
  nivelDoXp,
  progressoDoXp,
  xpDaNota,
  xpParaNivel,
} from './character'
import { classeGenerica, nomeDaClasse, normalizarCategoria } from './classes'

const hoje = HOJE_SEED

function comCategoria(id: string, categoria: string, novoId = id): Stack {
  return { ...stackDoSeed(id), id: novoId, categoria }
}

describe('fórmula de XP e nível', () => {
  it('converte nota em XP arredondado', () => {
    expect(xpDaNota(8.4)).toBe(840)
    expect(xpDaNota(0.15)).toBe(15)
    expect(xpDaNota(0)).toBe(0)
  })

  it.each([
    [0, 0],
    [99, 0],
    [100, 1],
    [399, 1],
    [400, 2],
    [899, 2],
    [900, 3],
  ])('xp %i -> nível %i', (xp, nivel) => {
    expect(nivelDoXp(xp)).toBe(nivel)
  })

  it('o nível n começa em 100 × n²', () => {
    expect([1, 2, 3, 5].map(xpParaNivel)).toEqual([100, 400, 900, 2500])
  })

  it('xp 0 sem mínimo fica no nível 0', () => {
    expect(progressoDoXp(0)).toEqual({
      xp: 0,
      nivel: 0,
      xpDoNivelAtual: 0,
      xpProximoNivel: 100,
      progresso: 0,
      faltam: 100,
    })
  })

  it('com mínimo 1, xp 99 fica no nível 1 começando em 0', () => {
    expect(progressoDoXp(99, 1)).toEqual({
      xp: 99,
      nivel: 1,
      xpDoNivelAtual: 0,
      xpProximoNivel: 400,
      progresso: 99 / 400,
      faltam: 301,
    })
  })

  it('xp 100 entra no nível 1 pela fórmula', () => {
    const p = progressoDoXp(100, 1)
    expect(p).toMatchObject({ nivel: 1, xpDoNivelAtual: 100, xpProximoNivel: 400, faltam: 300 })
    expect(p.progresso).toBe(0)
  })

  it('xp 399 está a 1 do nível 2; xp 400 começa o nível 2', () => {
    expect(progressoDoXp(399, 1)).toMatchObject({ nivel: 1, faltam: 1, progresso: 299 / 300 })
    expect(progressoDoXp(400, 1)).toMatchObject({
      nivel: 2,
      xpDoNivelAtual: 400,
      xpProximoNivel: 900,
      progresso: 0,
      faltam: 500,
    })
  })
})

describe('classe do personagem', () => {
  it('sem categorias é Recruta', () => {
    expect(classeDoPersonagem(new Map())).toEqual({
      tipo: 'recruta',
      nome: 'Recruta',
      categorias: [],
    })
  })

  it('a categoria dominante pela soma de notas define a classe', () => {
    const classe = classeDoPersonagem(
      new Map([
        ['Backend', 5],
        ['Frontend', 13.3],
        ['Dados', 2.6],
      ]),
    )
    expect(classe).toEqual({
      tipo: 'pura',
      nome: nomeDaClasse('Frontend'),
      categorias: ['Frontend'],
    })
  })

  it('empate vira multiclasse, em ordem alfabética', () => {
    const classe = classeDoPersonagem(
      new Map([
        ['Frontend', 8],
        ['Backend', 8],
      ]),
    )
    expect(classe).toEqual({
      tipo: 'multiclasse',
      nome: 'Multiclasse: Backend / Frontend',
      categorias: ['Backend', 'Frontend'],
    })
  })

  it('diferença de até 10% vira multiclasse (maior primeiro); acima disso, não', () => {
    expect(
      classeDoPersonagem(
        new Map([
          ['Backend', 9],
          ['Frontend', 10],
        ]),
      ).nome,
    ).toBe('Multiclasse: Frontend / Backend')
    expect(
      classeDoPersonagem(
        new Map([
          ['Backend', 8.9],
          ['Frontend', 10],
        ]),
      ).tipo,
    ).toBe('pura')
  })

  it('só olha as duas maiores somas', () => {
    const classe = classeDoPersonagem(
      new Map([
        ['DevOps', 10],
        ['Dados', 5],
        ['Mobile', 4.9],
      ]),
    )
    expect(classe.nome).toBe(nomeDaClasse('DevOps'))
  })

  it('categoria fora do mapa usa a classe genérica', () => {
    const classe = classeDoPersonagem(new Map([['Jogos', 7]]))
    expect(classe.nome).toBe('Aventureiro(a) de Jogos')
    expect(classe.nome).toBe(classeGenerica('Jogos'))
  })

  it('o mapa ignora caixa, acentos e separadores', () => {
    expect(normalizarCategoria('IA/ML')).toBe('iaml')
    expect(normalizarCategoria('Segurança')).toBe('seguranca')
    for (const categoria of ['Frontend', 'Backend', 'DevOps', 'Dados', 'Mobile', 'IA/ML']) {
      expect(nomeDaClasse(categoria)).not.toBe(classeGenerica(categoria))
    }
    expect(nomeDaClasse('front-end')).toBe(nomeDaClasse('Frontend'))
    expect(nomeDaClasse('IA / ML')).toBe(nomeDaClasse('IA/ML'))
  })
})

/*
 * Seed com hoje = 23/10/2026 (notas em src/features/dashboard/dashboardStats.test.ts):
 * react 8,4 e jquery 4,9 (Frontend) · nodejs 5,5 (Backend) · kubernetes 3,8 (DevOps)
 * · postgresql 2,6 (Dados).
 *   XP: Frontend 840 + 490 = 1330 · Backend 550 · DevOps 380 · Dados 260 -> total 2520.
 *   Nível: floor(sqrt(25,2)) = 5 (2500 a 3600 XP) -> faltam 1080.
 */
describe('personagem com o seed', () => {
  const personagem = calcularPersonagem(stacksDoSeed(), { hoje })

  it('soma o XP e calcula o nível numérico', () => {
    expect(personagem.progresso).toEqual({
      xp: 2520,
      nivel: 5,
      xpDoNivelAtual: 2500,
      xpProximoNivel: 3600,
      progresso: 20 / 1100,
      faltam: 1080,
    })
  })

  it('título pela média das notas e classe pela categoria dominante', () => {
    expect(personagem.notaMedia).toBe(5)
    expect(personagem.titulo.nome).toBe('Praticante')
    expect(personagem.classe).toEqual({
      tipo: 'pura',
      nome: nomeDaClasse('Frontend'),
      categorias: ['Frontend'],
    })
  })

  it('totais de stacks, evidências e sei por saber', () => {
    expect(personagem.totais).toEqual({ stacks: 5, evidencias: 7, seiPorSaber: 1 })
  })

  it('habilidades por categoria, do maior XP para o menor', () => {
    expect(
      personagem.habilidades.map((h) => [h.categoria, h.xp, h.nivel, h.faltam, h.somaNotas]),
    ).toEqual([
      ['Frontend', 1330, 3, 270, 13.3],
      ['Backend', 550, 2, 350, 5.5],
      ['DevOps', 380, 1, 20, 3.8],
      ['Dados', 260, 1, 140, 2.6],
    ])
  })

  it('mantém as estatísticas da categoria', () => {
    const frontend = personagem.habilidades[0]
    expect(frontend).toMatchObject({ quantidade: 2, notaMedia: 6.7 })
  })
})

describe('casos de borda', () => {
  it('sem stacks: Recruta, nível 0 e listas vazias', () => {
    const personagem = calcularPersonagem([], { hoje })
    expect(personagem.classe.nome).toBe('Recruta')
    expect(personagem.titulo.nome).toBe('Iniciante')
    expect(personagem.progresso).toMatchObject({ xp: 0, nivel: 0, faltam: 100 })
    expect(personagem.totais).toEqual({ stacks: 0, evidencias: 0, seiPorSaber: 0 })
    expect(personagem.habilidades).toEqual([])
  })

  it('com uma stack de nota baixa o nível mínimo é 1', () => {
    const fraca = stackDoSeed('postgresql')
    fraca.dimensoes = { ...fraca.dimensoes, teoria: 0, pratica: 0, profundidade: 0 }
    const personagem = calcularPersonagem([fraca], { hoje })
    expect(personagem.progresso).toMatchObject({ xp: 0, nivel: 1, xpDoNivelAtual: 0 })
    expect(habilidadesPorCategoria([fraca], { hoje })[0].nivel).toBe(1)
  })

  it('duas categorias com a mesma soma viram multiclasse', () => {
    const personagem = calcularPersonagem(
      [comCategoria('react', 'Frontend'), comCategoria('react', 'Backend', 'react-2')],
      { hoje },
    )
    expect(personagem.classe.nome).toBe('Multiclasse: Backend / Frontend')
  })
})
