import { describe, expect, it } from 'vitest'
import type { Stack, StacksFile } from '../../domain/types'
import { stacksDoSeed } from '../../test/seed'
import {
  aplicarImportacao,
  analisarImportacao,
  limitarErros,
  MAX_ERROS_EXIBIDOS,
  nomeArquivoExportacao,
  prepararExportacao,
  TAMANHO_MAXIMO_BYTES,
  verificarTamanho,
} from './importExport'

const ids = (stacks: readonly Stack[]) => stacks.map((s) => s.id)

function novaStack(id: string): Stack {
  return {
    id,
    nome: id.toUpperCase(),
    categoria: 'Frontend',
    tags: [],
    dimensoes: { teoria: 5, pratica: 5, profundidade: 5, ultimoUso: '2026-10-01' },
    experiencia: { tipo: 'estudo', meses: 2 },
    evidencias: [],
    historico: [],
  }
}

function texto(dados: unknown): string {
  return JSON.stringify(dados)
}

function erros(entrada: string, atuais: Stack[] = stacksDoSeed()): string[] {
  const resultado = analisarImportacao(entrada, atuais)
  if (resultado.ok) throw new Error('esperava erro')
  return resultado.erros
}

describe('prepararExportacao', () => {
  it('gera StacksFile versão 1 com 2 espaços e newline final', () => {
    const stacks = stacksDoSeed()
    const { texto: saida, total } = prepararExportacao(stacks, new Date(2026, 9, 23))
    expect(saida).toBe(`${JSON.stringify({ versao: 1, stacks }, null, 2)}\n`)
    expect(saida.startsWith('{\n  "versao": 1,\n  "stacks": [')).toBe(true)
    expect(saida.endsWith('}\n')).toBe(true)
    expect(total).toBe(stacks.length)
  })

  it('nomeia o arquivo com a data local AAAA-MM-DD', () => {
    expect(prepararExportacao([], new Date(2026, 0, 5, 23, 59)).nomeArquivo).toBe(
      'painel-stacks-2026-01-05.json',
    )
    expect(nomeArquivoExportacao(new Date(2026, 11, 31))).toBe('painel-stacks-2026-12-31.json')
  })

  it('lista vazia exporta um arquivo válido', () => {
    const { texto: saida, total } = prepararExportacao([], new Date(2026, 9, 23))
    expect(total).toBe(0)
    expect(JSON.parse(saida)).toEqual({ versao: 1, stacks: [] })
  })

  it('round-trip: o texto exportado reimporta idêntico e sem mudanças', () => {
    const stacks = stacksDoSeed()
    const resultado = analisarImportacao(prepararExportacao(stacks).texto, stacks)
    expect(resultado.ok).toBe(true)
    if (!resultado.ok) return
    expect(resultado.previa.arquivo).toEqual({ versao: 1, stacks })
    expect(resultado.previa.total).toBe(stacks.length)
    expect(ids(resultado.previa.inalteradas)).toEqual(ids(stacks))
    expect(resultado.previa.novas).toEqual([])
    expect(resultado.previa.substituidas).toEqual([])
    expect(resultado.previa.ausentes).toEqual([])
  })
})

describe('analisarImportacao: erros amigáveis', () => {
  it('texto vazio ou só espaços', () => {
    expect(erros('')).toEqual(['O arquivo está vazio.'])
    expect(erros('  \n ')).toEqual(['O arquivo está vazio.'])
  })

  it('JSON malformado', () => {
    const [mensagem] = erros('{"versao": 1, "stacks": [}')
    expect(mensagem).toMatch(/^O arquivo não é um JSON válido/)
    expect(mensagem).toMatch(/Verifique vírgulas, aspas e chaves\.$/)
  })

  it('raiz que não é objeto', () => {
    expect(erros('[]')).toEqual(['O arquivo deve ser um objeto JSON com "versao" e "stacks".'])
    expect(erros('42')).toEqual(['O arquivo deve ser um objeto JSON com "versao" e "stacks".'])
  })

  it('versão errada', () => {
    expect(erros(texto({ versao: 2, stacks: [] }))).toEqual([
      'versao: Versão do arquivo não suportada (esperado 1).',
    ])
  })

  it('schema inválido aponta o caminho do campo', () => {
    const stack = { ...novaStack('vue'), nome: '  ' }
    const lista = erros(texto({ versao: 1, stacks: [stack] }))
    expect(lista).toEqual(['stacks[0].nome: O nome não pode ficar vazio.'])
  })

  it('stacks ausente', () => {
    expect(erros(texto({ versao: 1 }))).toEqual(['stacks: Campo obrigatório ausente.'])
  })

  it('ids duplicados', () => {
    const lista = erros(texto({ versao: 1, stacks: [novaStack('vue'), novaStack('vue')] }))
    expect(lista).toEqual(['stacks[1].id: Id duplicado: "vue" já é usado por outra stack.'])
  })

  it('limita às 10 primeiras mensagens + "e mais N"', () => {
    const stacks = Array.from({ length: 13 }, (_, i) => ({ ...novaStack(`s${i}`), nome: '' }))
    const lista = erros(texto({ versao: 1, stacks }))
    expect(lista).toHaveLength(MAX_ERROS_EXIBIDOS + 1)
    expect(lista[0]).toBe('stacks[0].nome: O nome não pode ficar vazio.')
    expect(lista.at(-1)).toBe('… e mais 3 erros.')
  })

  it('arquivo grande demais é recusado antes de ler o JSON', () => {
    const grande = `{"versao":1,"stacks":[],"x":"${'a'.repeat(TAMANHO_MAXIMO_BYTES)}"}`
    const lista = erros(grande)
    expect(lista).toHaveLength(1)
    expect(lista[0]).toMatch(/passa do limite de 2,0 MB/)
  })
})

describe('verificarTamanho e limitarErros', () => {
  it('aceita até o limite e recusa acima', () => {
    expect(verificarTamanho(TAMANHO_MAXIMO_BYTES)).toBeNull()
    expect(verificarTamanho(TAMANHO_MAXIMO_BYTES + 1)).toMatch(/^O arquivo tem 2,0 MB/)
    expect(verificarTamanho(3 * 1024 * 1024)).toBe(
      'O arquivo tem 3,0 MB e passa do limite de 2,0 MB. Exporte de novo ou divida o arquivo.',
    )
  })

  it('não mexe em listas curtas e usa singular para 1 restante', () => {
    expect(limitarErros(['a', 'b'])).toEqual(['a', 'b'])
    const onze = Array.from({ length: 11 }, (_, i) => `e${i}`)
    expect(limitarErros(onze).at(-1)).toBe('… e mais 1 erro.')
  })
})

describe('analisarImportacao: prévia', () => {
  it('conta novas, substituídas, inalteradas e ausentes', () => {
    const atuais = stacksDoSeed()
    const [primeira, segunda] = atuais
    // Mesma stack com chaves em outra ordem continua inalterada.
    const reordenada = Object.fromEntries(Object.entries(primeira).reverse())
    const alterada = { ...segunda, nome: `${segunda.nome} (editado)` }
    const resultado = analisarImportacao(
      texto({ stacks: [reordenada, alterada, novaStack('vue')], versao: 1 }),
      atuais,
    )

    expect(resultado.ok).toBe(true)
    if (!resultado.ok) return
    const { previa } = resultado
    expect(previa.total).toBe(3)
    expect(ids(previa.inalteradas)).toEqual([primeira.id])
    expect(ids(previa.substituidas)).toEqual([segunda.id])
    expect(ids(previa.novas)).toEqual(['vue'])
    expect(ids(previa.ausentes)).toEqual(ids(atuais.slice(2)))
  })

  it('arquivo sem stacks: todas as atuais ficam ausentes', () => {
    const atuais = stacksDoSeed()
    const resultado = analisarImportacao(texto({ versao: 1, stacks: [] }), atuais)
    expect(resultado.ok && resultado.previa.total).toBe(0)
    expect(resultado.ok && ids(resultado.previa.ausentes)).toEqual(ids(atuais))
  })

  it('painel vazio: tudo é novo', () => {
    const resultado = analisarImportacao(texto({ versao: 1, stacks: stacksDoSeed() }), [])
    expect(resultado.ok && resultado.previa.novas).toHaveLength(stacksDoSeed().length)
  })
})

describe('aplicarImportacao', () => {
  const atuais = () => stacksDoSeed().slice(0, 3)
  const importado = (): StacksFile => {
    const [, segunda] = stacksDoSeed()
    return { versao: 1, stacks: [novaStack('vue'), { ...segunda, nome: 'Trocada' }] }
  }

  it('substituir fica só com o arquivo', () => {
    const resultado = aplicarImportacao(atuais(), importado(), 'substituir')
    expect(resultado).toEqual({ ok: true, dados: importado() })
  })

  it('mesclar casa por id (arquivo vence), mantém as demais e acrescenta as novas no fim', () => {
    const [a, b, c] = atuais()
    const resultado = aplicarImportacao(atuais(), importado(), 'mesclar')
    expect(resultado.ok).toBe(true)
    if (!resultado.ok) return
    expect(ids(resultado.dados.stacks)).toEqual([a.id, b.id, c.id, 'vue'])
    expect(resultado.dados.stacks[0]).toEqual(a)
    expect(resultado.dados.stacks[1]).toEqual({ ...b, nome: 'Trocada' })
    expect(resultado.dados.stacks[2]).toEqual(c)
    expect(resultado.dados.versao).toBe(1)
  })

  it('não altera as entradas', () => {
    const lista = atuais()
    const arquivo = importado()
    const copiaLista = structuredClone(lista)
    const copiaArquivo = structuredClone(arquivo)
    aplicarImportacao(lista, arquivo, 'mesclar')
    aplicarImportacao(lista, arquivo, 'substituir')
    expect(lista).toEqual(copiaLista)
    expect(arquivo).toEqual(copiaArquivo)
  })

  it.each(['substituir', 'mesclar'] as const)('revalida o resultado com o schema (%s)', (modo) => {
    const invalido = {
      versao: 1,
      stacks: [{ ...novaStack('vue'), dimensoes: { ...novaStack('vue').dimensoes, teoria: 11 } }],
    } as StacksFile
    const resultado = aplicarImportacao(atuais(), invalido, modo)
    expect(resultado.ok).toBe(false)
    if (resultado.ok) return
    const indice = modo === 'substituir' ? 0 : 3
    expect(resultado.erros).toEqual([
      `stacks[${indice}].dimensoes.teoria: Deve ser um número entre 0 e 10.`,
    ])
  })

  it('mesclar com ids duplicados vindos de fora do schema é barrado', () => {
    const duplicado = { versao: 1, stacks: [novaStack('vue'), novaStack('vue')] } as StacksFile
    const resultado = aplicarImportacao([], duplicado, 'mesclar')
    expect(resultado.ok).toBe(false)
  })
})
