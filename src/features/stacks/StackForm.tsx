import { useId, useLayoutEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { formatarNota, ROTULO_EXPERIENCIA } from '../../components/formatacao'
import { LevelBadge } from '../../components/LevelBadge'
import { calcularNota } from '../../domain/scoring'
import { TIPOS_EXPERIENCIA, type Stack, type TipoExperiencia } from '../../domain/types'
import { StorageError } from '../../storage'
import {
  primeiroCampoInvalido,
  stackDePreview,
  validarStackForm,
  valoresIniciais,
  type CampoForm,
  type DadosStackForm,
  type ErrosStackForm,
  type ValoresStackForm,
} from './stackFormModel'

export interface StackFormProps {
  /** Stack a editar; sem ela, o formulário começa em branco (criação). */
  inicial?: Stack
  /** Recebe os dados validados. Se rejeitar, o erro aparece num alerta e nada é perdido. */
  onSubmit(dados: DadosStackForm): Promise<unknown> | void
  onCancel(): void
  /** Categorias existentes, sugeridas no campo Categoria. */
  categorias?: readonly string[]
  /** Escrita pendente em outro lugar (ex.: provider): também bloqueia o Salvar. */
  salvando?: boolean
  /** Data de referência para o preview da nota e o último uso padrão. */
  hoje?: Date
}

type Dimensao = 'teoria' | 'pratica' | 'profundidade'

const DIMENSOES: readonly { campo: Dimensao; rotulo: string }[] = [
  { campo: 'teoria', rotulo: 'Teoria' },
  { campo: 'pratica', rotulo: 'Prática' },
  { campo: 'profundidade', rotulo: 'Profundidade' },
]

const CLASSE_CAMPO =
  'w-full rounded-theme border bg-surface px-3 py-1.5 text-sm text-fg shadow-theme placeholder:text-muted'
const CLASSE_ROTULO = 'text-sm font-medium text-fg'
const CLASSE_DICA = 'text-xs text-muted'
const CLASSE_FIELDSET = 'flex flex-col gap-4 rounded-theme border border-border bg-surface p-4'
const CLASSE_LEGENDA = 'px-1 font-heading text-sm font-semibold text-fg'
const CLASSE_BOTAO_SECUNDARIO =
  'rounded-theme border border-control bg-surface px-4 py-2 text-sm font-medium text-fg hover:bg-surface-2'
const CLASSE_BOTAO_PRIMARIO =
  'rounded-theme border border-accent bg-accent px-4 py-2 text-sm font-semibold text-accent-contrast disabled:cursor-not-allowed disabled:opacity-60'

function mensagemDeErro(erro: unknown): { mensagem: string; detalhes: string[] } {
  if (erro instanceof StorageError) return { mensagem: erro.message, detalhes: erro.detalhes }
  if (erro instanceof Error && erro.message) return { mensagem: erro.message, detalhes: [] }
  return { mensagem: 'Não foi possível salvar a stack.', detalhes: [] }
}

/** Formulário completo de stack (criar/editar), com validação Zod e preview da nota. */
export function StackForm({
  inicial,
  onSubmit,
  onCancel,
  categorias = [],
  salvando = false,
  hoje,
}: StackFormProps) {
  const base = useId()
  const [referencia] = useState(() => hoje ?? new Date())
  const [valores, setValores] = useState<ValoresStackForm>(() =>
    valoresIniciais(inicial, referencia),
  )
  const [erros, setErros] = useState<ErrosStackForm>({})
  const [enviando, setEnviando] = useState(false)
  const [erroEnvio, setErroEnvio] = useState<{ mensagem: string; detalhes: string[] } | null>(null)

  const focoPendente = useRef<CampoForm | null>(null)

  // Move o foco depois que as mensagens de erro já estão no DOM.
  useLayoutEffect(() => {
    const campo = focoPendente.current
    if (!campo) return
    focoPendente.current = null
    document.getElementById(`${base}-${campo}`)?.focus()
  }, [erros, base])

  const ocupado = enviando || salvando
  const nota = calcularNota(stackDePreview(valores, inicial), { hoje: referencia })

  const idDe = (campo: CampoForm) => `${base}-${campo}`
  const idErro = (campo: CampoForm) => `${base}-${campo}-erro`

  function alterar<C extends CampoForm>(campo: C, valor: ValoresStackForm[C]) {
    setValores((atual) => ({ ...atual, [campo]: valor }))
    setErros((atual) => {
      if (!atual[campo]) return atual
      const proximo = { ...atual }
      delete proximo[campo]
      return proximo
    })
  }

  /** Props de identificação e acessibilidade comuns a todo campo. */
  function propsCampo(campo: CampoForm, dica?: string) {
    const erro = erros[campo]
    const descricao = [dica, erro && idErro(campo)].filter(Boolean).join(' ')
    return {
      id: idDe(campo),
      name: campo,
      'aria-invalid': erro ? true : undefined,
      'aria-describedby': descricao || undefined,
    }
  }

  function classeCampo(campo: CampoForm) {
    return `${CLASSE_CAMPO} ${erros[campo] ? 'border-danger' : 'border-control'}`
  }

  function erroDe(campo: CampoForm): ReactNode {
    const erro = erros[campo]
    if (!erro) return null
    return (
      <p id={idErro(campo)} className="text-sm font-medium text-danger">
        {erro}
      </p>
    )
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (ocupado) return

    const resultado = validarStackForm(valores)
    if (!resultado.ok) {
      focoPendente.current = primeiroCampoInvalido(resultado.erros) ?? null
      setErros(resultado.erros)
      return
    }

    setErros({})
    setErroEnvio(null)
    setEnviando(true)
    try {
      await onSubmit(resultado.dados)
    } catch (erro) {
      setErroEnvio(mensagemDeErro(erro))
    } finally {
      setEnviando(false)
    }
  }

  const idDicaTags = `${base}-tags-dica`
  const idCategorias = `${base}-categorias`

  return (
    <form
      noValidate
      aria-label={inicial ? `Editar ${inicial.nome}` : 'Nova stack'}
      onSubmit={enviar}
      className="flex flex-col gap-4"
    >
      {erroEnvio && (
        <div
          role="alert"
          className="rounded-theme border border-danger bg-surface p-4 text-sm text-fg"
        >
          <p className="font-semibold">{erroEnvio.mensagem}</p>
          {erroEnvio.detalhes.length > 0 && (
            <ul className="mt-1 list-disc pl-5 text-muted">
              {erroEnvio.detalhes.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          )}
          <p className="mt-1 text-muted">Seus dados continuam aqui; tente salvar de novo.</p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-4">
          <fieldset className={CLASSE_FIELDSET}>
            <legend className={CLASSE_LEGENDA}>Identificação</legend>

            <div className="flex flex-col gap-1">
              <label htmlFor={idDe('nome')} className={CLASSE_ROTULO}>
                Nome
              </label>
              <input
                type="text"
                autoComplete="off"
                value={valores.nome}
                onChange={(e) => alterar('nome', e.target.value)}
                className={classeCampo('nome')}
                {...propsCampo('nome')}
              />
              {erroDe('nome')}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor={idDe('categoria')} className={CLASSE_ROTULO}>
                Categoria
              </label>
              <input
                type="text"
                autoComplete="off"
                list={idCategorias}
                value={valores.categoria}
                onChange={(e) => alterar('categoria', e.target.value)}
                className={classeCampo('categoria')}
                {...propsCampo('categoria')}
              />
              <datalist id={idCategorias}>
                {categorias.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              {erroDe('categoria')}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor={idDe('tags')} className={CLASSE_ROTULO}>
                Tags
              </label>
              <input
                type="text"
                autoComplete="off"
                placeholder="ui, spa, hooks"
                value={valores.tags}
                onChange={(e) => alterar('tags', e.target.value)}
                className={classeCampo('tags')}
                {...propsCampo('tags', idDicaTags)}
              />
              <p id={idDicaTags} className={CLASSE_DICA}>
                Separe as tags por vírgula.
              </p>
              {erroDe('tags')}
            </div>
          </fieldset>

          <fieldset className={CLASSE_FIELDSET}>
            <legend className={CLASSE_LEGENDA}>Dimensões (0 a 10)</legend>

            {DIMENSOES.map(({ campo, rotulo }) => (
              <div key={campo} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-2">
                  <label htmlFor={idDe(campo)} className={CLASSE_ROTULO}>
                    {rotulo}
                  </label>
                  <output
                    htmlFor={idDe(campo)}
                    aria-hidden="true"
                    className="font-semibold tabular-nums text-fg"
                  >
                    {formatarNota(valores[campo])}
                  </output>
                </div>
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={0.5}
                  value={valores[campo]}
                  aria-valuetext={`${formatarNota(valores[campo])} de 10`}
                  onChange={(e) => alterar(campo, Number(e.target.value))}
                  className="h-6 w-full cursor-pointer accent-accent"
                  {...propsCampo(campo)}
                />
                {erroDe(campo)}
              </div>
            ))}

            <div className="flex flex-col gap-1">
              <label htmlFor={idDe('ultimoUso')} className={CLASSE_ROTULO}>
                Último uso
              </label>
              <input
                type="date"
                value={valores.ultimoUso}
                onChange={(e) => alterar('ultimoUso', e.target.value)}
                className={classeCampo('ultimoUso')}
                {...propsCampo('ultimoUso')}
              />
              {erroDe('ultimoUso')}
            </div>
          </fieldset>

          <fieldset className={`${CLASSE_FIELDSET} sm:grid sm:grid-cols-2`}>
            <legend className={CLASSE_LEGENDA}>Experiência</legend>

            <div className="flex flex-col gap-1">
              <label htmlFor={idDe('tipoExperiencia')} className={CLASSE_ROTULO}>
                Tipo de experiência
              </label>
              <select
                value={valores.tipoExperiencia}
                onChange={(e) => alterar('tipoExperiencia', e.target.value as TipoExperiencia)}
                className={classeCampo('tipoExperiencia')}
                {...propsCampo('tipoExperiencia')}
              >
                {TIPOS_EXPERIENCIA.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {ROTULO_EXPERIENCIA[tipo]}
                  </option>
                ))}
              </select>
              {erroDe('tipoExperiencia')}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor={idDe('meses')} className={CLASSE_ROTULO}>
                Meses de experiência
              </label>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={valores.meses}
                onChange={(e) => alterar('meses', e.target.value)}
                className={classeCampo('meses')}
                {...propsCampo('meses')}
              />
              {erroDe('meses')}
            </div>
          </fieldset>

          <div className="flex flex-col gap-1">
            <label htmlFor={idDe('notas')} className={CLASSE_ROTULO}>
              Notas
            </label>
            <textarea
              rows={4}
              value={valores.notas}
              onChange={(e) => alterar('notas', e.target.value)}
              className={classeCampo('notas')}
              {...propsCampo('notas')}
            />
            {erroDe('notas')}
          </div>
        </div>

        <aside
          aria-labelledby={`${base}-preview`}
          className="flex h-fit flex-col gap-2 rounded-theme border border-border bg-surface-2 p-4 shadow-theme lg:sticky lg:top-4"
        >
          <h2 id={`${base}-preview`} className="font-heading text-sm font-semibold text-muted">
            Prévia da nota
          </h2>
          <p aria-live="polite" className="flex flex-wrap items-center gap-3">
            <span className="text-3xl font-bold tabular-nums text-fg">
              <span className="sr-only">Nota calculada: </span>
              {formatarNota(nota)}
            </span>
            <LevelBadge nota={nota} />
          </p>
          <p className={CLASSE_DICA}>
            Recalculada a cada mudança: dimensões, último uso
            {inicial && inicial.evidencias.length > 0 ? ' e evidências já cadastradas' : ''}.
          </p>
        </aside>
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={ocupado} className={CLASSE_BOTAO_PRIMARIO}>
          {ocupado ? 'Salvando…' : 'Salvar'}
        </button>
        <button type="button" onClick={onCancel} className={CLASSE_BOTAO_SECUNDARIO}>
          Cancelar
        </button>
      </div>
    </form>
  )
}
