/**
 * Modelo do formulário de stack: valores de tela (strings e números soltos),
 * conversão para dados de domínio e validação com os schemas do domínio.
 * Sem React.
 */

import { z } from 'zod'
import { paraDataISO } from '../../domain/history'
import { StackSchema } from '../../domain/schema'
import type { Dimensoes, Experiencia, Stack, TipoExperiencia } from '../../domain/types'

/** Campos editáveis do formulário, na ordem em que aparecem na tela. */
export const CAMPOS_FORM = [
  'nome',
  'categoria',
  'tags',
  'teoria',
  'pratica',
  'profundidade',
  'ultimoUso',
  'tipoExperiencia',
  'meses',
  'notas',
] as const
export type CampoForm = (typeof CAMPOS_FORM)[number]

/** Estado bruto do formulário, como o usuário digita. */
export interface ValoresStackForm {
  nome: string
  categoria: string
  /** Tags separadas por vírgula. */
  tags: string
  teoria: number
  pratica: number
  profundidade: number
  ultimoUso: string
  tipoExperiencia: TipoExperiencia
  /** Texto do input numérico (pode estar vazio ou inválido). */
  meses: string
  notas: string
}

/** Dados validados que o formulário entrega (servem para criar ou atualizar). */
export interface DadosStackForm {
  nome: string
  categoria: string
  tags: string[]
  dimensoes: Dimensoes
  experiencia: Experiencia
  /** undefined quando vazio (na edição, apaga as notas existentes). */
  notas?: string
}

export type ErrosStackForm = Partial<Record<CampoForm, string>>

export type ResultadoValidacao =
  { ok: true; dados: DadosStackForm } | { ok: false; erros: ErrosStackForm }

export const StackFormSchema = StackSchema.pick({
  nome: true,
  categoria: true,
  tags: true,
  dimensoes: true,
  experiencia: true,
  notas: true,
})

/** "a, b ,, a" -> ["a", "b"]: sem espaços extras, vazios ou repetidas. */
export function separarTags(texto: string): string[] {
  const tags = texto
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
  return [...new Set(tags)]
}

/** Valores iniciais: a stack a editar ou um formulário em branco. */
export function valoresIniciais(inicial?: Stack, hoje: Date = new Date()): ValoresStackForm {
  if (!inicial) {
    return {
      nome: '',
      categoria: '',
      tags: '',
      teoria: 0,
      pratica: 0,
      profundidade: 0,
      ultimoUso: paraDataISO(hoje),
      tipoExperiencia: 'so_teoria',
      meses: '0',
      notas: '',
    }
  }
  return {
    nome: inicial.nome,
    categoria: inicial.categoria,
    tags: inicial.tags.join(', '),
    teoria: inicial.dimensoes.teoria,
    pratica: inicial.dimensoes.pratica,
    profundidade: inicial.dimensoes.profundidade,
    ultimoUso: inicial.dimensoes.ultimoUso,
    tipoExperiencia: inicial.experiencia.tipo,
    meses: String(inicial.experiencia.meses),
    notas: inicial.notas ?? '',
  }
}

/** Converte os valores de tela para o formato de domínio, sem validar. */
export function paraDados(valores: ValoresStackForm): DadosStackForm {
  const meses = valores.meses.trim() === '' ? Number.NaN : Number(valores.meses)
  const notas = valores.notas.trim()
  return {
    nome: valores.nome.trim(),
    categoria: valores.categoria.trim(),
    tags: separarTags(valores.tags),
    dimensoes: {
      teoria: valores.teoria,
      pratica: valores.pratica,
      profundidade: valores.profundidade,
      ultimoUso: valores.ultimoUso,
    },
    experiencia: { tipo: valores.tipoExperiencia, meses },
    notas: notas || undefined,
  }
}

/** Campo do formulário correspondente ao caminho de uma issue do Zod. */
function campoDoCaminho(caminho: readonly PropertyKey[]): CampoForm | undefined {
  const [raiz, sub] = caminho
  if (raiz === 'dimensoes' || raiz === 'experiencia') {
    if (sub === 'tipo') return 'tipoExperiencia'
    return CAMPOS_FORM.find((c) => c === sub)
  }
  return CAMPOS_FORM.find((c) => c === raiz)
}

const mapaErros: z.core.$ZodErrorMap = (issue) => {
  if (issue.code === 'invalid_type' && issue.expected === 'number') return 'Informe um número.'
  if (issue.code === 'invalid_value') return 'Escolha uma opção da lista.'
  return undefined
}

/** Valida os valores do formulário; erros vêm por campo (o primeiro de cada um). */
export function validarStackForm(valores: ValoresStackForm): ResultadoValidacao {
  const resultado = StackFormSchema.safeParse(paraDados(valores), { error: mapaErros })
  if (resultado.success) return { ok: true, dados: resultado.data }

  const erros: ErrosStackForm = {}
  for (const issue of resultado.error.issues) {
    const campo = campoDoCaminho(issue.path)
    if (campo && !erros[campo]) erros[campo] = issue.message
  }
  return { ok: false, erros }
}

/** Primeiro campo com erro, na ordem da tela. */
export function primeiroCampoInvalido(erros: ErrosStackForm): CampoForm | undefined {
  return CAMPOS_FORM.find((c) => erros[c])
}

/** Stack provisória para o preview da nota (mantém evidências da stack editada). */
export function stackDePreview(valores: ValoresStackForm, inicial?: Stack): Stack {
  const dados = paraDados(valores)
  return {
    id: inicial?.id ?? 'preview',
    evidencias: inicial?.evidencias ?? [],
    historico: inicial?.historico ?? [],
    ...dados,
    experiencia: {
      ...dados.experiencia,
      meses: Number.isFinite(dados.experiencia.meses) ? dados.experiencia.meses : 0,
    },
  }
}
