import { useId, type FormEvent } from 'react'
import { formatarNota } from '../../components/formatacao'
import { DimensoesSchema } from '../../domain/schema'
import type { Dimensoes } from '../../domain/types'
import { InlineEditControls } from './InlineEditControls'
import { useInlineEdit } from './useInlineEdit'

export interface DimensionsEditorProps {
  /** Dimensões salvas da stack. */
  dimensoes: Dimensoes
  /** Persiste as dimensões (ex.: via `atualizar`). Se rejeitar, o erro aparece e os valores ficam. */
  onSalvar(dimensoes: Dimensoes): Promise<unknown>
}

type Nivel = 'teoria' | 'pratica' | 'profundidade'

const NIVEIS: readonly { campo: Nivel; rotulo: string }[] = [
  { campo: 'teoria', rotulo: 'Teoria' },
  { campo: 'pratica', rotulo: 'Prática' },
  { campo: 'profundidade', rotulo: 'Profundidade' },
]

function dimensoesIguais(a: Dimensoes, b: Dimensoes): boolean {
  return (
    a.teoria === b.teoria &&
    a.pratica === b.pratica &&
    a.profundidade === b.profundidade &&
    a.ultimoUso === b.ultimoUso
  )
}

/** Primeira mensagem de erro de validação do último uso, se houver. */
function erroUltimoUso(dimensoes: Dimensoes): string | undefined {
  const resultado = DimensoesSchema.safeParse(dimensoes)
  if (resultado.success) return undefined
  return resultado.error.issues.find((i) => i.path[0] === 'ultimoUso')?.message
}

/** Edição inline de teoria, prática, profundidade (0-10, passo 0,5) e último uso. */
export function DimensionsEditor({ dimensoes, onSalvar }: DimensionsEditorProps) {
  const base = useId()
  const { rascunho, alterado, envio, alterar, desfazer, salvar } = useInlineEdit(
    dimensoes,
    dimensoesIguais,
  )
  const erroData = erroUltimoUso(rascunho)
  const salvando = envio.tipo === 'salvando'

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!alterado || erroData || salvando) return
    void salvar(onSalvar, 'Dimensões salvas.')
  }

  return (
    <form
      noValidate
      aria-label="Editar dimensões"
      onSubmit={enviar}
      className="flex flex-col gap-4"
    >
      {NIVEIS.map(({ campo, rotulo }) => {
        const id = `${base}-${campo}`
        return (
          <div key={campo} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-2">
              <label htmlFor={id} className="text-sm font-medium text-fg">
                {rotulo}
              </label>
              <output
                htmlFor={id}
                aria-hidden="true"
                className="font-semibold tabular-nums text-fg"
              >
                {formatarNota(rascunho[campo])}
              </output>
            </div>
            <input
              id={id}
              type="range"
              min={0}
              max={10}
              step={0.5}
              value={rascunho[campo]}
              aria-valuetext={`${formatarNota(rascunho[campo])} de 10`}
              onChange={(e) => alterar({ [campo]: Number(e.target.value) })}
              className="w-full accent-accent"
            />
          </div>
        )
      })}

      <div className="flex flex-col gap-1">
        <label htmlFor={`${base}-ultimoUso`} className="text-sm font-medium text-fg">
          Último uso
        </label>
        <input
          id={`${base}-ultimoUso`}
          type="date"
          value={rascunho.ultimoUso}
          aria-invalid={erroData ? true : undefined}
          aria-describedby={erroData ? `${base}-ultimoUso-erro` : undefined}
          onChange={(e) => alterar({ ultimoUso: e.target.value })}
          className={`w-full rounded-theme border bg-surface px-3 py-1.5 text-sm text-fg shadow-theme ${erroData ? 'border-danger' : 'border-control'}`}
        />
        {erroData && (
          <p id={`${base}-ultimoUso-erro`} className="text-sm font-medium text-danger">
            {erroData}
          </p>
        )}
      </div>

      <InlineEditControls
        rotuloSalvar="Salvar dimensões"
        envio={envio}
        alterado={alterado}
        invalido={Boolean(erroData)}
        onDesfazer={desfazer}
      />
    </form>
  )
}
