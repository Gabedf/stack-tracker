import { describe, expect, it } from 'vitest'
import { StackSchema, parseStacksFile } from './schema'
import type { Stack, StacksFile } from './types'

function stackValida(sobrescrever: Partial<Stack> = {}): Stack {
  return {
    id: 'react',
    nome: 'React',
    categoria: 'Frontend',
    tags: ['ui', 'spa'],
    dimensoes: { teoria: 8, pratica: 7, profundidade: 6, ultimoUso: '2026-09-30' },
    experiencia: { tipo: 'producao', meses: 24 },
    evidencias: [
      {
        titulo: 'Painel interno',
        url: 'https://github.com/exemplo/painel',
        descricao: 'Dashboard em React',
        tipo: 'repo',
      },
      { titulo: 'Certificado', descricao: 'Curso online', tipo: 'certificado' },
    ],
    historico: [
      {
        data: '2026-01-15',
        dimensoes: { teoria: 6, pratica: 5, profundidade: 4, ultimoUso: '2026-01-10' },
        nota: 5.2,
      },
    ],
    notas: 'Uso diário no trabalho.',
    ...sobrescrever,
  }
}

function arquivo(stacks: unknown[]): unknown {
  return { versao: 1, stacks }
}

function errosDe(input: unknown): string[] {
  const resultado = parseStacksFile(input)
  if (resultado.ok) throw new Error('esperava falha na validação')
  return resultado.erros
}

describe('StackSchema', () => {
  it('aceita uma stack válida', () => {
    expect(StackSchema.safeParse(stackValida()).success).toBe(true)
  })

  it('aceita stack sem campos opcionais (notas, url)', () => {
    const semNotas: Partial<Stack> = stackValida({
      evidencias: [{ titulo: 'Projeto', descricao: '', tipo: 'projeto' }],
    })
    delete semNotas.notas
    expect(StackSchema.safeParse(semNotas).success).toBe(true)
  })

  it('aplica trim em nome e categoria', () => {
    const r = StackSchema.safeParse(stackValida({ nome: '  React  ', categoria: ' Frontend ' }))
    expect(r.success && r.data.nome).toBe('React')
    expect(r.success && r.data.categoria).toBe('Frontend')
  })
})

describe('parseStacksFile', () => {
  it('aceita um arquivo válido', () => {
    const entrada: StacksFile = {
      versao: 1,
      stacks: [stackValida(), stackValida({ id: 'ts', nome: 'TypeScript' })],
    }
    const r = parseStacksFile(entrada)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.dados).toEqual(entrada)
  })

  it('aceita arquivo sem stacks', () => {
    expect(parseStacksFile({ versao: 1, stacks: [] }).ok).toBe(true)
  })

  it.each([-0.1, 10.5, 11])('rejeita nota de dimensão fora de 0-10 (%s)', (valor) => {
    const stack = stackValida()
    stack.dimensoes.teoria = valor
    expect(errosDe(arquivo([stack]))).toEqual([
      'stacks[0].dimensoes.teoria: Deve ser um número entre 0 e 10.',
    ])
  })

  it('rejeita nota do histórico fora de 0-10', () => {
    const stack = stackValida()
    stack.historico[0].nota = 12
    expect(errosDe(arquivo([stack]))).toEqual([
      'stacks[0].historico[0].nota: Deve ser um número entre 0 e 10.',
    ])
  })

  it('rejeita enum inválido em experiência e evidência', () => {
    const stack = {
      ...stackValida(),
      experiencia: { tipo: 'hobby', meses: 3 },
      evidencias: [{ titulo: 'X', descricao: '', tipo: 'blog' }],
    }
    const erros = errosDe(arquivo([stack]))
    expect(erros).toHaveLength(2)
    expect(erros[0]).toMatch(
      /^stacks\[0\]\.experiencia\.tipo: Valor inválido: use um de "so_teoria"/,
    )
    expect(erros[1]).toMatch(/^stacks\[0\]\.evidencias\[0\]\.tipo: Valor inválido/)
  })

  it.each(['2026-13-01', '2026-02-30', '30/09/2026', '2026-9-1', ''])(
    'rejeita data inválida (%j)',
    (data) => {
      const stack = stackValida()
      stack.dimensoes.ultimoUso = data
      expect(errosDe(arquivo([stack]))).toEqual([
        'stacks[0].dimensoes.ultimoUso: Data inválida: use o formato AAAA-MM-DD.',
      ])
    },
  )

  it.each(['github.com/exemplo', 'nao é url', 'javascript:alert(1)', ''])(
    'rejeita url inválida (%j)',
    (url) => {
      const stack = stackValida()
      stack.evidencias[0].url = url
      expect(errosDe(arquivo([stack]))).toEqual([
        'stacks[0].evidencias[0].url: URL inválida: use um endereço http(s) completo.',
      ])
    },
  )

  it('rejeita campos obrigatórios faltando', () => {
    const incompleta: Partial<Stack> = stackValida()
    delete incompleta.nome
    delete incompleta.dimensoes
    const erros = errosDe(arquivo([incompleta]))
    expect(erros).toContain('stacks[0].nome: Campo obrigatório ausente.')
    expect(erros).toContain('stacks[0].dimensoes: Campo obrigatório ausente.')
  })

  it('rejeita arquivo sem a lista de stacks', () => {
    expect(errosDe({ versao: 1 })).toEqual(['stacks: Campo obrigatório ausente.'])
  })

  it('rejeita nome, categoria e tags vazios (após trim)', () => {
    const erros = errosDe(arquivo([stackValida({ nome: '   ', categoria: '', tags: ['ok', ' '] })]))
    expect(erros).toEqual([
      'stacks[0].nome: O nome não pode ficar vazio.',
      'stacks[0].categoria: A categoria não pode ficar vazia.',
      'stacks[0].tags[1]: A tag não pode ficar vazia.',
    ])
  })

  it('rejeita meses negativo ou fracionário', () => {
    const negativo = stackValida({ experiencia: { tipo: 'estudo', meses: -1 } })
    const fracionario = stackValida({ id: 'b', experiencia: { tipo: 'estudo', meses: 1.5 } })
    expect(errosDe(arquivo([negativo, fracionario]))).toEqual([
      'stacks[0].experiencia.meses: Meses não pode ser negativo.',
      'stacks[1].experiencia.meses: Meses deve ser um número inteiro.',
    ])
  })

  it('rejeita tipo errado com mensagem amigável', () => {
    const stack = { ...stackValida(), tags: 'ui' }
    expect(errosDe(arquivo([stack]))).toEqual([
      'stacks[0].tags: Tipo inválido: esperado uma lista.',
    ])
  })

  it('rejeita ids duplicados', () => {
    const erros = errosDe(arquivo([stackValida(), stackValida({ nome: 'Outra' })]))
    expect(erros).toEqual(['stacks[1].id: Id duplicado: "react" já é usado por outra stack.'])
  })

  it.each([2, 0, '1', undefined])('rejeita versão errada (%j)', (versao) => {
    expect(errosDe({ versao, stacks: [] })).toEqual([
      'versao: Versão do arquivo não suportada (esperado 1).',
    ])
  })

  it.each([null, undefined, 'texto', 42, true, []])(
    'rejeita entrada não-objeto (%j)',
    (entrada) => {
      expect(errosDe(entrada)).toEqual([
        'O arquivo deve ser um objeto JSON com "versao" e "stacks".',
      ])
    },
  )

  it('não lança exceção com entradas estranhas', () => {
    expect(() => parseStacksFile({ versao: 1, stacks: [null, 1, 'x'] })).not.toThrow()
    expect(parseStacksFile({ versao: 1, stacks: [null] }).ok).toBe(false)
  })
})
