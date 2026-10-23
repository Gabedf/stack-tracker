import { useTheme } from './useTheme'
import { ROTULOS_TEMA, proximoTema } from './themes'

/** Botão que alterna entre os temas; o texto mostra o tema ativo. */
export function ThemeToggle() {
  const { tema, alternar } = useTheme()
  const proximo = ROTULOS_TEMA[proximoTema(tema)]

  return (
    <button
      type="button"
      onClick={alternar}
      title={`Mudar para o tema ${proximo}`}
      className="rounded-theme border border-border bg-surface px-3 py-1.5 text-sm font-medium text-fg shadow-theme hover:bg-surface-2"
    >
      Tema: {ROTULOS_TEMA[tema]}
    </button>
  )
}
