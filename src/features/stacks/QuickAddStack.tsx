import { useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import type { Stack } from '../../domain/types'
import { StorageError } from '../../storage'
import { categoriasDisponiveis } from './stackFiltering'
import { useStacks } from './useStacks'

export interface QuickAddStackProps {
  /** Versão maior, com borda de destaque (ex.: estado vazio). */
  destaque?: boolean
  className?: string
}

type Campo = 'nome' | 'categoria'
type Erros = Partial<Record<Campo, string>>

const MENSAGENS: Record<Campo, string> = {
  nome: 'O nome não pode ficar vazio.',
  categoria: 'A categoria não pode ficar vazia.',
}

const CLASSE_CAMPO =
  'w-full rounded-theme border bg-surface px-3 py-1.5 text-sm text-fg shadow-theme placeholder:text-muted disabled:opacity-60'
const CLASSE_BOTAO =
  'rounded-theme border border-accent bg-accent px-4 py-1.5 text-sm font-semibold text-accent-contrast disabled:cursor-not-allowed disabled:opacity-60'

function mensagemDeErro(erro: unknown): string {
  if (erro instanceof StorageError) {
    return [erro.message, ...erro.detalhes].join(' ')
  }
  if (erro instanceof Error && erro.message) return erro.message
  return 'Não foi possível adicionar a stack.'
}

/** Formulário inline com só nome e categoria; o resto recebe os defaults. */
export function QuickAddStack({ destaque = false, className = '' }: QuickAddStackProps) {
  const base = useId()
  const { stacks, salvando, adicionar, limparErro } = useStacks()
  const [nome, setNome] = useState('')
  const [categoria, setCategoria] = useState('')
  const [erros, setErros] = useState<Erros>({})
  const [erroEnvio, setErroEnvio] = useState<string | null>(null)
  const [adicionada, setAdicionada] = useState<Stack | null>(null)
  const [enviando, setEnviando] = useState(false)
  const focoPendente = useRef<Campo | null>(null)

  const ocupado = enviando || salvando
  const idDe = (campo: Campo) => `${base}-${campo}`
  const idErro = (campo: Campo) => `${base}-${campo}-erro`
  const idCategorias = `${base}-categorias`

  // Foca só depois que os campos voltaram a ficar habilitados e os erros estão no DOM.
  useLayoutEffect(() => {
    const campo = focoPendente.current
    if (!campo || ocupado) return
    focoPendente.current = null
    document.getElementById(`${base}-${campo}`)?.focus()
  }, [erros, ocupado, adicionada, base])

  // Não deixa no contexto um erro que só este formulário mostrava.
  useEffect(() => () => limparErro(), [limparErro])

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (ocupado) return

    const dados = { nome: nome.trim(), categoria: categoria.trim() }
    const novosErros: Erros = {}
    if (!dados.nome) novosErros.nome = MENSAGENS.nome
    if (!dados.categoria) novosErros.categoria = MENSAGENS.categoria
    setErros(novosErros)
    const invalido = (['nome', 'categoria'] as const).find((c) => novosErros[c])
    if (invalido) {
      focoPendente.current = invalido
      return
    }

    setErroEnvio(null)
    setAdicionada(null)
    setEnviando(true)
    try {
      const nova = await adicionar(dados)
      setNome('')
      setCategoria('')
      setAdicionada(nova)
      focoPendente.current = 'nome'
    } catch (erro) {
      setErroEnvio(mensagemDeErro(erro))
    } finally {
      setEnviando(false)
    }
  }

  function alterar(campo: Campo, valor: string) {
    if (campo === 'nome') setNome(valor)
    else setCategoria(valor)
    setErros((atual) => {
      if (!atual[campo]) return atual
      const proximo = { ...atual }
      delete proximo[campo]
      return proximo
    })
  }

  function propsCampo(campo: Campo) {
    const erro = erros[campo]
    return {
      id: idDe(campo),
      name: campo,
      type: 'text',
      autoComplete: 'off',
      disabled: ocupado,
      'aria-invalid': erro ? true : undefined,
      'aria-describedby': erro ? idErro(campo) : undefined,
      className: `${CLASSE_CAMPO} ${erro ? 'border-danger' : 'border-border'}`,
    }
  }

  const moldura = destaque
    ? 'border-accent bg-surface p-4 shadow-theme'
    : 'border-border bg-surface-2 p-3'

  return (
    <form
      noValidate
      aria-label="Adição rápida de stack"
      onSubmit={enviar}
      className={`flex flex-col gap-2 rounded-theme border ${moldura} ${className}`}
    >
      {erroEnvio && (
        <div
          role="alert"
          className="rounded-theme border border-danger bg-surface px-3 py-2 text-sm text-fg"
        >
          <p className="font-semibold">{erroEnvio}</p>
          <p className="text-muted">O que você digitou continua aqui; tente de novo.</p>
        </div>
      )}

      <div className="flex flex-wrap items-start gap-2">
        <div className="flex min-w-40 flex-1 flex-col gap-1">
          <label htmlFor={idDe('nome')} className="text-xs font-medium text-muted">
            Nome
          </label>
          <input
            placeholder="Ex.: Vue"
            value={nome}
            onChange={(e) => alterar('nome', e.target.value)}
            {...propsCampo('nome')}
          />
          {erros.nome && (
            <p id={idErro('nome')} className="text-xs font-medium text-danger">
              {erros.nome}
            </p>
          )}
        </div>

        <div className="flex min-w-40 flex-1 flex-col gap-1">
          <label htmlFor={idDe('categoria')} className="text-xs font-medium text-muted">
            Categoria
          </label>
          <input
            placeholder="Ex.: Frontend"
            list={idCategorias}
            value={categoria}
            onChange={(e) => alterar('categoria', e.target.value)}
            {...propsCampo('categoria')}
          />
          <datalist id={idCategorias}>
            {categoriasDisponiveis(stacks).map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          {erros.categoria && (
            <p id={idErro('categoria')} className="text-xs font-medium text-danger">
              {erros.categoria}
            </p>
          )}
        </div>

        <button type="submit" disabled={ocupado} className={`${CLASSE_BOTAO} sm:mt-5`}>
          {ocupado ? 'Adicionando…' : 'Adicionar'}
        </button>
      </div>

      <div role="status" aria-live="polite" className="text-sm text-muted">
        {adicionada && (
          <p>
            <span className="text-fg">“{adicionada.nome}” adicionada.</span>{' '}
            <Link
              to={`/stacks/${encodeURIComponent(adicionada.id)}/editar`}
              className="font-medium text-accent underline underline-offset-2"
            >
              Refinar<span className="sr-only"> {adicionada.nome}</span>
            </Link>
          </p>
        )}
      </div>
    </form>
  )
}
