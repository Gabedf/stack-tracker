/**
 * Persistência das opções do currículo no localStorage. Sem React.
 *
 * O valor lido é validado com Zod: qualquer coisa inválida (JSON quebrado,
 * campo faltando, tipo errado) volta ao padrão. Falhas de acesso ao storage
 * (modo privado, cota, bloqueio) são ignoradas.
 */

import { z } from 'zod'
import { NIVEIS, type NivelId } from '../../domain/levels'
import { DEFAULT_OPCOES_CURRICULO, type OpcoesCurriculo } from './resumeOptions'

export const CHAVE_CURRICULO_STORAGE = 'painel-stacks:curriculo'

const IDS_NIVEIS = NIVEIS.map((n) => n.id) as [NivelId, ...NivelId[]]

const opcoesSchema = z.object({
  categorias: z.array(z.string()).nullable(),
  nivelMinimo: z.enum(IDS_NIVEIS).nullable(),
  somenteComprovado: z.boolean(),
  incluirSeiPorSaber: z.boolean(),
  mostrarNivel: z.boolean(),
  mostrarNota: z.boolean(),
  mostrarTempo: z.boolean(),
  incluirEvidencias: z.boolean(),
  titulo: z.string().max(500),
})

function padrao(): OpcoesCurriculo {
  return { ...DEFAULT_OPCOES_CURRICULO }
}

/** Opções salvas, ou o padrão se não houver/forem inválidas. */
export function lerOpcoesSalvas(): OpcoesCurriculo {
  try {
    const texto = window.localStorage.getItem(CHAVE_CURRICULO_STORAGE)
    if (texto === null) return padrao()
    const resultado = opcoesSchema.safeParse(JSON.parse(texto))
    return resultado.success ? resultado.data : padrao()
  } catch {
    return padrao()
  }
}

export function salvarOpcoes(opcoes: OpcoesCurriculo): void {
  try {
    window.localStorage.setItem(CHAVE_CURRICULO_STORAGE, JSON.stringify(opcoes))
  } catch {
    // Sem persistência as opções ainda valem durante a sessão.
  }
}
