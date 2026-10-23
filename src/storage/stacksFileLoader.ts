/**
 * Carrega o conteúdo textual de um arquivo de stacks (ex.: data/stacks.json
 * ou um JSON importado pelo usuário). Nunca lança: erros de sintaxe e de
 * schema voltam como mensagens amigáveis em português.
 */

import { parseStacksFile, type ResultadoParse } from '../domain/schema'
import type { StacksFile } from '../domain/types'

export function carregarStacksFile(texto: string): ResultadoParse<StacksFile> {
  if (texto.trim() === '') {
    return { ok: false, erros: ['O arquivo está vazio.'] }
  }

  let dados: unknown
  try {
    dados = JSON.parse(texto)
  } catch (erro) {
    const detalhe = erro instanceof Error ? ` (${erro.message})` : ''
    return {
      ok: false,
      erros: [`O arquivo não é um JSON válido${detalhe}. Verifique vírgulas, aspas e chaves.`],
    }
  }

  return parseStacksFile(dados)
}
