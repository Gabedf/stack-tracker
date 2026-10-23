export {
  MARGEM_MULTICLASSE,
  NIVEL_MINIMO_COM_STACKS,
  XP_BASE_NIVEL,
  XP_POR_PONTO_DE_NOTA,
  calcularPersonagem,
  classeDoPersonagem,
  habilidadesPorCategoria,
  nivelDoXp,
  progressoDoXp,
  skillsDaColmeia,
  xpDaNota,
  xpParaNivel,
  type ClassePersonagem,
  type HabilidadeCategoria,
  type Personagem,
  type ProgressoXp,
  type SkillDaColmeia,
  type TipoClasse,
} from './character'
export {
  CLASSES_POR_CATEGORIA,
  CLASSE_RECRUTA,
  classeGenerica,
  classeMulticlasse,
  nomeDaClasse,
  normalizarCategoria,
} from './classes'
export { XpBar, type XpBarProps } from './XpBar'
export { formatarXp, textoFaltam } from './xpText'
export { SkillHoneycomb, type SkillHoneycombProps } from './SkillHoneycomb'
export {
  detectarLevelUps,
  mensagemDoLevelUp,
  type EstadoStacks,
  type EventoLevelUp,
  type LevelUpPersonagem,
  type LevelUpStack,
} from './levelUp'
export { LevelUpProvider, type LevelUpProviderProps } from './LevelUpProvider'
export { useLevelUps } from './useLevelUps'
export type { AvisoLevelUp, LevelUpContextValue } from './LevelUpContext'
export { DURACAO_AVISO_MS, LevelUpToast, type LevelUpToastProps } from './LevelUpToast'
