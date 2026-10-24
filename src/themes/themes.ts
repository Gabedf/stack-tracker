/** Temas disponíveis. O valor é o que vai no atributo data-theme do <html>. */
export const TEMAS = ['funcional', 'rpg'] as const

export type Tema = (typeof TEMAS)[number]

export const TEMA_PADRAO: Tema = 'funcional'

/** Chave do localStorage. O script anti-flash em index.html usa a mesma. */
export const CHAVE_TEMA_STORAGE = 'painel-stacks:tema'

/** Valor de `color-scheme` do tema (controles nativos, barras de rolagem). */
export type EsquemaTema = 'light' | 'dark'

/** Estilo da animação de level-up: pergaminho (rpg) ou mensagem do sistema. */
export type EstiloLevelUp = 'pergaminho' | 'sistema'

export interface ConfigTema {
  /** Nome mostrado na interface. */
  rotulo: string
  /** Temas de jogo mostram os enfeites de jogo (level-up animado e afins). */
  jogo: boolean
  /** Deve bater com o `color-scheme` declarado no CSS do tema. */
  esquema: EsquemaTema
  levelUp: EstiloLevelUp
}

export const CONFIG_TEMAS: Record<Tema, ConfigTema> = {
  funcional: { rotulo: 'Funcional', jogo: false, esquema: 'light', levelUp: 'pergaminho' },
  rpg: { rotulo: 'RPG', jogo: true, esquema: 'light', levelUp: 'pergaminho' },
}

/** Se o tema é de jogo; use no lugar de comparar com ids como `'rpg'`. */
export function ehTemaDeJogo(tema: Tema): boolean {
  return CONFIG_TEMAS[tema].jogo
}

export function isTema(valor: unknown): valor is Tema {
  return typeof valor === 'string' && (TEMAS as readonly string[]).includes(valor)
}

/** Próximo tema da lista, voltando ao primeiro depois do último. */
export function proximoTema(atual: Tema): Tema {
  return TEMAS[(TEMAS.indexOf(atual) + 1) % TEMAS.length]
}

/** Tema salvo no localStorage, ou o padrão se ausente, inválido ou inacessível. */
export function lerTemaSalvo(): Tema {
  try {
    const salvo = window.localStorage.getItem(CHAVE_TEMA_STORAGE)
    return isTema(salvo) ? salvo : TEMA_PADRAO
  } catch {
    return TEMA_PADRAO
  }
}

/** Persiste o tema; falhas (modo privado, cota, bloqueio) são ignoradas. */
export function salvarTema(tema: Tema): void {
  try {
    window.localStorage.setItem(CHAVE_TEMA_STORAGE, tema)
  } catch {
    // Sem persistência o tema ainda funciona durante a sessão.
  }
}
