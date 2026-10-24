import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { CategoryRadar } from '../components/charts/CategoryRadar'
import { EmptyState } from '../components/EmptyState'
import { formatarNota } from '../components/formatacao'
import { useDocumentTitle } from '../components/layout'
import { LevelBadge } from '../components/LevelBadge'
import {
  calcularPersonagem,
  formatarXp,
  SkillHoneycomb,
  skillsDaColmeia,
  XpBar,
  type HabilidadeCategoria,
  type Personagem,
} from '../features/character'
import { useStacks } from '../features/stacks'
import { ehTemaDeJogo, useTheme } from '../themes'

export interface CharacterSheetViewProps {
  /** Data de referência para as notas (decaimento). Padrão: o momento da montagem. */
  hoje?: Date
}

/** Nome exibido no topo da ficha. */
export const NOME_PERSONAGEM = 'Personagem'

const CLASSE_BOTAO =
  'rounded-theme border border-control bg-surface px-3 py-1.5 text-sm font-medium text-fg hover:bg-surface-2'
const CLASSE_PAINEL =
  'flex flex-col gap-3 rounded-theme border border-border bg-surface p-4 shadow-theme painel'

function Painel({ id, titulo, children }: { id: string; titulo: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className={CLASSE_PAINEL}>
      <h2 id={id} className="font-heading text-lg font-semibold text-fg">
        {titulo}
      </h2>
      {children}
    </section>
  )
}

/** Aviso fora dos temas de jogo: a ficha é pensada para o tema RPG. */
function AvisoTema() {
  const { tema, setTema } = useTheme()
  if (ehTemaDeJogo(tema)) return null

  return (
    <div
      role="note"
      aria-label="Aviso de tema"
      className="flex flex-wrap items-center justify-between gap-3 rounded-theme border border-accent bg-surface p-4 text-fg"
    >
      <p>A ficha do personagem foi feita para o tema RPG.</p>
      <button type="button" onClick={() => setTema('rpg')} className={CLASSE_BOTAO}>
        Ativar tema RPG
      </button>
    </div>
  )
}

function Total({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div className="flex flex-col rounded-theme border border-border bg-surface-2 px-3 py-2">
      <dt className="text-xs text-muted">{rotulo}</dt>
      <dd className="text-xl font-semibold tabular-nums text-fg">{valor}</dd>
    </div>
  )
}

function Cabecalho({ personagem }: { personagem: Personagem }) {
  const { classe, titulo, progresso, totais } = personagem

  return (
    <section
      aria-labelledby="ficha-nome"
      className="flex flex-col gap-4 rounded-theme border border-border bg-surface p-5 shadow-theme painel"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="ficha-nome" className="font-heading text-2xl font-bold text-fg">
            {NOME_PERSONAGEM}
          </h2>
          <dl className="flex flex-col gap-0.5">
            <div className="flex gap-1.5">
              <dt className="text-muted">Classe:</dt>
              <dd className="font-semibold text-accent">{classe.nome}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-muted">Título:</dt>
              <dd className="font-semibold text-fg">
                {titulo.nome}{' '}
                <span className="text-sm font-normal text-muted">
                  (nota média {formatarNota(personagem.notaMedia)})
                </span>
              </dd>
            </div>
          </dl>
        </div>

        <p className="flex size-24 shrink-0 flex-col items-center justify-center rounded-full border-2 border-accent bg-surface-2 shadow-glow">
          <span className="text-xs uppercase tracking-wide text-muted">Nível</span>{' '}
          <span
            data-testid="nivel-personagem"
            className="font-heading text-4xl font-bold leading-none text-accent"
          >
            {progresso.nivel}
          </span>
        </p>
      </div>

      <XpBar progresso={progresso} rotulo="XP do personagem" />

      <dl aria-label="Totais" className="grid grid-cols-3 gap-3">
        <Total rotulo="Stacks" valor={totais.stacks} />
        <Total rotulo="Evidências" valor={totais.evidencias} />
        <Total rotulo="Sei por saber" valor={totais.seiPorSaber} />
      </dl>
    </section>
  )
}

function Habilidades({ habilidades }: { habilidades: HabilidadeCategoria[] }) {
  return (
    <ul aria-label="Categorias" className="flex flex-col gap-4">
      {habilidades.map((h) => (
        <li key={h.categoria} className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-fg">{h.categoria}</span>
            <span className="flex flex-wrap items-center gap-2 text-sm text-muted">
              <span className="font-semibold text-fg">Nível {h.nivel}</span>
              <span className="tabular-nums">{formatarXp(h.xp)} XP</span>
              <LevelBadge nota={h.notaMedia} />
            </span>
          </div>
          <XpBar progresso={h} rotulo={`XP de ${h.categoria}`} compacta />
          <p className="text-xs text-muted">
            {h.quantidade === 1 ? '1 stack' : `${h.quantidade} stacks`} · nota média{' '}
            {formatarNota(h.notaMedia)}
          </p>
        </li>
      ))}
    </ul>
  )
}

export function CharacterSheetView({ hoje }: CharacterSheetViewProps) {
  useDocumentTitle('Ficha do personagem')
  const { stacks, status, erro, recarregar } = useStacks()
  const [montagem] = useState(() => new Date())
  const referencia = hoje ?? montagem
  const [selecionada, setSelecionada] = useState<string | null>(null)
  const alternarCategoria = (categoria: string) =>
    setSelecionada((atual) => (atual === categoria ? null : categoria))

  let conteudo
  if (status === 'carregando') {
    conteudo = (
      <p role="status" className="text-muted">
        Carregando a ficha…
      </p>
    )
  } else if (status === 'erro') {
    conteudo = (
      <div
        role="alert"
        className="flex flex-col items-start gap-3 rounded-theme border border-danger bg-surface p-4 text-fg"
      >
        <div>
          <p className="font-semibold">Não foi possível carregar as stacks.</p>
          {erro && <p className="text-sm text-muted">{erro.message}</p>}
        </div>
        <button
          type="button"
          onClick={() => recarregar().catch(() => undefined)}
          className={CLASSE_BOTAO}
        >
          Tentar de novo
        </button>
      </div>
    )
  } else if (stacks.length === 0) {
    conteudo = (
      <EmptyState
        titulo="Ficha em branco"
        texto="Seu personagem ainda é um Recruta. Cada stack adicionada vira XP, define sua classe e sobe seu nível."
        acao={
          <Link to="/stacks" className="font-medium text-accent underline underline-offset-2">
            Adicionar stacks
          </Link>
        }
      />
    )
  } else {
    const personagem = calcularPersonagem(stacks, { hoje: referencia })
    const { habilidades } = personagem
    const destaque = habilidades.some((h) => h.categoria === selecionada) ? selecionada : null

    conteudo = (
      <div className="flex flex-col gap-6">
        <Cabecalho personagem={personagem} />

        <div className="grid gap-6 md:grid-cols-2">
          <Painel id="ficha-radar" titulo="Radar">
            <p className="text-sm text-muted">
              Nota média por categoria. Escolha uma categoria para destacar suas skills na colmeia.
            </p>
            <CategoryRadar
              itens={habilidades.map((h) => ({
                categoria: h.categoria,
                valor: h.notaMedia,
                quantidade: h.quantidade,
              }))}
              rotuloValor="Nota média"
              selecionada={destaque}
              onSelecionar={alternarCategoria}
            />
          </Painel>

          <Painel id="ficha-habilidades" titulo="Habilidades por categoria">
            <Habilidades habilidades={habilidades} />
          </Painel>
        </div>

        <Painel id="ficha-colmeia" titulo="Colmeia de skills">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
            <p aria-live="polite">
              {destaque ? (
                <>
                  Destaque: <span className="font-semibold text-fg">{destaque}</span>
                </>
              ) : (
                'Uma stack por hexágono, por categoria e nota.'
              )}
            </p>
            {destaque && (
              <button type="button" onClick={() => setSelecionada(null)} className={CLASSE_BOTAO}>
                Limpar destaque
              </button>
            )}
          </div>
          <SkillHoneycomb
            skills={skillsDaColmeia(stacks, { hoje: referencia })}
            ordemCategorias={habilidades.map((h) => h.categoria)}
            categoriaSelecionada={destaque}
          />
        </Painel>
      </div>
    )
  }

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-heading text-3xl font-bold">Ficha do personagem</h1>
        <p className="text-muted">Suas stacks como atributos: classe, nível e XP.</p>
      </div>
      <AvisoTema />
      {conteudo}
    </section>
  )
}
