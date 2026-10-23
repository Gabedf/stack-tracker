import { useEffect, useId, useRef, useState } from 'react'
import { ROTULO_EVIDENCIA } from '../../components/formatacao'
import type { Evidencia, TipoEvidencia } from '../../domain/types'
import { EvidenceForm } from './EvidenceForm'

export interface EvidenceListProps {
  /** Evidências salvas da stack. */
  evidencias: readonly Evidencia[]
  /**
   * Persiste a nova lista de evidências (ex.: via `atualizar`). Se rejeitar, o
   * erro aparece e o formulário continua aberto.
   */
  onSalvar(evidencias: Evidencia[]): Promise<unknown>
}

type Modo = { tipo: 'lista' } | { tipo: 'adicionando' } | { tipo: 'editando'; indice: number }

/** Ícone decorativo de cada tipo (o rótulo em texto vem ao lado). */
const ICONE_EVIDENCIA: Record<TipoEvidencia, string> = {
  repo: '⑂',
  projeto: '◆',
  emprego: '▣',
  certificado: '✓',
}

const CLASSE_BOTAO =
  'rounded-theme border border-border bg-surface px-3 py-1.5 text-sm font-medium text-fg hover:bg-surface-2'

function TipoEvidenciaBadge({ tipo }: { tipo: TipoEvidencia }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-xs font-medium text-muted">
      <span aria-hidden="true">{ICONE_EVIDENCIA[tipo]}</span>
      {ROTULO_EVIDENCIA[tipo]}
    </span>
  )
}

function TituloEvidencia({ evidencia }: { evidencia: Evidencia }) {
  if (!evidencia.url) return <>{evidencia.titulo}</>
  return (
    <a
      href={evidencia.url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-accent underline underline-offset-2"
    >
      {evidencia.titulo}
      <span className="sr-only"> (abre em nova aba)</span>
    </a>
  )
}

/**
 * Evidências da stack: lista com tipo, título (link externo se houver URL) e
 * descrição, com adicionar e editar inline. Ao fechar um formulário, o foco
 * volta ao botão que o abriu.
 */
export function EvidenceList({ evidencias, onSalvar }: EvidenceListProps) {
  const base = useId()
  const [modo, setModo] = useState<Modo>({ tipo: 'lista' })
  const [mensagem, setMensagem] = useState('')
  /** Id do elemento a focar depois do próximo render. */
  const focoPendente = useRef<string | null>(null)

  const idAdicionar = `${base}-adicionar`
  const idEditar = (i: number) => `${base}-editar-${i}`

  useEffect(() => {
    const id = focoPendente.current
    if (id === null) return
    focoPendente.current = null
    document.getElementById(id)?.focus()
  })

  function abrir(novo: Modo) {
    setMensagem('')
    setModo(novo)
  }

  function fechar(idFoco: string, mensagemSucesso = '') {
    focoPendente.current = idFoco
    setModo({ tipo: 'lista' })
    setMensagem(mensagemSucesso)
  }

  async function adicionar(evidencia: Evidencia) {
    await onSalvar([...evidencias, evidencia])
    fechar(idAdicionar, 'Evidência adicionada.')
  }

  async function editar(indice: number, evidencia: Evidencia) {
    await onSalvar(evidencias.map((e, i) => (i === indice ? evidencia : e)))
    fechar(idEditar(indice), 'Evidência atualizada.')
  }

  return (
    <div className="flex flex-col gap-3">
      {evidencias.length === 0 ? (
        <p className="rounded-theme border border-dashed border-border bg-surface-2 p-4 text-sm text-muted">
          Nenhuma evidência ainda. Adicione repositórios, projetos, empregos ou certificados:
          evidências aumentam a nota da stack.
        </p>
      ) : (
        <ul aria-label="Lista de evidências" className="flex flex-col gap-3">
          {evidencias.map((evidencia, i) => (
            <li
              key={`${evidencia.titulo}-${i}`}
              className="flex flex-col gap-2 rounded-theme border border-border bg-surface-2 p-3"
            >
              {modo.tipo === 'editando' && modo.indice === i ? (
                <EvidenceForm
                  inicial={evidencia}
                  rotulo={`Editar evidência ${evidencia.titulo}`}
                  onSalvar={(editada) => editar(i, editada)}
                  onCancelar={() => fechar(idEditar(i))}
                />
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <TipoEvidenciaBadge tipo={evidencia.tipo} />
                    <h3 className="min-w-0 font-semibold break-words text-fg">
                      <TituloEvidencia evidencia={evidencia} />
                    </h3>
                  </div>
                  {evidencia.descricao && (
                    <p className="text-sm text-muted">{evidencia.descricao}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button
                      id={idEditar(i)}
                      type="button"
                      onClick={() => abrir({ tipo: 'editando', indice: i })}
                      className={CLASSE_BOTAO}
                    >
                      Editar<span className="sr-only"> evidência {evidencia.titulo}</span>
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {modo.tipo === 'adicionando' ? (
        <EvidenceForm
          rotulo="Nova evidência"
          onSalvar={adicionar}
          onCancelar={() => fechar(idAdicionar)}
        />
      ) : (
        <div>
          <button
            id={idAdicionar}
            type="button"
            onClick={() => abrir({ tipo: 'adicionando' })}
            className="rounded-theme border border-accent bg-accent px-4 py-2 text-sm font-semibold text-accent-contrast"
          >
            Adicionar evidência
          </button>
        </div>
      )}

      {/* Sempre no DOM para o aria-live anunciar a mudança de texto. */}
      <p role="status" aria-live="polite" className="text-sm font-medium text-success">
        {mensagem}
      </p>
    </div>
  )
}
