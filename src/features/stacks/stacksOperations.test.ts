import { describe, expect, it } from 'vitest'
import { parseStacksFile } from '../../domain/schema'
import type { Stack, StacksFile } from '../../domain/types'
import {
  OperacaoStacksError,
  adicionarStack,
  atualizarStack,
  criarStack,
  gerarIdUnico,
  gerarSlug,
  removerStack,
} from './stacksOperations'

const HOJE = new Date(2026, 9, 15, 10, 0)
const AMANHA = new Date(2026, 9, 16, 9, 0)

function arquivo(stacks: Stack[] = []): StacksFile {
  return { versao: 1, stacks }
}

function congelarFundo<T>(valor: T): T {
  if (valor && typeof valor === 'object') {
    Object.values(valor).forEach(congelarFundo)
    Object.freeze(valor)
  }
  return valor
}

describe('gerarSlug', () => {
  it.each([
    ['TypeScript', 'typescript'],
    ['Node.js & Deno', 'node-js-deno'],
    ['  Programação Funcional  ', 'programacao-funcional'],
    ['C#', 'c'],
    ['!!!', 'stack'],
  ])('%j -> %j', (entrada, esperado) => {
    expect(gerarSlug(entrada)).toBe(esperado)
  })
})

describe('gerarIdUnico', () => {
  it('usa o slug quando livre', () => {
    expect(gerarIdUnico('React', ['vue'])).toBe('react')
  })

  it('adiciona sufixo -2, -3... quando já existe', () => {
    expect(gerarIdUnico('React', ['react'])).toBe('react-2')
    expect(gerarIdUnico('React', ['react', 'react-2'])).toBe('react-3')
  })
})

describe('criarStack', () => {
  it('aplica defaults sensatos e cria o snapshot inicial', () => {
    const stack = criarStack({ nome: ' Go ', categoria: 'Linguagens' }, [], { hoje: HOJE })

    expect(stack).toEqual({
      id: 'go',
      nome: 'Go',
      categoria: 'Linguagens',
      tags: [],
      dimensoes: { teoria: 0, pratica: 0, profundidade: 0, ultimoUso: '2026-10-15' },
      experiencia: { tipo: 'so_teoria', meses: 0 },
      evidencias: [],
      historico: [
        {
          data: '2026-10-15',
          dimensoes: { teoria: 0, pratica: 0, profundidade: 0, ultimoUso: '2026-10-15' },
          nota: 0,
        },
      ],
    })
    expect(parseStacksFile(arquivo([stack])).ok).toBe(true)
  })

  it('mescla dimensões e experiência parciais informadas', () => {
    const stack = criarStack(
      {
        nome: 'Go',
        categoria: 'Linguagens',
        tags: ['backend'],
        dimensoes: { pratica: 7 },
        experiencia: { meses: 3 },
        notas: 'obs',
      },
      [],
      { hoje: HOJE },
    )

    expect(stack.dimensoes).toEqual({
      teoria: 0,
      pratica: 7,
      profundidade: 0,
      ultimoUso: '2026-10-15',
    })
    expect(stack.experiencia).toEqual({ tipo: 'so_teoria', meses: 3 })
    expect(stack.tags).toEqual(['backend'])
    expect(stack.notas).toBe('obs')
    expect(stack.historico[0].nota).toBeGreaterThan(0)
  })

  it('rejeita nome ou categoria vazios', () => {
    expect(() => criarStack({ nome: '  ', categoria: 'X' }, [])).toThrow(OperacaoStacksError)
    expect(() => criarStack({ nome: 'X', categoria: '' }, [])).toThrow(/categoria/)
  })
})

describe('adicionarStack', () => {
  it('anexa a nova stack com id único sem mutar a entrada', () => {
    const base = adicionarStack(arquivo(), { nome: 'React', categoria: 'Front' }, { hoje: HOJE })
    const dados = congelarFundo(base.dados)

    const { dados: proximo, stack } = adicionarStack(
      dados,
      { nome: 'React', categoria: 'Front' },
      { hoje: HOJE },
    )

    expect(stack.id).toBe('react-2')
    expect(proximo.stacks.map((s) => s.id)).toEqual(['react', 'react-2'])
    expect(dados.stacks).toHaveLength(1)
    expect(parseStacksFile(proximo).ok).toBe(true)
  })

  it('não gera ids reservados por rotas (ex.: "nova")', () => {
    const { stack } = adicionarStack(arquivo(), { nome: 'Nova', categoria: 'X' }, { hoje: HOJE })
    expect(stack.id).toBe('nova-2')
  })
})

describe('atualizarStack', () => {
  const inicial = congelarFundo(
    adicionarStack(arquivo(), { nome: 'React', categoria: 'Front' }, { hoje: HOJE }).dados,
  )

  it('sem mudança de nota/dimensões não gera snapshot', () => {
    const { dados, stack } = atualizarStack(
      inicial,
      'react',
      { tags: ['ui'], notas: 'x' },
      { hoje: AMANHA },
    )

    expect(stack.tags).toEqual(['ui'])
    expect(stack.historico).toBe(inicial.stacks[0].historico)
    expect(dados.stacks[0]).toBe(stack)
  })

  it('mudança de dimensões gera snapshot (mesclando campos)', () => {
    const { stack } = atualizarStack(
      inicial,
      'react',
      { dimensoes: { pratica: 8 } },
      { hoje: AMANHA },
    )

    expect(stack.dimensoes).toEqual({ ...inicial.stacks[0].dimensoes, pratica: 8 })
    expect(stack.historico).toHaveLength(2)
    expect(stack.historico[1].data).toBe('2026-10-16')
  })

  it('aceita função atualizadora e preserva o id', () => {
    const { stack } = atualizarStack(
      inicial,
      'react',
      (s) => ({ ...s, id: 'outro', nome: 'React 19' }),
      { hoje: AMANHA },
    )

    expect(stack.id).toBe('react')
    expect(stack.nome).toBe('React 19')
  })

  it('preserva a ordem e as demais stacks', () => {
    const dois = adicionarStack(inicial, { nome: 'Vue', categoria: 'Front' }, { hoje: HOJE }).dados
    const { dados } = atualizarStack(dois, 'react', { categoria: 'UI' }, { hoje: HOJE })

    expect(dados.stacks.map((s) => s.id)).toEqual(['react', 'vue'])
    expect(dados.stacks[1]).toBe(dois.stacks[1])
  })

  it('falha para id inexistente ou nome vazio', () => {
    expect(() => atualizarStack(inicial, 'nada', {})).toThrow(OperacaoStacksError)
    expect(() => atualizarStack(inicial, 'react', { nome: ' ' })).toThrow(/nome/)
  })
})

describe('removerStack', () => {
  it('remove pelo id e devolve a stack removida', () => {
    const um = adicionarStack(arquivo(), { nome: 'A', categoria: 'X' }, { hoje: HOJE }).dados
    const dois = congelarFundo(
      adicionarStack(um, { nome: 'B', categoria: 'X' }, { hoje: HOJE }).dados,
    )

    const { dados, stack } = removerStack(dois, 'a')

    expect(stack.id).toBe('a')
    expect(dados.stacks.map((s) => s.id)).toEqual(['b'])
    expect(dois.stacks).toHaveLength(2)
  })

  it('falha para id inexistente', () => {
    expect(() => removerStack(arquivo(), 'x')).toThrow(OperacaoStacksError)
  })
})
