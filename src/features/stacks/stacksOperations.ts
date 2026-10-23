/**
 * Operações puras sobre o StacksFile: adicionar, atualizar e remover stacks.
 * Sem React e sem I/O; nunca mutam a entrada. O provider usa estas funções
 * para calcular o próximo estado antes de persistir.
 */

import { paraDataISO, registrarSnapshot } from '../../domain/history'
import type { Dimensoes, Experiencia, Stack, StacksFile } from '../../domain/types'

export interface OpcoesOperacao {
  /** Data de referência para snapshot e defaults (default: agora). */
  hoje?: Date
}

/** Dados para criar uma stack: só nome e categoria são obrigatórios. */
export type NovaStack = Pick<Stack, 'nome' | 'categoria'> &
  Partial<Pick<Stack, 'tags' | 'evidencias' | 'notas'>> & {
    dimensoes?: Partial<Dimensoes>
    experiencia?: Partial<Experiencia>
  }

/** Mudanças parciais; dimensoes e experiencia são mescladas campo a campo. */
export type MudancasStack = Partial<
  Pick<Stack, 'nome' | 'categoria' | 'tags' | 'evidencias' | 'notas'>
> & {
  dimensoes?: Partial<Dimensoes>
  experiencia?: Partial<Experiencia>
}

export type AtualizacaoStack = MudancasStack | ((stack: Stack) => Stack)

export interface ResultadoOperacao {
  /** Próximo StacksFile. */
  dados: StacksFile
  /** Stack criada, atualizada ou removida. */
  stack: Stack
}

/** Falha de uso das operações (ex.: id inexistente, campo obrigatório vazio). */
export class OperacaoStacksError extends Error {
  constructor(mensagem: string) {
    super(mensagem)
    this.name = 'OperacaoStacksError'
  }
}

/** Slug ASCII minúsculo: "Node.js & Deno" -> "node-js-deno". */
export function gerarSlug(texto: string): string {
  const slug = texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'stack'
}

/** Id a partir do nome, único entre os existentes (sufixos -2, -3...). */
export function gerarIdUnico(nome: string, idsExistentes: Iterable<string>): string {
  const usados = new Set(idsExistentes)
  const base = gerarSlug(nome)
  if (!usados.has(base)) return base
  let n = 2
  while (usados.has(`${base}-${n}`)) n++
  return `${base}-${n}`
}

function textoObrigatorio(valor: string, campo: string): string {
  const limpo = valor.trim()
  if (!limpo) throw new OperacaoStacksError(`O campo "${campo}" é obrigatório.`)
  return limpo
}

function indiceDe(dados: StacksFile, id: string): number {
  const indice = dados.stacks.findIndex((s) => s.id === id)
  if (indice === -1) throw new OperacaoStacksError(`Stack "${id}" não encontrada.`)
  return indice
}

/** Monta uma stack completa com defaults e o snapshot inicial. */
export function criarStack(
  dados: NovaStack,
  idsExistentes: Iterable<string>,
  opcoes: OpcoesOperacao = {},
): Stack {
  const hoje = opcoes.hoje ?? new Date()
  const nome = textoObrigatorio(dados.nome, 'nome')
  const categoria = textoObrigatorio(dados.categoria, 'categoria')

  const stack: Stack = {
    id: gerarIdUnico(nome, idsExistentes),
    nome,
    categoria,
    tags: dados.tags ? [...dados.tags] : [],
    dimensoes: {
      teoria: 0,
      pratica: 0,
      profundidade: 0,
      ultimoUso: paraDataISO(hoje),
      ...dados.dimensoes,
    },
    experiencia: { tipo: 'so_teoria', meses: 0, ...dados.experiencia },
    evidencias: dados.evidencias ? dados.evidencias.map((e) => ({ ...e })) : [],
    historico: [],
    ...(dados.notas !== undefined && { notas: dados.notas }),
  }
  return registrarSnapshot(stack, { hoje })
}

/** Ids que colidiriam com rotas fixas (ex.: /stacks/nova). */
export const IDS_RESERVADOS: readonly string[] = ['nova']

export function adicionarStack(
  dados: StacksFile,
  nova: NovaStack,
  opcoes: OpcoesOperacao = {},
): ResultadoOperacao {
  const stack = criarStack(nova, [...dados.stacks.map((s) => s.id), ...IDS_RESERVADOS], opcoes)
  return { dados: { ...dados, stacks: [...dados.stacks, stack] }, stack }
}

function aplicarMudancas(stack: Stack, mudancas: MudancasStack): Stack {
  const { dimensoes, experiencia, ...resto } = mudancas
  return {
    ...stack,
    ...resto,
    dimensoes: { ...stack.dimensoes, ...dimensoes },
    experiencia: { ...stack.experiencia, ...experiencia },
  }
}

/**
 * Aplica mudanças (objeto parcial ou função) e registra snapshot se nota ou
 * dimensões mudaram. O id é preservado mesmo que a função tente alterá-lo.
 */
export function atualizarStack(
  dados: StacksFile,
  id: string,
  atualizacao: AtualizacaoStack,
  opcoes: OpcoesOperacao = {},
): ResultadoOperacao {
  const indice = indiceDe(dados, id)
  const atual = dados.stacks[indice]
  const alterada =
    typeof atualizacao === 'function' ? atualizacao(atual) : aplicarMudancas(atual, atualizacao)
  const stack = registrarSnapshot(
    {
      ...alterada,
      id,
      nome: textoObrigatorio(alterada.nome, 'nome'),
      categoria: textoObrigatorio(alterada.categoria, 'categoria'),
    },
    { hoje: opcoes.hoje ?? new Date() },
  )
  const stacks = dados.stacks.map((s, i) => (i === indice ? stack : s))
  return { dados: { ...dados, stacks }, stack }
}

export function removerStack(dados: StacksFile, id: string): ResultadoOperacao {
  const indice = indiceDe(dados, id)
  return {
    dados: { ...dados, stacks: dados.stacks.filter((_, i) => i !== indice) },
    stack: dados.stacks[indice],
  }
}
