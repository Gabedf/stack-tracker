/**
 * Detecção de level-up entre dois estados das stacks (antes/depois de uma
 * operação do usuário). Função pura, sem React.
 *
 * - Stack que mudou de faixa para cima (Praticante -> Sênior) gera um evento de
 *   stack, mesmo cruzando mais de uma faixa (de/para são as faixas extremas).
 * - Personagem que subiu de nível numérico gera um evento de personagem.
 * Quedas, stacks removidas e stacks novas (sem "antes") não geram evento de
 * stack; uma stack nova pode subir o nível do personagem.
 */

import { nivelDaNota, NIVEIS, type Nivel } from '../../domain/levels'
import { calcularNota } from '../../domain/scoring'
import type { Stack, StacksFile } from '../../domain/types'
import type { OpcoesDashboard } from '../dashboard/dashboardStats'
import { calcularPersonagem } from './character'

export interface LevelUpStack {
  tipo: 'stack'
  id: string
  nome: string
  de: Nivel
  para: Nivel
}

export interface LevelUpPersonagem {
  tipo: 'personagem'
  de: number
  para: number
}

export type EventoLevelUp = LevelUpStack | LevelUpPersonagem

export type EstadoStacks = StacksFile | readonly Stack[]

function listar(estado: EstadoStacks): readonly Stack[] {
  return 'stacks' in estado ? estado.stacks : estado
}

const indiceDoNivel = (nivel: Nivel) => NIVEIS.findIndex((n) => n.id === nivel.id)

/**
 * Eventos de level-up de `antes` para `depois`: as stacks (na ordem de `depois`)
 * e, por último, o personagem.
 */
export function detectarLevelUps(
  antes: EstadoStacks,
  depois: EstadoStacks,
  { hoje = new Date() }: OpcoesDashboard = {},
): EventoLevelUp[] {
  const listaAntes = listar(antes)
  const listaDepois = listar(depois)
  const anteriores = new Map(listaAntes.map((s) => [s.id, s]))
  const eventos: EventoLevelUp[] = []

  for (const stack of listaDepois) {
    const anterior = anteriores.get(stack.id)
    if (!anterior) continue
    const de = nivelDaNota(calcularNota(anterior, { hoje }))
    const para = nivelDaNota(calcularNota(stack, { hoje }))
    if (indiceDoNivel(para) > indiceDoNivel(de)) {
      eventos.push({ tipo: 'stack', id: stack.id, nome: stack.nome, de, para })
    }
  }

  const nivelAntes = calcularPersonagem(listaAntes, { hoje }).progresso.nivel
  const nivelDepois = calcularPersonagem(listaDepois, { hoje }).progresso.nivel
  if (nivelDepois > nivelAntes) {
    eventos.push({ tipo: 'personagem', de: nivelAntes, para: nivelDepois })
  }

  return eventos
}

/** Mensagem principal do evento ("Subiu para Sênior!", "Personagem subiu para o nível 6!"). */
export function mensagemDoLevelUp(evento: EventoLevelUp): string {
  return evento.tipo === 'stack'
    ? `Subiu para ${evento.para.nome}!`
    : `Personagem subiu para o nível ${evento.para}!`
}
