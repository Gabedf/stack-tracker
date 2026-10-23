import { describe, expect, it } from 'vitest'
import { stackDoSeed } from '../../test/seed'
import {
  paraDados,
  primeiroCampoInvalido,
  separarTags,
  stackDePreview,
  validarStackForm,
  valoresIniciais,
} from './stackFormModel'

const HOJE = new Date(2026, 9, 23)

describe('separarTags', () => {
  it('limpa espaços, vazios e repetidas', () => {
    expect(separarTags(' ui ,spa,, ui , hooks ,')).toEqual(['ui', 'spa', 'hooks'])
    expect(separarTags('   ')).toEqual([])
  })
})

describe('valoresIniciais', () => {
  it('em branco usa hoje como último uso', () => {
    const v = valoresIniciais(undefined, HOJE)
    expect(v).toMatchObject({ nome: '', categoria: '', ultimoUso: '2026-10-23', meses: '0' })
  })

  it('a partir de uma stack preenche todos os campos', () => {
    const react = stackDoSeed('react')
    const v = valoresIniciais(react, HOJE)
    expect(v.nome).toBe('React')
    expect(v.tags).toBe('ui, spa, hooks')
    expect(v.teoria).toBe(react.dimensoes.teoria)
    expect(v.tipoExperiencia).toBe('producao')
    expect(v.meses).toBe('36')
  })
})

describe('validarStackForm', () => {
  const validos = () => ({
    ...valoresIniciais(undefined, HOJE),
    nome: '  Vue ',
    categoria: 'Frontend',
    tags: 'ui, spa',
    pratica: 6.5,
    meses: '12',
    notas: 'Composition API',
  })

  it('aceita valores válidos e devolve dados de domínio limpos', () => {
    const r = validarStackForm(validos())
    expect(r).toEqual({
      ok: true,
      dados: {
        nome: 'Vue',
        categoria: 'Frontend',
        tags: ['ui', 'spa'],
        dimensoes: { teoria: 0, pratica: 6.5, profundidade: 0, ultimoUso: '2026-10-23' },
        experiencia: { tipo: 'so_teoria', meses: 12 },
        notas: 'Composition API',
      },
    })
  })

  it('notas só com espaços viram undefined', () => {
    expect(paraDados({ ...validos(), notas: '   ' }).notas).toBeUndefined()
  })

  it('mapeia erros para os campos da tela', () => {
    const r = validarStackForm({
      ...validos(),
      nome: ' ',
      categoria: '',
      ultimoUso: '',
      meses: '-1',
    })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.erros).toEqual({
      nome: 'O nome não pode ficar vazio.',
      categoria: 'A categoria não pode ficar vazia.',
      ultimoUso: 'Data inválida: use o formato AAAA-MM-DD.',
      meses: 'Meses não pode ser negativo.',
    })
    expect(primeiroCampoInvalido(r.erros)).toBe('nome')
  })

  it('meses vazio ou fracionário é inválido', () => {
    const vazio = validarStackForm({ ...validos(), meses: '' })
    expect(!vazio.ok && vazio.erros.meses).toBe('Informe um número.')
    const fracao = validarStackForm({ ...validos(), meses: '1.5' })
    expect(!fracao.ok && fracao.erros.meses).toBe('Meses deve ser um número inteiro.')
  })
})

describe('stackDePreview', () => {
  it('mantém id e evidências da stack editada', () => {
    const react = stackDoSeed('react')
    const preview = stackDePreview({ ...valoresIniciais(react, HOJE), meses: '' }, react)
    expect(preview.id).toBe('react')
    expect(preview.evidencias).toBe(react.evidencias)
    expect(preview.experiencia.meses).toBe(0)
  })
})
