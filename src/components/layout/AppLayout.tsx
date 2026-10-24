import { Suspense, useRef, type MouseEvent } from 'react'
import { Link, NavLink, Outlet } from 'react-router'
import { ThemeToggle, useTheme, type Tema } from '../../themes'

import { NOME_APP } from './constants'
import { RouteFallback } from './RouteFallback'
import { useFocoAoNavegar } from './useFocoAoNavegar'

interface LinkNav {
  to: string
  rotulo: string
  end: boolean
  /** Se informado, o link só aparece nesses temas. */
  temas?: readonly Tema[]
}

const LINKS_NAV: readonly LinkNav[] = [
  { to: '/', rotulo: 'Dashboard', end: true },
  { to: '/stacks', rotulo: 'Stacks', end: false },
  { to: '/ficha', rotulo: 'Ficha', end: false, temas: ['rpg'] },
  { to: '/curriculo', rotulo: 'Currículo', end: false },
]

function classeLink({ isActive }: { isActive: boolean }) {
  const base = 'block whitespace-nowrap rounded-theme px-3 py-1.5 text-sm font-medium'
  return isActive
    ? `${base} bg-surface-2 text-accent`
    : `${base} text-muted hover:bg-surface-2 hover:text-fg`
}

/** Casca do app: cabeçalho com marca, navegação principal, link de dados e toggle de tema; a rota ativa vai no <main>. */
export function AppLayout() {
  const { tema } = useTheme()
  const links = LINKS_NAV.filter((link) => !link.temas || link.temas.includes(tema))
  const mainRef = useRef<HTMLElement>(null)
  useFocoAoNavegar(mainRef)

  // Foca o <main> direto (tabIndex -1): funciona com o router e não suja a URL com #conteudo.
  function pularParaConteudo(evento: MouseEvent<HTMLAnchorElement>) {
    evento.preventDefault()
    mainRef.current?.focus()
  }

  return (
    <div className="min-h-screen bg-bg text-fg">
      <a
        href="#conteudo"
        onClick={pularParaConteudo}
        className="sr-only rounded-theme border border-border bg-surface px-3 py-2 text-sm font-medium text-fg shadow-theme focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50"
      >
        Pular para o conteúdo
      </a>

      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
          <Link to="/" className="font-heading text-lg font-bold text-fg">
            {NOME_APP}
          </Link>

          <nav
            aria-label="Principal"
            className="order-last -m-1 w-full overflow-x-auto sm:order-none sm:w-auto"
          >
            {/* p-1 no contêiner rolável: o contorno de foco (2px + 2px de offset) não é cortado. */}
            <ul className="flex gap-1 p-1">
              {links.map(({ to, rotulo, end }) => (
                <li key={to}>
                  <NavLink to={to} end={end} className={classeLink}>
                    {rotulo}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {/* Fora da nav principal: utilitário de backup/importação. */}
            <NavLink to="/dados" title="Exportar e importar dados" className={classeLink}>
              Dados
            </NavLink>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main
        ref={mainRef}
        id="conteudo"
        tabIndex={-1}
        className="mx-auto max-w-5xl px-4 py-6 focus:outline-none sm:px-6"
      >
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  )
}
