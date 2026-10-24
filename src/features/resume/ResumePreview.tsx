import { useId, useRef, useState, type KeyboardEvent } from 'react'
import type { Evidencia } from '../../domain/types'
import {
  MENSAGEM_CURRICULO_VAZIO,
  TITULO_CONHECIMENTO_TEORICO,
  detalhesDaStack,
  type SelecaoCurriculo,
  type StackCurriculo,
} from './resumeExport'
import type { OpcoesCurriculo } from './resumeOptions'

/** Junta espaços e quebras de linha, como o Markdown faz. */
function normalizar(texto: string): string {
  return texto.replace(/\s+/g, ' ').trim()
}

const MENSAGEM_VAZIO = MENSAGEM_CURRICULO_VAZIO.replace(/^_|_$/g, '')

function ItemEvidencia({ evidencia }: { evidencia: Evidencia }) {
  const url = evidencia.url?.trim() ?? ''
  const titulo = normalizar(evidencia.titulo)
  const descricao = normalizar(evidencia.descricao)
  return (
    <li>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent underline underline-offset-2"
        >
          {titulo || url}
        </a>
      ) : (
        titulo
      )}
      {(url || titulo) && descricao ? ' — ' : ''}
      {descricao}
    </li>
  )
}

function SecaoCurriculo({
  titulo,
  itens,
  opcoes,
}: {
  titulo: string
  itens: StackCurriculo[]
  opcoes: OpcoesCurriculo
}) {
  return (
    <section className="curriculo-categoria flex flex-col gap-2">
      <h3 className="font-heading text-lg font-semibold text-fg">{normalizar(titulo)}</h3>
      <ul className="flex list-disc flex-col gap-1.5 pl-5">
        {itens.map((item) => (
          <li key={item.stack.id}>
            <strong>{normalizar(item.stack.nome)}</strong> —{' '}
            {detalhesDaStack(item, opcoes).join(' · ')}
            {opcoes.incluirEvidencias && item.stack.evidencias.length > 0 && (
              <ul className="mt-1 flex list-[circle] flex-col gap-1 pl-5 text-sm">
                {item.stack.evidencias.map((evidencia, i) => (
                  <ItemEvidencia key={i} evidencia={evidencia} />
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

export interface ResumeDocumentProps {
  selecao: SelecaoCurriculo
  opcoes: OpcoesCurriculo
}

/** O currículo como HTML semântico, montado da mesma seleção que gera o Markdown. */
export function ResumeDocument({ selecao, opcoes }: ResumeDocumentProps) {
  const titulo = normalizar(opcoes.titulo)
  const vazio = selecao.grupos.length === 0 && selecao.conhecimentoTeorico.length === 0

  return (
    <article className="curriculo-impressao flex flex-col gap-5 text-fg">
      {titulo && <h2 className="font-heading text-2xl font-bold">{titulo}</h2>}
      {selecao.grupos.map((grupo) => (
        <SecaoCurriculo
          key={grupo.categoria}
          titulo={grupo.categoria}
          itens={grupo.stacks}
          opcoes={opcoes}
        />
      ))}
      {selecao.conhecimentoTeorico.length > 0 && (
        <SecaoCurriculo
          titulo={TITULO_CONHECIMENTO_TEORICO}
          itens={selecao.conhecimentoTeorico}
          opcoes={opcoes}
        />
      )}
      {vazio && (
        <p className="text-muted">
          <em>{MENSAGEM_VAZIO}</em>
        </p>
      )}
    </article>
  )
}

const ABAS = [
  { id: 'visualizar', rotulo: 'Visualizar' },
  { id: 'markdown', rotulo: 'Markdown' },
] as const
type Aba = (typeof ABAS)[number]['id']

export interface ResumePreviewProps extends ResumeDocumentProps {
  /** Markdown da mesma seleção (markdownDaSelecao). */
  markdown: string
  className?: string
}

const CLASSE_PAINEL = 'rounded-theme border border-border bg-surface p-5 shadow-theme'

/**
 * Preview com abas (padrão WAI-ARIA: setas, Home e End trocam de aba). O painel
 * "Visualizar" fica sempre no DOM, para a impressão usá-lo mesmo com a outra aba ativa.
 */
export function ResumePreview({ selecao, opcoes, markdown, className = '' }: ResumePreviewProps) {
  const base = useId()
  const [aba, setAba] = useState<Aba>('visualizar')
  const refs = useRef<Partial<Record<Aba, HTMLButtonElement | null>>>({})

  const idAba = (id: Aba) => `${base}-aba-${id}`
  const idPainel = (id: Aba) => `${base}-painel-${id}`

  function aoTeclar(e: KeyboardEvent<HTMLDivElement>) {
    const atual = ABAS.findIndex((a) => a.id === aba)
    const destinos: Record<string, number> = {
      ArrowRight: (atual + 1) % ABAS.length,
      ArrowLeft: (atual - 1 + ABAS.length) % ABAS.length,
      Home: 0,
      End: ABAS.length - 1,
    }
    const destino = destinos[e.key]
    if (destino === undefined) return
    e.preventDefault()
    const nova = ABAS[destino].id
    setAba(nova)
    refs.current[nova]?.focus()
  }

  return (
    <section aria-label="Prévia do currículo" className={`flex flex-col gap-3 ${className}`}>
      <div
        role="tablist"
        aria-label="Formato da prévia"
        onKeyDown={aoTeclar}
        data-print="ocultar"
        className="flex gap-1 border-b border-border"
      >
        {ABAS.map(({ id, rotulo }) => {
          const ativa = aba === id
          return (
            <button
              key={id}
              ref={(el) => {
                refs.current[id] = el
              }}
              type="button"
              role="tab"
              id={idAba(id)}
              aria-selected={ativa}
              aria-controls={idPainel(id)}
              tabIndex={ativa ? 0 : -1}
              onClick={() => setAba(id)}
              className={`-mb-px rounded-t-theme border border-b-0 px-4 py-1.5 text-sm font-medium ${
                ativa
                  ? 'border-control bg-surface text-accent'
                  : 'border-transparent text-muted hover:text-fg'
              }`}
            >
              {rotulo}
            </button>
          )
        })}
      </div>

      <div
        role="tabpanel"
        id={idPainel('visualizar')}
        aria-labelledby={idAba('visualizar')}
        hidden={aba !== 'visualizar'}
        tabIndex={0}
        className={`curriculo-painel-visual ${CLASSE_PAINEL}`}
      >
        <ResumeDocument selecao={selecao} opcoes={opcoes} />
      </div>

      <div
        role="tabpanel"
        id={idPainel('markdown')}
        aria-labelledby={idAba('markdown')}
        hidden={aba !== 'markdown'}
        data-print="ocultar"
        className={`flex flex-col gap-2 ${CLASSE_PAINEL}`}
      >
        <label htmlFor={`${base}-markdown`} className="text-sm font-medium text-muted">
          Markdown do currículo
        </label>
        <textarea
          id={`${base}-markdown`}
          readOnly
          value={markdown}
          rows={18}
          spellCheck={false}
          className="w-full resize-y rounded-theme border border-control bg-bg p-3 font-mono text-sm text-fg"
        />
      </div>
    </section>
  )
}
