import type { EstadoEnvio } from './useInlineEdit'

export interface InlineEditControlsProps {
  /** Texto do botão de salvar (ex.: "Salvar dimensões"). */
  rotuloSalvar: string
  envio: EstadoEnvio
  alterado: boolean
  /** Rascunho inválido: bloqueia o salvar (o motivo aparece junto ao campo). */
  invalido?: boolean
  onDesfazer(): void
}

const CLASSE_BOTAO_PRIMARIO =
  'rounded-theme border border-accent bg-accent px-4 py-2 text-sm font-semibold text-accent-contrast disabled:cursor-not-allowed disabled:opacity-60'
const CLASSE_BOTAO_SECUNDARIO =
  'rounded-theme border border-border bg-surface px-4 py-2 text-sm font-medium text-fg hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-60'

/**
 * Botões Salvar (submit) e Desfazer de um editor inline, com região de status
 * (sucesso, anunciada por aria-live) e alerta de erro.
 */
export function InlineEditControls({
  rotuloSalvar,
  envio,
  alterado,
  invalido = false,
  onDesfazer,
}: InlineEditControlsProps) {
  const salvando = envio.tipo === 'salvando'

  return (
    <div className="flex flex-col gap-2">
      {envio.tipo === 'erro' && (
        <div
          role="alert"
          className="rounded-theme border border-danger bg-surface p-3 text-sm text-fg"
        >
          <p className="font-semibold">{envio.mensagem}</p>
          {envio.detalhes.length > 0 && (
            <ul className="mt-1 list-disc pl-5 text-muted">
              {envio.detalhes.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          )}
          <p className="mt-1 text-muted">Seus valores continuam aqui; tente salvar de novo.</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={!alterado || invalido || salvando}
          className={CLASSE_BOTAO_PRIMARIO}
        >
          {salvando ? 'Salvando…' : rotuloSalvar}
        </button>
        <button
          type="button"
          onClick={onDesfazer}
          disabled={!alterado || salvando}
          className={CLASSE_BOTAO_SECUNDARIO}
        >
          Desfazer
        </button>
        {/* Sempre no DOM para o aria-live anunciar a mudança de texto. */}
        <p role="status" aria-live="polite" className="text-sm font-medium text-success">
          {envio.tipo === 'sucesso' ? envio.mensagem : ''}
        </p>
      </div>
    </div>
  )
}
