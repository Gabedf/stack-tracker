import type { ReactNode } from 'react'

export interface IconeProps {
  /** Classes extras (ex.: tamanho). O padrão é size-3.5. */
  className?: string
  /**
   * Dentro de outro SVG: posição e tamanho em unidades do SVG pai (ex.: um
   * ícone dentro de um hexágono). Sem isso, o tamanho vem do className.
   */
  x?: number
  y?: number
  tamanho?: number
}

/**
 * Base dos ícones: SVG 16x16 decorativo (aria-hidden, sem foco), sempre ao lado
 * de um texto visível. Cor via currentColor; espessura do traço e preenchimento
 * vêm dos tokens --theme-icon-* pela classe "icone" (index.css), então cada tema
 * muda o ícone só com CSS. Os atributos abaixo são o padrão sem CSS.
 */
function IconeBase({
  className = 'size-3.5',
  x,
  y,
  tamanho,
  children,
}: IconeProps & { children: ReactNode }) {
  return (
    <svg
      x={x}
      y={y}
      width={tamanho}
      height={tamanho}
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 16 16"
      fill="currentColor"
      fillOpacity={0}
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`icone shrink-0 ${className}`}
    >
      {children}
    </svg>
  )
}

/** Repositório: bifurcação (fork). */
export function IconeRepositorio(props: IconeProps) {
  return (
    <IconeBase {...props}>
      <circle cx="4" cy="3.25" r="1.75" />
      <circle cx="12" cy="3.25" r="1.75" />
      <circle cx="8" cy="12.75" r="1.75" />
      <path fill="none" d="M4 5v1a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V5M8 8v3" />
    </IconeBase>
  )
}

/** Projeto: gema lapidada. */
export function IconeProjeto(props: IconeProps) {
  return (
    <IconeBase {...props}>
      <path d="M4.5 2.5h7L14 6l-6 7.5L2 6Z" />
      <path fill="none" d="M2 6h12M6.25 2.5 8 6l1.75-3.5M8 6v7.5" />
    </IconeBase>
  )
}

/** Emprego: maleta. */
export function IconeEmprego(props: IconeProps) {
  return (
    <IconeBase {...props}>
      <rect x="2" y="5" width="12" height="8.5" rx="1.25" />
      <path fill="none" d="M6 5V3.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V5M2 9h12" />
    </IconeBase>
  )
}

/** Certificado: medalha com fitas. */
export function IconeCertificado(props: IconeProps) {
  return (
    <IconeBase {...props}>
      <path d="m5.5 9.25-1 5.25L8 12.75l3.5 1.75-1-5.25" />
      <circle cx="8" cy="6" r="4" />
    </IconeBase>
  )
}

/** Livro aberto: "sei por saber" (conhecimento só de leitura). */
export function IconeLivro(props: IconeProps) {
  return (
    <IconeBase {...props}>
      <path d="M8 4c-1.5-1.2-3.5-1.5-6-1.2v9.4c2.5-.3 4.5 0 6 1.2 1.5-1.2 3.5-1.5 6-1.2V2.8C11.5 2.5 9.5 2.8 8 4Z" />
      <path fill="none" d="M8 4v9.4" />
    </IconeBase>
  )
}

/** Nível: escudo com divisa (patente). */
export function IconeNivel(props: IconeProps) {
  return (
    <IconeBase {...props}>
      <path d="M8 1.75 13.25 3.5v4c0 3.1-2.25 5.45-5.25 6.75C5 12.95 2.75 10.6 2.75 7.5v-4Z" />
      <path fill="none" d="m5.5 6.75 2.5 2 2.5-2" />
    </IconeBase>
  )
}

/** Floco de neve: stack "esfriando" (perdendo nota por falta de uso). */
export function IconeFloco(props: IconeProps) {
  return (
    <IconeBase {...props}>
      <path
        fill="none"
        d="M8 1.5v13M2.4 4.75l11.2 6.5M2.4 11.25l11.2-6.5M6.25 2.75 8 4.25l1.75-1.5M6.25 13.25 8 11.75l1.75 1.5"
      />
    </IconeBase>
  )
}
