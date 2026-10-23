import { useEffect, useId, useState, type FormEvent } from 'react'
import { ROTULO_EVIDENCIA } from '../../components/formatacao'
import { EvidenciaSchema } from '../../domain/schema'
import { TIPOS_EVIDENCIA, type Evidencia, type TipoEvidencia } from '../../domain/types'
import { InlineEditControls } from './InlineEditControls'
import { useInlineEdit } from './useInlineEdit'

export interface EvidenceFormProps {
  /** Evidência em edição; ausente ao adicionar uma nova. */
  inicial?: Evidencia
  /** Nome acessível do formulário (ex.: "Nova evidência"). */
  rotulo: string
  /** Persiste a evidência validada. Se rejeitar, o erro aparece e o formulário fica. */
  onSalvar(evidencia: Evidencia): Promise<unknown>
  onCancelar(): void
}

/** Valores de tela: URL vazia significa "sem URL". */
interface ValoresEvidencia {
  titulo: string
  tipo: TipoEvidencia
  url: string
  descricao: string
}

type CampoEvidencia = keyof ValoresEvidencia
type ErrosEvidencia = Partial<Record<CampoEvidencia, string>>

/** Ordem dos campos na tela, para focar o primeiro inválido. */
const CAMPOS: readonly CampoEvidencia[] = ['titulo', 'tipo', 'url', 'descricao']

function paraValores(evidencia?: Evidencia): ValoresEvidencia {
  return {
    titulo: evidencia?.titulo ?? '',
    tipo: evidencia?.tipo ?? 'repo',
    url: evidencia?.url ?? '',
    descricao: evidencia?.descricao ?? '',
  }
}

function valoresIguais(a: ValoresEvidencia, b: ValoresEvidencia): boolean {
  return CAMPOS.every((campo) => a[campo] === b[campo])
}

type Validacao = { ok: true; dados: Evidencia } | { ok: false; erros: ErrosEvidencia }

function validar(valores: ValoresEvidencia): Validacao {
  const url = valores.url.trim()
  const resultado = EvidenciaSchema.safeParse({
    titulo: valores.titulo,
    tipo: valores.tipo,
    descricao: valores.descricao.trim(),
    ...(url && { url }),
  })
  if (resultado.success) return { ok: true, dados: resultado.data }

  const erros: ErrosEvidencia = {}
  for (const issue of resultado.error.issues) {
    const campo = issue.path[0] as CampoEvidencia
    erros[campo] ??= issue.message
  }
  return { ok: false, erros }
}

const CLASSE_CAMPO =
  'w-full rounded-theme border bg-surface px-3 py-1.5 text-sm text-fg shadow-theme'
const CLASSE_BOTAO_SECUNDARIO =
  'rounded-theme border border-border bg-surface px-4 py-2 text-sm font-medium text-fg hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-60'

/**
 * Formulário inline para adicionar ou editar uma evidência. Valida com o
 * schema Zod; os erros aparecem ao sair do campo ou ao tentar salvar.
 */
export function EvidenceForm({ inicial, rotulo, onSalvar, onCancelar }: EvidenceFormProps) {
  const base = useId()
  const { rascunho, alterado, envio, alterar, desfazer, salvar } = useInlineEdit(
    paraValores(inicial),
    valoresIguais,
  )
  const [tocados, setTocados] = useState<Partial<Record<CampoEvidencia, boolean>>>({})
  const [tentouSalvar, setTentouSalvar] = useState(false)
  const validacao = validar(rascunho)
  const salvando = envio.tipo === 'salvando'

  const idCampo = (campo: CampoEvidencia) => `${base}-${campo}`
  const idErro = (campo: CampoEvidencia) => `${base}-${campo}-erro`

  // Ao abrir, o foco vai para o primeiro campo.
  useEffect(() => {
    document.getElementById(`${base}-titulo`)?.focus()
  }, [base])

  function erroDe(campo: CampoEvidencia): string | undefined {
    if (validacao.ok || !(tentouSalvar || tocados[campo])) return undefined
    return validacao.erros[campo]
  }

  function tocar(campo: CampoEvidencia) {
    setTocados((atual) => ({ ...atual, [campo]: true }))
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (salvando) return
    if (!validacao.ok) {
      setTentouSalvar(true)
      const erros = validacao.erros
      const primeiro = CAMPOS.find((campo) => erros[campo])
      if (primeiro) document.getElementById(idCampo(primeiro))?.focus()
      return
    }
    if (!alterado) return
    const dados = validacao.dados
    void salvar(() => onSalvar(dados), 'Evidência salva.')
  }

  function desfazerTudo() {
    desfazer()
    setTocados({})
    setTentouSalvar(false)
  }

  /** Props de acessibilidade de um campo: aria-invalid e descrição (dica e/ou erro). */
  function propsCampo(campo: CampoEvidencia, idDica?: string) {
    const erro = erroDe(campo)
    const descricao = [idDica, erro && idErro(campo)].filter(Boolean).join(' ')
    return {
      id: idCampo(campo),
      'aria-invalid': erro ? true : undefined,
      'aria-describedby': descricao || undefined,
      onBlur: () => tocar(campo),
      className: `${CLASSE_CAMPO} ${erro ? 'border-danger' : 'border-border'}`,
    }
  }

  function mensagemErro(campo: CampoEvidencia) {
    const erro = erroDe(campo)
    if (!erro) return null
    return (
      <p id={idErro(campo)} className="text-sm font-medium text-danger">
        {erro}
      </p>
    )
  }

  return (
    <form
      noValidate
      aria-label={rotulo}
      onSubmit={enviar}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && !salvando) {
          e.stopPropagation()
          onCancelar()
        }
      }}
      className="flex flex-col gap-4 rounded-theme border border-border bg-surface p-4 shadow-theme"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor={idCampo('titulo')} className="text-sm font-medium text-fg">
            Título
          </label>
          <input
            type="text"
            value={rascunho.titulo}
            onChange={(e) => alterar({ titulo: e.target.value })}
            {...propsCampo('titulo')}
          />
          {mensagemErro('titulo')}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={idCampo('tipo')} className="text-sm font-medium text-fg">
            Tipo
          </label>
          <select
            value={rascunho.tipo}
            onChange={(e) => alterar({ tipo: e.target.value as TipoEvidencia })}
            {...propsCampo('tipo')}
          >
            {TIPOS_EVIDENCIA.map((tipo) => (
              <option key={tipo} value={tipo}>
                {ROTULO_EVIDENCIA[tipo]}
              </option>
            ))}
          </select>
          {mensagemErro('tipo')}
        </div>

        <div className="flex flex-col gap-1 sm:col-span-2">
          <label htmlFor={idCampo('url')} className="text-sm font-medium text-fg">
            URL (opcional)
          </label>
          <input
            type="url"
            inputMode="url"
            placeholder="https://"
            value={rascunho.url}
            onChange={(e) => alterar({ url: e.target.value })}
            {...propsCampo('url', `${base}-url-dica`)}
          />
          <p id={`${base}-url-dica`} className="text-xs text-muted">
            Endereço http(s) completo do repositório, projeto ou certificado.
          </p>
          {mensagemErro('url')}
        </div>

        <div className="flex flex-col gap-1 sm:col-span-2">
          <label htmlFor={idCampo('descricao')} className="text-sm font-medium text-fg">
            Descrição
          </label>
          <textarea
            rows={3}
            value={rascunho.descricao}
            onChange={(e) => alterar({ descricao: e.target.value })}
            {...propsCampo('descricao')}
          />
          {mensagemErro('descricao')}
        </div>
      </div>

      <InlineEditControls
        rotuloSalvar="Salvar evidência"
        envio={envio}
        alterado={alterado}
        onDesfazer={desfazerTudo}
        acoesExtras={
          <button
            type="button"
            onClick={onCancelar}
            disabled={salvando}
            className={CLASSE_BOTAO_SECUNDARIO}
          >
            Cancelar
          </button>
        }
      />
    </form>
  )
}
