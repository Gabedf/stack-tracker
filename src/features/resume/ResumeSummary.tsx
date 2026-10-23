import { ROTULO_MOTIVO_EXCLUSAO, type SelecaoCurriculo } from './resumeExport'

export interface ResumeSummaryProps {
  selecao: SelecaoCurriculo
  className?: string
}

/** Quantas stacks entraram no currículo; as de fora ficam num <details> com o motivo. */
export function ResumeSummary({ selecao, className = '' }: ResumeSummaryProps) {
  const incluidas =
    selecao.grupos.reduce((total, g) => total + g.stacks.length, 0) +
    selecao.conhecimentoTeorico.length
  const fora = selecao.excluidas.length

  return (
    <div data-print="ocultar" className={`flex flex-col gap-2 text-sm ${className}`}>
      <p className="font-medium text-fg">
        {incluidas} {incluidas === 1 ? 'stack incluída' : 'stacks incluídas'}, {fora} de fora
      </p>
      {fora > 0 && (
        <details className="rounded-theme border border-border bg-surface px-3 py-2">
          <summary className="cursor-pointer text-muted hover:text-fg">
            Ver as que ficaram de fora
          </summary>
          <ul aria-label="Stacks de fora" className="mt-2 flex flex-col gap-1">
            {selecao.excluidas.map(({ stack, motivo }) => (
              <li key={stack.id} className="text-fg">
                <span className="font-medium">{stack.nome}</span>
                <span className="text-muted"> — {ROTULO_MOTIVO_EXCLUSAO[motivo]}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
