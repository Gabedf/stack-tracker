import { describe, expect, it } from 'vitest'
import { calcularNota } from '../../domain/scoring'
import type { Stack, StacksFile } from '../../domain/types'
import { HOJE_SEED, stacksDoSeed } from '../../test/seed'
import { calcularPersonagem } from './character'
import { detectarLevelUps, mensagemDoLevelUp, type EventoLevelUp } from './levelUp'

const hoje = HOJE_SEED
const HOJE_ISO = '2026-10-23'

/** Stack com as três dimensões iguais a `valor`, sem evidências nem decaimento: nota = 0,9 × valor. */
function stack(id: string, valor: number, nome = id.toUpperCase()): Stack {
  return {
    id,
    nome,
    categoria: 'Frontend',
    tags: [],
    dimensoes: { teoria: valor, pratica: valor, profundidade: valor, ultimoUso: HOJE_ISO },
    experiencia: { tipo: 'estudo', meses: 1 },
    evidencias: [],
    historico: [],
  }
}

const arquivo = (stacks: Stack[]): StacksFile => ({ versao: 1, stacks })
const soStacks = (eventos: EventoLevelUp[]) => eventos.filter((e) => e.tipo === 'stack')
const resumo = (eventos: EventoLevelUp[]) =>
  eventos.map((e) =>
    e.tipo === 'stack' ? `${e.id}:${e.de.id}->${e.para.id}` : `personagem:${e.de}->${e.para}`,
  )

describe('detectarLevelUps', () => {
  it('a fixture tem as notas esperadas (0,9 × valor)', () => {
    const notas = [3, 5, 7, 10].map((v) => calcularNota(stack('x', v), { hoje }))
    expect(notas).toEqual([2.7, 4.5, 6.3, 9])
  })

  it('stack que sobe uma faixa gera evento com de/para e nome', () => {
    const eventos = detectarLevelUps([stack('react', 5, 'React')], [stack('react', 7, 'React')], {
      hoje,
    })
    expect(soStacks(eventos)).toEqual([
      {
        tipo: 'stack',
        id: 'react',
        nome: 'React',
        de: expect.objectContaining({ id: 'praticante', nome: 'Praticante' }),
        para: expect.objectContaining({ id: 'senior', nome: 'Sênior' }),
      },
    ])
    expect(mensagemDoLevelUp(soStacks(eventos)[0])).toBe('Subiu para Sênior!')
  })

  it('cruzar duas faixas gera um só evento, da faixa inicial à final', () => {
    const eventos = detectarLevelUps([stack('a', 3)], [stack('a', 7)], { hoje })
    expect(resumo(soStacks(eventos))).toEqual(['a:aprendiz->senior'])
  })

  it('sem mudança de faixa não gera evento', () => {
    const antes = [stack('a', 5), stack('b', 7)]
    expect(detectarLevelUps(antes, structuredClone(antes), { hoje })).toEqual([])
    // A nota muda, mas a faixa (Praticante) e o nível do personagem (2) continuam.
    expect(detectarLevelUps([stack('a', 5)], [stack('a', 5.5)], { hoje })).toEqual([])
  })

  it('queda de faixa ou de nível não gera evento', () => {
    const antes = [stack('a', 10), stack('b', 7)]
    const depois = [stack('a', 3), stack('b', 7)]
    expect(detectarLevelUps(antes, depois, { hoje })).toEqual([])
  })

  it('stack removida não gera evento', () => {
    expect(detectarLevelUps([stack('a', 7), stack('b', 7)], [stack('a', 7)], { hoje })).toEqual([])
  })

  it('stack nova não gera evento de stack, mas pode subir o personagem', () => {
    const antes = [stack('a', 7)] // 630 XP: nível 2
    const depois = [stack('a', 7), stack('b', 10)] // 1530 XP: nível 3
    expect(resumo(detectarLevelUps(antes, depois, { hoje }))).toEqual(['personagem:2->3'])
  })

  it('primeira stack: o personagem sai do nível 0', () => {
    expect(resumo(detectarLevelUps([], [stack('a', 3)], { hoje }))).toEqual(['personagem:0->1'])
  })

  it('o personagem vem depois dos eventos de stack', () => {
    const antes = [stack('a', 5), stack('b', 5)] // 900 XP: nível 3
    const depois = [stack('a', 10), stack('b', 7)] // 1530 XP: nível 3
    expect(resumo(detectarLevelUps(antes, depois, { hoje }))).toEqual([
      'a:praticante->mestre',
      'b:praticante->senior',
    ])

    const maisXp = [stack('a', 10), stack('b', 10)] // 1800 XP: nível 4
    const eventos = detectarLevelUps(antes, maisXp, { hoje })
    expect(resumo(eventos)).toEqual([
      'a:praticante->mestre',
      'b:praticante->mestre',
      'personagem:3->4',
    ])
    expect(mensagemDoLevelUp(eventos[2])).toBe('Personagem subiu para o nível 4!')
  })

  it('aceita StacksFile e usa o mesmo nível da ficha', () => {
    const seed = stacksDoSeed()
    const turbinado = seed.map((s) => ({
      ...s,
      dimensoes: { teoria: 10, pratica: 10, profundidade: 10, ultimoUso: HOJE_ISO },
    }))
    const eventos = detectarLevelUps(arquivo(seed), arquivo(turbinado), { hoje })
    expect(eventos.find((e) => e.tipo === 'personagem')).toEqual({
      tipo: 'personagem',
      de: calcularPersonagem(seed, { hoje }).progresso.nivel,
      para: calcularPersonagem(turbinado, { hoje }).progresso.nivel,
    })
    expect(soStacks(eventos).length).toBeGreaterThan(0)
    expect(soStacks(eventos).every((e) => e.tipo === 'stack' && e.para.id === 'mestre')).toBe(true)
  })
})
