import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { formatarData, formatarNota } from '../../components/formatacao'
import { IconeFloco, IconeLivro } from '../../components/icons'
import { NIVEIS, type NivelId } from '../../domain/levels'
import type { SkillDaColmeia } from './character'
import {
  LARGURA_PADRAO,
  layoutColmeia,
  pontosHexagono,
  rotuloCurto,
  rotuloDaSkill,
  vizinhoNaColmeia,
  type DirecaoColmeia,
  type HexPosicionado,
  type LayoutColmeia,
} from './honeycombLayout'

export interface SkillHoneycombProps {
  skills: readonly SkillDaColmeia[]
  /** Ordem das categorias (ex.: a das habilidades); as ausentes vão ao fim. */
  ordemCategorias?: readonly string[]
  /** Categoria em destaque (ex.: clicada no radar): as demais esmaecem. */
  categoriaSelecionada?: string | null
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
/** Opacidade das categorias fora do destaque. */
const OPACIDADE_ESMAECIDA = 0.2
const TRACEJADO_SEI_POR_SABER = '5 3'
/** Transição suave só para quem não pediu menos movimento. */
const TRANSICAO = 'motion-safe:transition-opacity motion-safe:duration-200'
const COR_FOCO = 'var(--theme-focus)'

/** Teclas que movem o foco entre hexágonos (roving tabindex). */
const DIRECAO_DA_TECLA: Record<string, DirecaoColmeia> = {
  ArrowLeft: 'esquerda',
  ArrowRight: 'direita',
  ArrowUp: 'cima',
  ArrowDown: 'baixo',
  Home: 'inicio',
  End: 'fim',
}

function caminhoDaSkill(skill: SkillDaColmeia): string {
  return `/stacks/${encodeURIComponent(skill.id)}`
}

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

function Brilho({ hex, esmaecido }: { hex: HexPosicionado<SkillDaColmeia>; esmaecido: boolean }) {
  const { brilho } = ESTILO_NIVEL[hex.item.nivel.id]
  if (brilho === 0) return null
  return (
    <g
      aria-hidden="true"
      fill="none"
      stroke={COR_BRILHO}
      strokeLinejoin="round"
      opacity={esmaecido ? 0 : 1}
      className={TRANSICAO}
    >
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

interface HexagonoProps {
  hex: HexPosicionado<SkillDaColmeia>
  /** id do cartão de detalhes, quando ele descreve este hexágono. */
  descritoPor?: string
  /** Fora da categoria em destaque. */
  esmaecido: boolean
  /** Só um hexágono fica na ordem do Tab (0); os demais, -1. */
  tabIndex: 0 | -1
  registrar: (indice: number, elemento: HTMLAnchorElement | null) => void
  onTecla: (indice: number, evento: KeyboardEvent<HTMLAnchorElement>) => void
  onAtivar: (indice: number, origem: 'hover' | 'foco') => void
  onDesativar: (indice: number, origem: 'hover' | 'foco') => void
}

function Hexagono({
  hex,
  descritoPor,
  esmaecido,
  tabIndex,
  registrar,
  onTecla,
  onAtivar,
  onDesativar,
}: HexagonoProps) {
  const { item: skill, x, y } = hex
  const estilo = ESTILO_NIVEL[skill.nivel.id]
  const selos: Array<'livro' | 'floco'> = []
  if (skill.seiPorSaber) selos.push('livro')
  if (skill.esfriando) selos.push('floco')
  const tamanhoSelo = 12
  const inicioSelos = x - (selos.length * tamanhoSelo + (selos.length - 1) * 2) / 2

  return (
    <Link
      ref={(elemento) => registrar(hex.indice, elemento)}
      to={caminhoDaSkill(skill)}
      tabIndex={tabIndex}
      onKeyDown={(evento) => onTecla(hex.indice, evento)}
      aria-label={rotuloDaSkill(skill)}
      aria-describedby={descritoPor}
      onMouseEnter={() => onAtivar(hex.indice, 'hover')}
      onMouseLeave={() => onDesativar(hex.indice, 'hover')}
      onFocus={() => onAtivar(hex.indice, 'foco')}
      onBlur={() => onDesativar(hex.indice, 'foco')}
      data-nivel={skill.nivel.id}
      data-sei-por-saber={skill.seiPorSaber || undefined}
      data-esfriando={skill.esfriando || undefined}
      data-dim={esmaecido || undefined}
      className={`cursor-pointer focus-visible:outline-none ${TRANSICAO}`}
      style={{
        opacity:
          (skill.esfriando ? OPACIDADE_ESFRIANDO : 1) * (esmaecido ? OPACIDADE_ESMAECIDA : 1),
        color: estilo.texto,
      }}
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

const LARGURA_CARTAO = 224
/** Altura aproximada do cartão: decide se ele cabe acima do hexágono. */
const ALTURA_CARTAO = 170
const FOLGA_CARTAO = 6

/**
 * Posição do cartão relativa à colmeia: acima do hexágono se couber, senão
 * abaixo; na horizontal, centrado no hexágono e preso às bordas da colmeia.
 */
function posicaoDoCartao(hex: HexPosicionado, layout: LayoutColmeia, larguraVisivel: number) {
  const limite = Math.min(layout.largura, larguraVisivel)
  const left = Math.max(0, Math.min(hex.x - LARGURA_CARTAO / 2, limite - LARGURA_CARTAO))
  const acima = hex.y - layout.raio - FOLGA_CARTAO - ALTURA_CARTAO >= 0
  return acima
    ? { left, top: hex.y - layout.raio - FOLGA_CARTAO, transform: 'translateY(-100%)' }
    : { left, top: hex.y + layout.raio + FOLGA_CARTAO }
}

function Detalhe({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{rotulo}</dt>
      <dd className="font-semibold tabular-nums text-fg">{valor}</dd>
    </div>
  )
}

/** Cartão de detalhes do hexágono em hover ou foco (não recebe o ponteiro). */
function CartaoSkill({
  id,
  skill,
  posicao,
}: {
  id: string
  skill: SkillDaColmeia
  posicao: ReturnType<typeof posicaoDoCartao>
}) {
  return (
    <div
      id={id}
      role="tooltip"
      style={{ ...posicao, width: LARGURA_CARTAO }}
      className="pointer-events-none absolute z-10 flex max-w-full flex-col gap-2 rounded-theme border border-border bg-surface p-3 text-sm text-fg shadow-theme"
    >
      <div>
        <p className="font-semibold">{skill.nome}</p>
        <p className="text-xs text-muted">{skill.categoria}</p>
      </div>
      <dl className="flex flex-col gap-0.5">
        <Detalhe rotulo="Nota" valor={`${formatarNota(skill.nota)} · ${skill.nivel.nome}`} />
        <Detalhe rotulo="Teoria" valor={formatarNota(skill.teoria)} />
        <Detalhe rotulo="Prática" valor={formatarNota(skill.pratica)} />
        <Detalhe rotulo="Profundidade" valor={formatarNota(skill.profundidade)} />
        <Detalhe rotulo="Último uso" valor={formatarData(skill.ultimoUso)} />
      </dl>
      {(skill.seiPorSaber || skill.esfriando) && (
        <ul className="flex flex-col gap-0.5 text-xs text-muted">
          {skill.seiPorSaber && (
            <li className="inline-flex items-center gap-1">
              <IconeLivro />
              Sei por saber
            </li>
          )}
          {skill.esfriando && (
            <li className="inline-flex items-center gap-1">
              <IconeFloco />
              Esfriando: −{Math.round(skill.perda * 100)}% da nota
            </li>
          )}
        </ul>
      )}
    </div>
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
export function SkillHoneycomb({
  skills,
  ordemCategorias,
  categoriaSelecionada = null,
}: SkillHoneycombProps) {
  const [ref, largura] = useLargura(LARGURA_PADRAO)
  const idCartao = useId()
  const [emHover, setEmHover] = useState<number | null>(null)
  const [emFoco, setEmFoco] = useState<number | null>(null)
  /** Esc fecha o cartão até o próximo hover ou foco. */
  const [cartaoFechado, setCartaoFechado] = useState(false)
  const [indiceTab, setIndiceTab] = useState(0)
  const elementos = useRef(new Map<number, HTMLAnchorElement>())
  const navigate = useNavigate()
  const idInstrucoes = useId()

  const layout = layoutColmeia(skills, {
    largura,
    raio: RAIO,
    espaco: ESPACO,
    margem: MARGEM,
    ordemCategorias,
  })

  const ativo = cartaoFechado ? null : (emHover ?? emFoco)
  const hexAtivo = ativo == null ? undefined : layout.hexagonos[ativo]

  const naOrdemDoTab = Math.min(indiceTab, Math.max(0, layout.hexagonos.length - 1))
  const hexEmFoco = emFoco == null ? undefined : layout.hexagonos[emFoco]
  const esmaecida = (categoria: string) =>
    categoriaSelecionada != null && categoria !== categoriaSelecionada

  const registrar = (indice: number, elemento: HTMLAnchorElement | null) => {
    if (elemento) elementos.current.set(indice, elemento)
    else elementos.current.delete(indice)
  }

  const aoTeclar = (indice: number, evento: KeyboardEvent<HTMLAnchorElement>) => {
    if (evento.key === 'Enter') {
      // Navega aqui (e não pelo clique sintético do navegador) para não duplicar.
      evento.preventDefault()
      navigate(caminhoDaSkill(layout.hexagonos[indice].item))
      return
    }
    const direcao = DIRECAO_DA_TECLA[evento.key]
    if (!direcao) return
    evento.preventDefault()
    const destino = vizinhoNaColmeia(layout, indice, direcao)
    setIndiceTab(destino)
    elementos.current.get(destino)?.focus()
  }

  const ativar = (indice: number, origem: 'hover' | 'foco') => {
    setCartaoFechado(false)
    if (origem === 'hover') setEmHover(indice)
    else {
      setEmFoco(indice)
      setIndiceTab(indice)
    }
  }
  const desativar = (indice: number, origem: 'hover' | 'foco') => {
    const atualizar = (atual: number | null) => (atual === indice ? null : atual)
    if (origem === 'hover') setEmHover(atualizar)
    else setEmFoco(atualizar)
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        className="relative"
        onKeyDown={(evento) => {
          if (evento.key === 'Escape' && ativo != null) setCartaoFechado(true)
        }}
      >
        <div ref={ref} className="w-full min-w-0 overflow-x-auto">
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
              aria-describedby={idInstrucoes}
            >
              <g>
                {layout.hexagonos.map((hex) => (
                  <Brilho key={hex.item.id} hex={hex} esmaecido={esmaecida(hex.item.categoria)} />
                ))}
              </g>
              {layout.grupos.map((grupo) => (
                <g
                  key={grupo.categoria}
                  role="group"
                  aria-label={grupo.categoria}
                  data-destaque={grupo.categoria === categoriaSelecionada || undefined}
                >
                  <text
                    aria-hidden="true"
                    opacity={esmaecida(grupo.categoria) ? OPACIDADE_ESMAECIDA * 2 : 1}
                    className={TRANSICAO}
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
                      <Hexagono
                        key={hex.item.id}
                        hex={hex}
                        descritoPor={hex === hexAtivo ? idCartao : undefined}
                        esmaecido={esmaecida(hex.item.categoria)}
                        tabIndex={hex.indice === naOrdemDoTab ? 0 : -1}
                        registrar={registrar}
                        onTecla={aoTeclar}
                        onAtivar={ativar}
                        onDesativar={desativar}
                      />
                    ))}
                </g>
              ))}
              {hexEmFoco && (
                <polygon
                  aria-hidden="true"
                  data-testid="anel-foco"
                  points={pontosHexagono(hexEmFoco.x, hexEmFoco.y, RAIO + 4)}
                  fill="none"
                  stroke={COR_FOCO}
                  strokeWidth={3}
                  strokeLinejoin="round"
                  pointerEvents="none"
                />
              )}
            </svg>
          )}
          <p id={idInstrucoes} className="sr-only">
            Setas movem entre as stacks; Enter abre a stack.
          </p>
        </div>
        {hexAtivo && (
          <CartaoSkill
            id={idCartao}
            skill={hexAtivo.item}
            posicao={posicaoDoCartao(hexAtivo, layout, largura)}
          />
        )}
      </div>
      <Legenda />
    </div>
  )
}
