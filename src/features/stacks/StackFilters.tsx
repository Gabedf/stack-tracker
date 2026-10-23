import { useId, useState } from 'react'
import { NIVEIS } from '../../domain/levels'
import {
  ORDENACOES,
  ROTULO_ORDENACAO,
  TODAS_CATEGORIAS,
  TODOS_NIVEIS,
  type CriteriosStacks,
  type Ordenacao,
} from './stackFilters.ts'

export interface StackFiltersProps {
  criterios: CriteriosStacks
  /** Categorias disponíveis para o select. */
  categorias: readonly string[]
  onChange(mudancas: Partial<CriteriosStacks>): void
  onLimpar(): void
  className?: string
}

const CLASSE_CAMPO =
  'w-full rounded-theme border border-border bg-surface px-3 py-1.5 text-sm text-fg shadow-theme'
const CLASSE_ROTULO = 'text-sm font-medium text-muted'

interface CampoBuscaProps {
  valor: string
  onChange(valor: string): void
}

/**
 * Campo de busca com estado local: a URL (fonte da verdade) é atualizada numa
 * transição do router e chega depois; o texto digitado não pode esperar por
 * ela. Mudanças externas (ex.: limpar filtros) ainda são refletidas.
 */
function CampoBusca({ valor, onChange }: CampoBuscaProps) {
  const id = useId()
  const [texto, setTexto] = useState(valor)
  const [valorAnterior, setValorAnterior] = useState(valor)
  // Valores já enviados que ainda podem chegar de volta via `valor`.
  const [pendentes, setPendentes] = useState<string[]>([])

  if (valor !== valorAnterior) {
    setValorAnterior(valor)
    const i = pendentes.indexOf(valor)
    if (i >= 0) {
      setPendentes(pendentes.slice(i + 1))
    } else {
      setPendentes([])
      setTexto(valor)
    }
  }

  return (
    <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-1">
      <label htmlFor={id} className={CLASSE_ROTULO}>
        Buscar
      </label>
      <input
        id={id}
        type="search"
        value={texto}
        placeholder="Nome ou tag"
        onChange={(e) => {
          const novo = e.target.value
          setTexto(novo)
          setPendentes((p) => [...p, novo])
          onChange(novo)
        }}
        className={`${CLASSE_CAMPO} placeholder:text-muted`}
      />
    </div>
  )
}

/** Filtros e ordenação da lista de stacks. Controlado: o estado mora em quem usa. */
export function StackFilters({
  criterios,
  categorias,
  onChange,
  onLimpar,
  className = '',
}: StackFiltersProps) {
  const idCategoria = useId()
  const idNivel = useId()
  const idOrdenacao = useId()

  return (
    <form
      role="search"
      aria-label="Filtrar stacks"
      onSubmit={(e) => e.preventDefault()}
      className={`grid gap-3 rounded-theme border border-border bg-surface p-4 shadow-theme sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] ${className}`}
    >
      <CampoBusca valor={criterios.busca} onChange={(busca) => onChange({ busca })} />

      <div className="flex flex-col gap-1">
        <label htmlFor={idCategoria} className={CLASSE_ROTULO}>
          Categoria
        </label>
        <select
          id={idCategoria}
          value={criterios.categoria}
          onChange={(e) => onChange({ categoria: e.target.value })}
          className={CLASSE_CAMPO}
        >
          <option value={TODAS_CATEGORIAS}>Todas as categorias</option>
          {categorias.map((categoria) => (
            <option key={categoria} value={categoria}>
              {categoria}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={idNivel} className={CLASSE_ROTULO}>
          Nível
        </label>
        <select
          id={idNivel}
          value={criterios.nivel}
          onChange={(e) => onChange({ nivel: e.target.value as CriteriosStacks['nivel'] })}
          className={CLASSE_CAMPO}
        >
          <option value={TODOS_NIVEIS}>Todos os níveis</option>
          {NIVEIS.map((nivel) => (
            <option key={nivel.id} value={nivel.id}>
              {nivel.nome}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={idOrdenacao} className={CLASSE_ROTULO}>
          Ordenar por
        </label>
        <select
          id={idOrdenacao}
          value={criterios.ordenacao}
          onChange={(e) => onChange({ ordenacao: e.target.value as Ordenacao })}
          className={CLASSE_CAMPO}
        >
          {ORDENACOES.map((ordenacao) => (
            <option key={ordenacao} value={ordenacao}>
              {ROTULO_ORDENACAO[ordenacao]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2 lg:col-span-4">
        <label className="inline-flex items-center gap-2 text-sm text-fg">
          <input
            type="checkbox"
            checked={criterios.somentePraticaReal}
            onChange={(e) => onChange({ somentePraticaReal: e.target.checked })}
            className="size-4 accent-accent"
          />
          Só prática real (projeto pessoal ou produção)
        </label>

        <button
          type="button"
          onClick={onLimpar}
          className="rounded-theme border border-border bg-surface px-3 py-1.5 text-sm font-medium text-fg hover:bg-surface-2"
        >
          Limpar filtros
        </button>
      </div>
    </form>
  )
}
