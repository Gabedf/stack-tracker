import { useId, useLayoutEffect, useRef, useState } from 'react'

export interface DeleteStackButtonProps {
  /** Nome exibido na confirmação. */
  nome: string
  /** Executa a exclusão. Se rejeitar, o erro aparece num alerta. */
  onConfirm(): Promise<unknown>
}

const CLASSE_BOTAO =
  'rounded-theme border px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60'

/**
 * Exclusão com confirmação inline. Ao abrir, o foco vai para "Cancelar
 * exclusão" (a opção segura); ao cancelar (botão ou Esc), volta ao botão
 * que abriu a confirmação.
 */
export function DeleteStackButton({ nome, onConfirm }: DeleteStackButtonProps) {
  const base = useId()
  const [confirmando, setConfirmando] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const gatilhoRef = useRef<HTMLButtonElement>(null)
  const cancelarRef = useRef<HTMLButtonElement>(null)

  useLayoutEffect(() => {
    if (confirmando) cancelarRef.current?.focus()
  }, [confirmando])

  function cancelar() {
    setConfirmando(false)
    setErro(null)
    gatilhoRef.current?.focus()
  }

  async function confirmar() {
    setErro(null)
    setExcluindo(true)
    try {
      await onConfirm()
    } catch (e) {
      setErro(e instanceof Error && e.message ? e.message : 'Não foi possível excluir a stack.')
    } finally {
      setExcluindo(false)
    }
  }

  const idPainel = `${base}-confirmacao`
  const idTitulo = `${base}-titulo`
  const idDescricao = `${base}-descricao`

  return (
    <div className="flex flex-col items-start gap-3">
      <button
        ref={gatilhoRef}
        type="button"
        aria-expanded={confirmando}
        aria-controls={confirmando ? idPainel : undefined}
        onClick={() => setConfirmando(true)}
        className={`${CLASSE_BOTAO} border-danger bg-surface text-danger hover:bg-surface-2`}
      >
        Excluir stack
      </button>

      {confirmando && (
        <div
          id={idPainel}
          role="group"
          aria-labelledby={idTitulo}
          aria-describedby={idDescricao}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && !excluindo) {
              e.stopPropagation()
              cancelar()
            }
          }}
          className="flex w-full flex-col gap-3 rounded-theme border border-danger bg-surface p-4 shadow-theme"
        >
          <p id={idTitulo} className="font-heading font-semibold text-fg">
            Excluir “{nome}”?
          </p>
          <p id={idDescricao} className="text-sm text-muted">
            A stack e todo o histórico dela serão removidos. Esta ação não pode ser desfeita.
          </p>
          {erro && (
            <p role="alert" className="text-sm font-medium text-danger">
              {erro}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={excluindo}
              onClick={confirmar}
              className={`${CLASSE_BOTAO} border-danger bg-danger text-accent-contrast`}
            >
              {excluindo ? 'Excluindo…' : 'Confirmar exclusão'}
            </button>
            <button
              ref={cancelarRef}
              type="button"
              disabled={excluindo}
              onClick={cancelar}
              className={`${CLASSE_BOTAO} border-border bg-surface text-fg hover:bg-surface-2`}
            >
              Cancelar exclusão
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
