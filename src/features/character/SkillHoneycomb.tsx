import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { formatarNota } from '../../components/formatacao'
import { IconeFloco, IconeLivro } from '../../components/icons'
import { NIVEIS, type NivelId } from '../../domain/levels'
import type { SkillDaColmeia } from './character'
import {
  LARGURA_PADRAO,
  layoutColmeia,
  pontosHexagono,
  rotuloCurto,
  rotuloDaSkill,
  type HexPosicionado,
} from './honeycombLayout'

export interface SkillHoneycombProps {
  skills: readonly SkillDaColmeia[]
  /** Ordem das categorias (ex.: a das habilidades); as ausentes vão ao fim. */
  ordemCategorias?: readonly string[]
}

const RAIO = 34
const ESPACO = 4
/** Folga para o brilho e o anel de foco não serem cortados nas bordas. */
const MARGEM = 12

interface EstiloNivel {
  /** Token da cor do nível. */
  cor: string
  /** Opacidade do preenchimento: tinta clara nos níveis baixos, cheio nos altos. */
  preenchimento: number
  /** Cor do texto dentro do hexágono (contraste >= 4,5:1 com o preenchimento). */
  texto: string
  /** Halos de brilho atrás do hexágono (0 a 2). */
  brilho: 0 | 1 | 2
}

const ESTILO_NIVEL: Record<NivelId, EstiloNivel> = {
  iniciante: {
    cor: 'var(--theme-level-1)',
    preenchimento: 0.14,
    texto: 'var(--theme-text)',
    brilho: 0,
  },
  aprendiz: {
    cor: 'var(--theme-level-2)',
    preenchimento: 0.26,
    texto: 'var(--theme-text)',
    brilho: 0,
  },
  praticante: {
    cor: 'var(--theme-level-3)',
    preenchimento: 1,
    texto: 'var(--theme-surface)',
    brilho: 0,
  },
  senior: {
    cor: 'var(--theme-level-4)',
    preenchimento: 1,
    texto: 'var(--theme-surface)',
    brilho: 1,
  },
  mestre: {
    cor: 'var(--theme-level-5)',
    preenchimento: 1,
    texto: 'var(--theme-surface)',
    brilho: 2,
  },
}

const COR_BRILHO = 'var(--theme-xp-fill)'
const COR_ROTULO = 'var(--theme-text-muted)'
const COR_SUPERFICIE = 'var(--theme-surface)'
/** Opacidade das stacks esfriando (o floco reforça; não é só a opacidade). */
const OPACIDADE_ESFRIANDO = 0.6
const TRACEJADO_SEI_POR_SABER = '5 3'

/** Largura do elemento, acompanhando redimensionamentos (padrão até medir). */
function useLargura(padrao: number) {
  const [elemento, setElemento] = useState<HTMLElement | null>(null)
  const [largura, setLargura] = useState(padrao)

  useEffect(() => {
    if (!elemento || typeof ResizeObserver === 'undefined') return
    const observador = new ResizeObserver(([entrada]) => {
      const medida = Math.floor(entrada?.contentRect.width ?? 0)
      if (medida > 0) setLargura(medida)
    })
    observador.observe(elemento)
    return () => observador.disconnect()
  }, [elemento])

  return [setElemento, largura] as const
}

function Brilho({ hex }: { hex: HexPosicionado<SkillDaColmeia> }) {
  const { brilho } = ESTILO_NIVEL[hex.item.nivel.id]
  if (brilho === 0) return null
  return (
    <g aria-hidden="true" fill="none" stroke={COR_BRILHO} strokeLinejoin="round">
      <polygon
        points={pontosHexagono(hex.x, hex.y, RAIO + 4)}
        strokeWidth={3}
        strokeOpacity={0.5}
      />
      {brilho === 2 && (
        <polygon
          points={pontosHexagono(hex.x, hex.y, RAIO + 7)}
          strokeWidth={2}
          strokeOpacity={0.25}
        />
      )}
    </g>
  )
}

function Hexagono({ hex }: { hex: HexPosicionado<SkillDaColmeia> }) {
  const { item: skill, x, y } = hex
  const estilo = ESTILO_NIVEL[skill.nivel.id]
  const selos: Array<'livro' | 'floco'> = []
  if (skill.seiPorSaber) selos.push('livro')
  if (skill.esfriando) selos.push('floco')
  const tamanhoSelo = 12
  const inicioSelos = x - (selos.length * tamanhoSelo + (selos.length - 1) * 2) / 2

  return (
    <Link
      to={`/stacks/${encodeURIComponent(skill.id)}`}
      aria-label={rotuloDaSkill(skill)}
      data-nivel={skill.nivel.id}
      data-sei-por-saber={skill.seiPorSaber || undefined}
      data-esfriando={skill.esfriando || undefined}
      className="cursor-pointer focus-visible:outline-none"
      style={{ opacity: skill.esfriando ? OPACIDADE_ESFRIANDO : 1, color: estilo.texto }}
    >
      {/* Base opaca: a tinta dos níveis baixos não deixa ver o que está atrás. */}
      <polygon points={pontosHexagono(x, y, RAIO)} fill={COR_SUPERFICIE} />
      <polygon
        points={pontosHexagono(x, y, RAIO - 1)}
        fill={estilo.cor}
        fillOpacity={estilo.preenchimento}
        stroke={estilo.cor}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeDasharray={skill.seiPorSaber ? TRACEJADO_SEI_POR_SABER : undefined}
      />
      {selos.map((selo, i) => {
        const props = {
          x: inicioSelos + i * (tamanhoSelo + 2),
          y: y - RAIO * 0.72,
          tamanho: tamanhoSelo,
        }
        return selo === 'livro' ? (
          <IconeLivro key={selo} {...props} />
        ) : (
          <IconeFloco key={selo} {...props} />
        )
      })}
      <text
        aria-hidden="true"
        x={x}
        y={y + 2}
        textAnchor="middle"
        fill={estilo.texto}
        fontSize={12}
        fontWeight={700}
      >
        {rotuloCurto(skill.nome)}
      </text>
      <text
        aria-hidden="true"
        x={x}
        y={y + 17}
        textAnchor="middle"
        fill={estilo.texto}
        fontSize={11}
        className="tabular-nums"
      >
        {formatarNota(skill.nota)}
      </text>
    </Link>
  )
}

/** Amostra de hexágono para a legenda. */
function AmostraHex({ id }: { id: NivelId }) {
  const estilo = ESTILO_NIVEL[id]
  return (
    <svg aria-hidden="true" viewBox="0 0 20 22" className="h-5 w-[18px] shrink-0">
      <polygon points={pontosHexagono(10, 11, 10)} fill={COR_SUPERFICIE} />
      <polygon
        points={pontosHexagono(10, 11, 9)}
        fill={estilo.cor}
        fillOpacity={estilo.preenchimento}
        stroke={estilo.cor}
        strokeWidth={1.5}
      />
    </svg>
  )
}

function Legenda() {
  return (
    <div className="flex flex-col gap-2 text-xs text-muted">
      <ul aria-label="Legenda de níveis" className="flex flex-wrap gap-x-4 gap-y-1">
        {NIVEIS.map((nivel) => (
          <li key={nivel.id} className="inline-flex items-center gap-1.5">
            <AmostraHex id={nivel.id} />
            <span className="font-semibold text-fg">{nivel.nome}</span>
            <span className="tabular-nums">
              {nivel.min}–{nivel.max}
            </span>
          </li>
        ))}
      </ul>
      <ul aria-label="Legenda de selos" className="flex flex-wrap gap-x-4 gap-y-1">
        <li className="inline-flex items-center gap-1.5">
          <svg aria-hidden="true" viewBox="0 0 20 22" className="h-5 w-[18px] shrink-0">
            <polygon
              points={pontosHexagono(10, 11, 9)}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeDasharray="3 2"
            />
          </svg>
          <IconeLivro />
          Sei por saber (teoria alta, prática baixa)
        </li>
        <li className="inline-flex items-center gap-1.5">
          <IconeFloco />
          Esfriando (perdendo nota por falta de uso)
        </li>
      </ul>
    </div>
  )
}

/**
 * Colmeia de skills: um hexágono por stack, agrupado por categoria e ordenado
 * por nota. Cor e brilho vêm do nível (tokens --theme-level-N); os selos usam
 * forma e ícone, não só cor. Cada hexágono é um link para a stack.
 */
export function SkillHoneycomb({ skills, ordemCategorias }: SkillHoneycombProps) {
  const [ref, largura] = useLargura(LARGURA_PADRAO)

  const layout = layoutColmeia(skills, {
    largura,
    raio: RAIO,
    espaco: ESPACO,
    margem: MARGEM,
    ordemCategorias,
  })

  return (
    <div className="flex flex-col gap-3">
      <div ref={ref} className="relative w-full min-w-0 overflow-x-auto">
        {skills.length === 0 ? (
          <p className="rounded-theme border border-dashed border-border bg-surface-2 p-4 text-center text-sm text-muted">
            Nenhuma stack para mostrar.
          </p>
        ) : (
          <svg
            role="group"
            aria-label={`Colmeia: ${skills.length} ${skills.length === 1 ? 'stack' : 'stacks'}`}
            width={layout.largura}
            height={layout.altura}
            viewBox={`0 0 ${layout.largura} ${layout.altura}`}
            className="block"
            data-colunas={layout.colunas}
          >
            <g>
              {layout.hexagonos.map((hex) => (
                <Brilho key={hex.item.id} hex={hex} />
              ))}
            </g>
            {layout.grupos.map((grupo) => (
              <g key={grupo.categoria} role="group" aria-label={grupo.categoria}>
                <text
                  aria-hidden="true"
                  x={MARGEM}
                  y={grupo.yRotulo}
                  fill={COR_ROTULO}
                  fontSize={12}
                  fontWeight={600}
                >
                  {grupo.categoria}
                </text>
                {layout.hexagonos
                  .filter((hex) => hex.item.categoria === grupo.categoria)
                  .map((hex) => (
                    <Hexagono key={hex.item.id} hex={hex} />
                  ))}
              </g>
            ))}
          </svg>
        )}
      </div>
      <Legenda />
    </div>
  )
}
