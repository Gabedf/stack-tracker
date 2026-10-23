import { z } from 'zod'
import {
  TIPOS_EVIDENCIA,
  TIPOS_EXPERIENCIA,
  VERSAO_STACKS_FILE,
  type Dimensoes,
  type Evidencia,
  type Experiencia,
  type RegistroHistorico,
  type Stack,
  type StacksFile,
} from './types'

const textoObrigatorio = (mensagem: string) => z.string().trim().min(1, { error: mensagem })

export const NotaSchema = z
  .number()
  .min(0, { error: 'Deve ser um número entre 0 e 10.' })
  .max(10, { error: 'Deve ser um número entre 0 e 10.' })

export const DataISOSchema = z.iso.date({ error: 'Data inválida: use o formato AAAA-MM-DD.' })

export const DimensoesSchema = z.object({
  teoria: NotaSchema,
  pratica: NotaSchema,
  profundidade: NotaSchema,
  ultimoUso: DataISOSchema,
})

export const ExperienciaSchema = z.object({
  tipo: z.enum(TIPOS_EXPERIENCIA),
  meses: z
    .number()
    .int({ error: 'Meses deve ser um número inteiro.' })
    .min(0, { error: 'Meses não pode ser negativo.' }),
})

export const EvidenciaSchema = z.object({
  titulo: textoObrigatorio('O título não pode ficar vazio.'),
  url: z
    .url({ protocol: /^https?$/, error: 'URL inválida: use um endereço http(s) completo.' })
    .optional(),
  descricao: z.string(),
  tipo: z.enum(TIPOS_EVIDENCIA),
})

export const RegistroHistoricoSchema = z.object({
  data: DataISOSchema,
  dimensoes: DimensoesSchema,
  nota: NotaSchema,
})

export const StackSchema = z.object({
  id: textoObrigatorio('O id não pode ficar vazio.'),
  nome: textoObrigatorio('O nome não pode ficar vazio.'),
  categoria: textoObrigatorio('A categoria não pode ficar vazia.'),
  tags: z.array(textoObrigatorio('A tag não pode ficar vazia.')),
  dimensoes: DimensoesSchema,
  experiencia: ExperienciaSchema,
  evidencias: z.array(EvidenciaSchema),
  historico: z.array(RegistroHistoricoSchema),
  notas: z.string().optional(),
})

export const StacksFileSchema = z
  .object({
    versao: z.literal(VERSAO_STACKS_FILE, {
      error: `Versão do arquivo não suportada (esperado ${VERSAO_STACKS_FILE}).`,
    }),
    stacks: z.array(StackSchema),
  })
  .check((ctx) => {
    const vistos = new Set<string>()
    ctx.value.stacks.forEach((stack, i) => {
      if (vistos.has(stack.id)) {
        ctx.issues.push({
          code: 'custom',
          input: stack.id,
          path: ['stacks', i, 'id'],
          message: `Id duplicado: "${stack.id}" já é usado por outra stack.`,
        })
      }
      vistos.add(stack.id)
    })
  })

// --- Garantia em tempo de compilação: schemas e tipos de domínio não divergem ---

type Igual<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false
type Afirmar<T extends true> = T

export type _ChecagemTipos = [
  Afirmar<Igual<z.infer<typeof DimensoesSchema>, Dimensoes>>,
  Afirmar<Igual<z.infer<typeof ExperienciaSchema>, Experiencia>>,
  Afirmar<Igual<z.infer<typeof EvidenciaSchema>, Evidencia>>,
  Afirmar<Igual<z.infer<typeof RegistroHistoricoSchema>, RegistroHistorico>>,
  Afirmar<Igual<z.infer<typeof StackSchema>, Stack>>,
  Afirmar<Igual<z.infer<typeof StacksFileSchema>, StacksFile>>,
]

// --- Parse com mensagens amigáveis ---

export type ResultadoParse<T> = { ok: true; dados: T } | { ok: false; erros: string[] }

const NOMES_TIPO: Record<string, string> = {
  string: 'um texto',
  number: 'um número',
  int: 'um número inteiro',
  boolean: 'verdadeiro/falso',
  array: 'uma lista',
  object: 'um objeto',
}

/** Mapa de erros padrão em português para issues sem mensagem própria. */
const mapaErros: z.core.$ZodErrorMap = (issue) => {
  switch (issue.code) {
    case 'invalid_type':
      if (issue.input === undefined) return 'Campo obrigatório ausente.'
      return `Tipo inválido: esperado ${NOMES_TIPO[issue.expected] ?? issue.expected}.`
    case 'invalid_value':
      return `Valor inválido: use um de ${issue.values.map((v) => JSON.stringify(v)).join(', ')}.`
    case 'unrecognized_keys':
      return `Campos não reconhecidos: ${issue.keys.join(', ')}.`
    default:
      return undefined
  }
}

function formatarCaminho(caminho: readonly PropertyKey[]): string {
  return caminho.reduce<string>((acc, parte) => {
    if (typeof parte === 'number') return `${acc}[${parte}]`
    return acc ? `${acc}.${String(parte)}` : String(parte)
  }, '')
}

/** Valida dados desconhecidos (ex.: JSON lido do disco) sem lançar exceção. */
export function parseStacksFile(input: unknown): ResultadoParse<StacksFile> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { ok: false, erros: ['O arquivo deve ser um objeto JSON com "versao" e "stacks".'] }
  }

  const resultado = StacksFileSchema.safeParse(input, { error: mapaErros })
  if (resultado.success) return { ok: true, dados: resultado.data }

  const erros = resultado.error.issues.map((issue) => {
    const caminho = formatarCaminho(issue.path)
    return caminho ? `${caminho}: ${issue.message}` : issue.message
  })
  return { ok: false, erros }
}
