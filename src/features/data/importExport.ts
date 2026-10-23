/**
 * Exportar e importar o arquivo de stacks (JSON). Sem React.
 *
 * A importação nunca toca nos dados: analisarImportacao só lê e compara, e
 * aplicarImportacao devolve o próximo arquivo já revalidado pelo schema. Quem
 * salva é a UI, e só quando o resultado é válido.
 */

import { parseStacksFile, type ResultadoParse } from '../../domain/schema'
import { VERSAO_STACKS_FILE, type Stack, type StacksFile } from '../../domain/types'
import { carregarStacksFile } from '../../storage/stacksFileLoader'

/** Maior arquivo aceito na importação (2 MB). */
export const TAMANHO_MAXIMO_BYTES = 2 * 1024 * 1024

/** Quantos erros mostrar antes de resumir o resto em "e mais N". */
export const MAX_ERROS_EXIBIDOS = 10

/** Dica de formato mostrada junto dos erros. */
export const DICA_FORMATO = 'O arquivo precisa ter {"versao": 1, "stacks": [...]}.'

export type ModoImportacao = 'substituir' | 'mesclar'

export interface Exportacao {
  /** JSON com 2 espaços de indentação e newline final. */
  texto: string
  /** painel-stacks-AAAA-MM-DD.json (data local). */
  nomeArquivo: string
  total: number
}

export interface PreviaImportacao {
  /** Arquivo lido e validado. */
  arquivo: StacksFile
  /** Stacks no arquivo. */
  total: number
  /** No arquivo e não no painel. */
  novas: Stack[]
  /** No arquivo e no painel (mesmo id), com conteúdo diferente: o arquivo substitui. */
  substituidas: Stack[]
  /** No arquivo e no painel (mesmo id), idênticas. */
  inalteradas: Stack[]
  /** No painel e não no arquivo: removidas ao substituir tudo, mantidas ao mesclar. */
  ausentes: Stack[]
}

export type ResultadoAnalise =
  { ok: true; previa: PreviaImportacao } | { ok: false; erros: string[] }

function doisDigitos(n: number): string {
  return String(n).padStart(2, '0')
}

/** Nome do arquivo exportado, com a data local. */
export function nomeArquivoExportacao(hoje: Date = new Date()): string {
  const data = `${hoje.getFullYear()}-${doisDigitos(hoje.getMonth() + 1)}-${doisDigitos(hoje.getDate())}`
  return `painel-stacks-${data}.json`
}

/** Texto e nome do arquivo para baixar as stacks como StacksFile versão 1. */
export function prepararExportacao(stacks: readonly Stack[], hoje: Date = new Date()): Exportacao {
  const arquivo: StacksFile = { versao: VERSAO_STACKS_FILE, stacks: [...stacks] }
  return {
    texto: `${JSON.stringify(arquivo, null, 2)}\n`,
    nomeArquivo: nomeArquivoExportacao(hoje),
    total: stacks.length,
  }
}

/** Mostra só os primeiros erros e resume o resto. */
export function limitarErros(erros: readonly string[], max = MAX_ERROS_EXIBIDOS): string[] {
  if (erros.length <= max) return [...erros]
  const resto = erros.length - max
  return [...erros.slice(0, max), `… e mais ${resto} ${resto === 1 ? 'erro' : 'erros'}.`]
}

function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
}

/** Mensagem de erro se o tamanho passar do limite; null se couber. */
export function verificarTamanho(bytes: number, max = TAMANHO_MAXIMO_BYTES): string | null {
  if (bytes <= max) return null
  return `O arquivo tem ${formatarTamanho(bytes)} e passa do limite de ${formatarTamanho(max)}. Exporte de novo ou divida o arquivo.`
}

/** Igualdade estrutural que ignora a ordem das chaves e chaves com undefined. */
function iguais(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, i) => iguais(item, b[i]))
  }
  const ra = a as Record<string, unknown>
  const rb = b as Record<string, unknown>
  const chaves = new Set([...Object.keys(ra), ...Object.keys(rb)])
  for (const chave of chaves) {
    if (!iguais(ra[chave], rb[chave])) return false
  }
  return true
}

/**
 * Lê o texto de um arquivo importado e compara com as stacks atuais.
 * Nunca lança: erros (tamanho, sintaxe, schema) voltam como mensagens
 * amigáveis, limitadas às MAX_ERROS_EXIBIDOS primeiras.
 */
export function analisarImportacao(
  texto: string,
  stacksAtuais: readonly Stack[],
): ResultadoAnalise {
  const erroTamanho = verificarTamanho(new TextEncoder().encode(texto).length)
  if (erroTamanho) return { ok: false, erros: [erroTamanho] }

  const lido = carregarStacksFile(texto)
  if (!lido.ok) return { ok: false, erros: limitarErros(lido.erros) }

  const arquivo = lido.dados
  const atuaisPorId = new Map(stacksAtuais.map((s) => [s.id, s]))
  const idsArquivo = new Set(arquivo.stacks.map((s) => s.id))
  const previa: PreviaImportacao = {
    arquivo,
    total: arquivo.stacks.length,
    novas: [],
    substituidas: [],
    inalteradas: [],
    ausentes: stacksAtuais.filter((s) => !idsArquivo.has(s.id)),
  }
  for (const stack of arquivo.stacks) {
    const atual = atuaisPorId.get(stack.id)
    if (!atual) previa.novas.push(stack)
    else if (iguais(atual, stack)) previa.inalteradas.push(stack)
    else previa.substituidas.push(stack)
  }
  return { ok: true, previa }
}

/**
 * Próximo arquivo após importar. 'substituir' fica só com o arquivo;
 * 'mesclar' casa por id (o arquivo vence), mantém na posição as stacks que
 * não estão no arquivo e acrescenta as novas no fim. O resultado SEMPRE passa
 * de novo pelo schema: se não passar, volta como erro e nada deve ser salvo.
 */
export function aplicarImportacao(
  atual: readonly Stack[],
  importado: StacksFile,
  modo: ModoImportacao,
): ResultadoParse<StacksFile> {
  let stacks: Stack[]
  if (modo === 'substituir') {
    stacks = [...importado.stacks]
  } else {
    const doArquivo = new Map(importado.stacks.map((s) => [s.id, s]))
    const idsAtuais = new Set(atual.map((s) => s.id))
    stacks = [
      ...atual.map((s) => doArquivo.get(s.id) ?? s),
      ...importado.stacks.filter((s) => !idsAtuais.has(s.id)),
    ]
  }
  const resultado = parseStacksFile({ versao: VERSAO_STACKS_FILE, stacks })
  return resultado.ok ? resultado : { ok: false, erros: limitarErros(resultado.erros) }
}
