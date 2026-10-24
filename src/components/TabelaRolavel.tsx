import type { ReactNode } from 'react'

export interface TabelaRolavelProps {
  /** Nome da região (ex.: "Tabela da evolução"), lido pelo leitor de tela. */
  rotulo: string
  children: ReactNode
  className?: string
}

/**
 * Contêiner de tabela larga: rola na horizontal sozinho (a página não ganha
 * rolagem em 320 px) e é focável, para quem usa teclado rolar com as setas.
 */
export function TabelaRolavel({ rotulo, children, className = '' }: TabelaRolavelProps) {
  return (
    <div role="region" aria-label={rotulo} tabIndex={0} className={`overflow-x-auto ${className}`}>
      {children}
    </div>
  )
}
