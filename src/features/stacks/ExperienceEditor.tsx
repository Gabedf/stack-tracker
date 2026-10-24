import { useId, type FormEvent } from 'react'
import { ROTULO_EXPERIENCIA } from '../../components/formatacao'
import { ExperienciaSchema } from '../../domain/schema'
import { TIPOS_EXPERIENCIA, type Experiencia, type TipoExperiencia } from '../../domain/types'
import { InlineEditControls } from './InlineEditControls'
import { useInlineEdit } from './useInlineEdit'

export interface ExperienceEditorProps {
  /** Experiência salva da stack. */
  experiencia: Experiencia
  /** Persiste a experiência (ex.: via `atualizar`). Se rejeitar, o erro aparece e os valores ficam. */
  onSalvar(experiencia: Experiencia): Promise<unknown>
}

/** Valores de tela: meses como texto do input numérico. */
interface ValoresExperiencia {
  tipo: TipoExperiencia
  meses: string
}

function paraNumero(texto: string): number {
  return texto.trim() === '' ? Number.NaN : Number(texto)
}

function valoresIguais(a: ValoresExperiencia, b: ValoresExperiencia): boolean {
  return a.tipo === b.tipo && paraNumero(a.meses) === paraNumero(b.meses)
}

type Validacao = { ok: true; dados: Experiencia } | { ok: false; erroMeses: string }

function validar(valores: ValoresExperiencia): Validacao {
  const resultado = ExperienciaSchema.safeParse(
    { tipo: valores.tipo, meses: paraNumero(valores.meses) },
    {
      error: (issue) =>
        issue.code === 'invalid_type' && issue.expected === 'number'
          ? 'Informe um número.'
          : undefined,
    },
  )
  if (resultado.success) return { ok: true, dados: resultado.data }
  return { ok: false, erroMeses: resultado.error.issues[0]?.message ?? 'Valor inválido.' }
}

/** Edição inline do tipo de experiência e dos meses. */
export function ExperienceEditor({ experiencia, onSalvar }: ExperienceEditorProps) {
  const base = useId()
  const original: ValoresExperiencia = {
    tipo: experiencia.tipo,
    meses: String(experiencia.meses),
  }
  const { rascunho, alterado, envio, alterar, desfazer, salvar } = useInlineEdit(
    original,
    valoresIguais,
  )
  const validacao = validar(rascunho)
  const erroMeses = validacao.ok ? undefined : validacao.erroMeses
  const salvando = envio.tipo === 'salvando'

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!alterado || !validacao.ok || salvando) return
    const dados = validacao.dados
    void salvar(() => onSalvar(dados), 'Experiência salva.')
  }

  return (
    <form
      noValidate
      aria-label="Editar experiência"
      onSubmit={enviar}
      className="flex flex-col gap-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor={`${base}-tipo`} className="text-sm font-medium text-fg">
            Tipo de experiência
          </label>
          <select
            id={`${base}-tipo`}
            value={rascunho.tipo}
            onChange={(e) => alterar({ tipo: e.target.value as TipoExperiencia })}
            className="w-full rounded-theme border border-control bg-surface px-3 py-1.5 text-sm text-fg shadow-theme"
          >
            {TIPOS_EXPERIENCIA.map((tipo) => (
              <option key={tipo} value={tipo}>
                {ROTULO_EXPERIENCIA[tipo]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={`${base}-meses`} className="text-sm font-medium text-fg">
            Meses de experiência
          </label>
          <input
            id={`${base}-meses`}
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={rascunho.meses}
            aria-invalid={erroMeses ? true : undefined}
            aria-describedby={erroMeses ? `${base}-meses-erro` : undefined}
            onChange={(e) => alterar({ meses: e.target.value })}
            className={`w-full rounded-theme border bg-surface px-3 py-1.5 text-sm text-fg shadow-theme ${erroMeses ? 'border-danger' : 'border-control'}`}
          />
          {erroMeses && (
            <p id={`${base}-meses-erro`} className="text-sm font-medium text-danger">
              {erroMeses}
            </p>
          )}
        </div>
      </div>

      <InlineEditControls
        rotuloSalvar="Salvar experiência"
        envio={envio}
        alterado={alterado}
        invalido={!validacao.ok}
        onDesfazer={desfazer}
      />
    </form>
  )
}
