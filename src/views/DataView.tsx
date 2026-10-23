import { useDocumentTitle } from '../components/layout'
import { ExportSection, ImportSection } from '../features/data'
import { useStacks } from '../features/stacks'

export interface DataViewProps {
  /** Data de referência (nome do arquivo exportado). Padrão: agora. */
  hoje?: Date
}

/** Exportar e importar os dados do painel em JSON. */
export function DataView({ hoje }: DataViewProps) {
  useDocumentTitle('Dados')
  const { stacks, status, erro, substituirTudo } = useStacks()

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Dados</h1>
        <p className="text-muted">
          Faça backup das suas stacks em JSON ou traga de volta um arquivo exportado antes.
        </p>
      </div>

      {status === 'carregando' && (
        <p role="status" className="text-muted">
          Carregando stacks…
        </p>
      )}
      {status === 'erro' && (
        <div role="alert" className="rounded-theme border border-danger bg-surface p-4 text-fg">
          <p className="font-semibold">Não foi possível carregar as stacks.</p>
          {erro && <p className="text-sm text-muted">{erro.message}</p>}
        </div>
      )}

      <ExportSection stacks={stacks} desabilitado={status !== 'pronto'} hoje={hoje} />
      <ImportSection
        stacks={stacks}
        onImportar={substituirTudo}
        desabilitado={status !== 'pronto'}
      />
    </section>
  )
}
