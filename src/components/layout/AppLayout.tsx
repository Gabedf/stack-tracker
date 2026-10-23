import { Link, NavLink, Outlet } from 'react-router'
import { ThemeToggle } from '../../themes'

import { NOME_APP } from './constants'

const LINKS_NAV = [
  { to: '/', rotulo: 'Dashboard', end: true },
  { to: '/stacks', rotulo: 'Stacks', end: false },
  { to: '/curriculo', rotulo: 'Currículo', end: false },
] as const

function classeLink({ isActive }: { isActive: boolean }) {
  const base = 'block whitespace-nowrap rounded-theme px-3 py-1.5 text-sm font-medium'
  return isActive
    ? `${base} bg-surface-2 text-accent`
    : `${base} text-muted hover:bg-surface-2 hover:text-fg`
}

/** Casca do app: cabeçalho com marca, navegação principal e toggle de tema; a rota ativa vai no <main>. */
export function AppLayout() {
  return (
    <div className="min-h-screen bg-bg text-fg">
      <a
        href="#conteudo"
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
            className="order-last -mx-1 w-full overflow-x-auto sm:order-none sm:mx-0 sm:w-auto"
          >
            <ul className="flex gap-1 px-1 sm:px-0">
              {LINKS_NAV.map(({ to, rotulo, end }) => (
                <li key={to}>
                  <NavLink to={to} end={end} className={classeLink}>
                    {rotulo}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main
        id="conteudo"
        tabIndex={-1}
        className="mx-auto max-w-5xl px-4 py-6 focus:outline-none sm:px-6"
      >
        <Outlet />
      </main>
    </div>
  )
}
