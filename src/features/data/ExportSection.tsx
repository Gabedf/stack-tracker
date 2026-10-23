import { useId } from 'react'
import { baixarArquivo } from '../resume'
import { prepararExportacao } from './importExport'
import type { Stack } from '../../domain/types'

export interface ExportSectionProps {
  stacks: readonly Stack[]
  /** Desliga o botão (ex.: dados ainda carregando). */
  desabilitado?: boolean
  /** Data usada no nome do arquivo. Padrão: o momento do clique. */
  hoje?: Date
}

const CLASSE_BOTAO =
  'rounded-theme border border-accent bg-surface px-4 py-2 text-sm font-medium text-accent shadow-theme hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-60'

function rotuloStacks(n: number): string {
  return n === 1 ? '1 stack' : `${n} stacks`
}

/** Baixa todas as stacks como JSON (StacksFile versão 1). */
export function ExportSection({ stacks, desabilitado = false, hoje }: ExportSectionProps) {
  const idTitulo = useId()

  function baixar() {
    const { texto, nomeArquivo } = prepararExportacao(stacks, hoje ?? new Date())
    baixarArquivo(texto, nomeArquivo, 'application/json;charset=utf-8')
  }

  return (
    <section
      aria-labelledby={idTitulo}
      className="space-y-3 rounded-theme border border-border bg-surface p-4 shadow-theme"
    >
      <h2 id={idTitulo} className="text-xl font-semibold">
        Exportar
      </h2>
      <p className="text-sm text-muted">
        Baixa um arquivo JSON com {rotuloStacks(stacks.length)}, histórico e evidências. Serve de
        backup e pode ser importado de volta aqui.
      </p>
      <button type="button" onClick={baixar} disabled={desabilitado} className={CLASSE_BOTAO}>
        Baixar JSON
      </button>
    </section>
  )
}
