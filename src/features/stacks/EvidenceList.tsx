import { useId, useLayoutEffect, useRef, useState, type ReactElement } from 'react'
import { ROTULO_EVIDENCIA } from '../../components/formatacao'
import {
  IconeCertificado,
  IconeEmprego,
  IconeProjeto,
  IconeRepositorio,
  type IconeProps,
} from '../../components/icons'
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

type Modo =
  | { tipo: 'lista' }
  | { tipo: 'adicionando' }
  | { tipo: 'editando'; indice: number }
  | { tipo: 'removendo'; indice: number }

/** Ícone decorativo de cada tipo (o rótulo em texto vem ao lado). */
const ICONE_EVIDENCIA: Record<TipoEvidencia, (props: IconeProps) => ReactElement> = {
  repo: IconeRepositorio,
  projeto: IconeProjeto,
  emprego: IconeEmprego,
  certificado: IconeCertificado,
}

const CLASSE_BOTAO =
  'rounded-theme border border-control bg-surface px-3 py-1.5 text-sm font-medium text-fg hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-60'
const CLASSE_BOTAO_PERIGO =
  'rounded-theme border border-danger bg-surface px-3 py-1.5 text-sm font-medium text-danger hover:bg-surface-2'

function TipoEvidenciaBadge({ tipo }: { tipo: TipoEvidencia }) {
  const Icone = ICONE_EVIDENCIA[tipo]
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-xs font-medium text-muted">
      <Icone />
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

interface ConfirmarRemocaoProps {
  titulo: string
  onConfirmar(): Promise<unknown>
  onCancelar(): void
}

/**
 * Confirmação inline de remoção. Ao abrir, o foco vai para "Cancelar remoção"
 * (a opção segura); Esc também cancela.
 */
function ConfirmarRemocao({ titulo, onConfirmar, onCancelar }: ConfirmarRemocaoProps) {
  const base = useId()
  const [removendo, setRemovendo] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const cancelarRef = useRef<HTMLButtonElement>(null)

  useLayoutEffect(() => {
    cancelarRef.current?.focus()
  }, [])

  async function confirmar() {
    setErro(null)
    setRemovendo(true)
    try {
      await onConfirmar()
    } catch (e) {
      setErro(e instanceof Error && e.message ? e.message : 'Não foi possível remover a evidência.')
      setRemovendo(false)
    }
  }

  return (
    <div
      role="group"
      aria-labelledby={`${base}-titulo`}
      aria-describedby={`${base}-descricao`}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && !removendo) {
          e.stopPropagation()
          onCancelar()
        }
      }}
      className="flex flex-col gap-3 rounded-theme border border-danger bg-surface p-3"
    >
      <p id={`${base}-titulo`} className="font-heading font-semibold text-fg">
        Remover “{titulo}”?
      </p>
      <p id={`${base}-descricao`} className="text-sm text-muted">
        A evidência sai da stack e a nota é recalculada.
      </p>
      {erro && (
        <p role="alert" className="text-sm font-medium text-danger">
          {erro}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={removendo}
          onClick={confirmar}
          className="rounded-theme border border-danger bg-danger px-3 py-1.5 text-sm font-medium text-accent-contrast disabled:cursor-not-allowed disabled:opacity-60"
        >
          {removendo ? 'Removendo…' : 'Confirmar remoção'}
        </button>
        <button
          ref={cancelarRef}
          type="button"
          disabled={removendo}
          onClick={onCancelar}
          className={CLASSE_BOTAO}
        >
          Cancelar remoção
        </button>
      </div>
    </div>
  )
}

/**
 * Evidências da stack: lista com tipo, título (link externo se houver URL) e
 * descrição, com adicionar, editar e remover inline. Ao fechar um formulário, o foco
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
  const idRemover = (i: number) => `${base}-remover-${i}`

  useLayoutEffect(() => {
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

  async function remover(indice: number) {
    await onSalvar(evidencias.filter((_, i) => i !== indice))
    // O item some: o foco vai para "Adicionar evidência".
    fechar(idAdicionar, 'Evidência removida.')
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
                    <button
                      id={idRemover(i)}
                      type="button"
                      aria-expanded={modo.tipo === 'removendo' && modo.indice === i}
                      onClick={() => abrir({ tipo: 'removendo', indice: i })}
                      className={CLASSE_BOTAO_PERIGO}
                    >
                      Remover<span className="sr-only"> evidência {evidencia.titulo}</span>
                    </button>
                  </div>
                  {modo.tipo === 'removendo' && modo.indice === i && (
                    <ConfirmarRemocao
                      titulo={evidencia.titulo}
                      onConfirmar={() => remover(i)}
                      onCancelar={() => fechar(idRemover(i))}
                    />
                  )}
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
