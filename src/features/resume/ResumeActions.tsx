import { useEffect, useState } from 'react'
import { baixarArquivo, copiarTexto } from './clipboard'

const NOME_ARQUIVO_CURRICULO = 'curriculo-stacks.md'

export interface ResumeActionsProps {
  markdown: string
  className?: string
}

type Aviso = { tipo: 'ok' | 'erro'; texto: string } | null

const DURACAO_AVISO_MS = 4000

const CLASSE_BOTAO =
  'rounded-theme border border-border bg-surface px-3 py-1.5 text-sm font-medium text-fg shadow-theme hover:bg-surface-2'

/** Copiar o Markdown, baixar o .md e imprimir, com aviso por aria-live. */
export function ResumeActions({ markdown, className = '' }: ResumeActionsProps) {
  const [aviso, setAviso] = useState<Aviso>(null)

  useEffect(() => {
    if (!aviso) return
    const id = setTimeout(() => setAviso(null), DURACAO_AVISO_MS)
    return () => clearTimeout(id)
  }, [aviso])

  async function copiar() {
    try {
      await copiarTexto(markdown)
      setAviso({ tipo: 'ok', texto: 'Copiado!' })
    } catch {
      setAviso({
        tipo: 'erro',
        texto: 'Não foi possível copiar. Abra a aba Markdown e copie o texto manualmente.',
      })
    }
  }

  return (
    <div data-print="ocultar" className={`flex flex-wrap items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={() => void copiar()}
        className={`${CLASSE_BOTAO} border-accent text-accent`}
      >
        Copiar Markdown
      </button>
      <button
        type="button"
        onClick={() => baixarArquivo(markdown, NOME_ARQUIVO_CURRICULO)}
        className={CLASSE_BOTAO}
      >
        Baixar .md
      </button>
      <button type="button" onClick={() => window.print()} className={CLASSE_BOTAO}>
        Imprimir
      </button>
      <p
        role="status"
        aria-live="polite"
        className={`text-sm ${aviso?.tipo === 'erro' ? 'text-danger' : 'text-success'}`}
      >
        {aviso?.texto}
      </p>
    </div>
  )
}
