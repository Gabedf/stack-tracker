import { useTheme } from './useTheme'
import { CONFIG_TEMAS, proximoTema } from './themes'

/** Botão que alterna entre os temas; o texto mostra o tema ativo. */
export function ThemeToggle() {
  const { tema, alternar } = useTheme()
  const proximo = CONFIG_TEMAS[proximoTema(tema)].rotulo

  return (
    <button
      type="button"
      onClick={alternar}
      title={`Mudar para o tema ${proximo}`}
      className="rounded-theme border border-control bg-surface px-3 py-1.5 text-sm font-medium text-fg shadow-theme hover:bg-surface-2"
    >
      Tema: {CONFIG_TEMAS[tema].rotulo}
    </button>
  )
}
