import { useId } from 'react'
import { useTheme } from './useTheme'
import { CONFIG_TEMAS, isTema, TEMAS } from './themes'

/**
 * Seletor de tema: um `<select>` nativo com rótulo visível "Tema", listando todos os temas
 * de `TEMAS`. O nativo já traz teclado, leitor de tela e o seletor do sistema no celular.
 */
export function ThemeToggle() {
  const { tema, setTema } = useTheme()
  const id = useId()

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-sm font-medium text-muted">
        Tema
      </label>
      <select
        id={id}
        value={tema}
        onChange={(e) => {
          if (isTema(e.target.value)) setTema(e.target.value)
        }}
        className="min-h-9 rounded-theme border border-control bg-surface px-3 py-1.5 text-sm font-medium text-fg shadow-theme hover:bg-surface-2"
      >
        {TEMAS.map((t) => (
          <option key={t} value={t}>
            {CONFIG_TEMAS[t].rotulo}
          </option>
        ))}
      </select>
    </div>
  )
}
