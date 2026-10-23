import { useId } from 'react'
import { NIVEIS, type NivelId } from '../../domain/levels'
import type { OpcoesCurriculo } from './resumeOptions'

export interface ResumeFiltersProps {
  opcoes: OpcoesCurriculo
  /** Categorias existentes nas stacks, já ordenadas. */
  categorias: readonly string[]
  onChange(mudancas: Partial<OpcoesCurriculo>): void
  onRestaurar(): void
  className?: string
}

const QUALQUER_NIVEL = ''

const CLASSE_CAMPO =
  'w-full rounded-theme border border-border bg-surface px-3 py-1.5 text-sm text-fg shadow-theme'
const CLASSE_ROTULO = 'text-sm font-medium text-muted'
const CLASSE_LEGENDA = 'mb-2 text-sm font-semibold text-fg'
const CLASSE_CHECKBOX = 'size-4 accent-accent'
const CLASSE_OPCAO = 'inline-flex items-center gap-2 text-sm text-fg'
const CLASSE_BOTAO_PEQUENO =
  'rounded-theme border border-border bg-surface px-2 py-0.5 text-xs font-medium text-fg hover:bg-surface-2'

/** Categorias marcadas: `null` (todas) vira a lista completa. */
function categoriasMarcadas(opcoes: OpcoesCurriculo, categorias: readonly string[]): Set<string> {
  return new Set(opcoes.categorias ?? categorias)
}

/** Marcar/desmarcar uma categoria; todas marcadas volta a `null` (inclui categorias novas). */
function alternarCategoria(
  marcadas: Set<string>,
  categorias: readonly string[],
  categoria: string,
  marcar: boolean,
): string[] | null {
  const novas = new Set(marcadas)
  if (marcar) novas.add(categoria)
  else novas.delete(categoria)
  if (categorias.every((c) => novas.has(c))) return null
  return categorias.filter((c) => novas.has(c))
}

type CampoMostrar = 'mostrarNivel' | 'mostrarTempo' | 'mostrarNota' | 'incluirEvidencias'

const MOSTRAR: ReadonlyArray<readonly [CampoMostrar, string]> = [
  ['mostrarNivel', 'Nível'],
  ['mostrarTempo', 'Tempo de experiência'],
  ['mostrarNota', 'Nota (0 a 10)'],
  ['incluirEvidencias', 'Evidências (links e descrições)'],
]

/** Filtros do currículo. Controlado: o estado mora em quem usa. */
export function ResumeFilters({
  opcoes,
  categorias,
  onChange,
  onRestaurar,
  className = '',
}: ResumeFiltersProps) {
  const idNivel = useId()
  const idTitulo = useId()
  const idExplicacaoTeoria = useId()
  const marcadas = categoriasMarcadas(opcoes, categorias)
  const teoriaHabilitada = !opcoes.somenteComprovado

  return (
    <form
      aria-label="Filtros do currículo"
      onSubmit={(e) => e.preventDefault()}
      className={`flex flex-col gap-5 rounded-theme border border-border bg-surface p-4 shadow-theme ${className}`}
    >
      <div className="flex flex-col gap-1">
        <label htmlFor={idTitulo} className={CLASSE_ROTULO}>
          Título da seção
        </label>
        <input
          id={idTitulo}
          type="text"
          value={opcoes.titulo}
          maxLength={120}
          onChange={(e) => onChange({ titulo: e.target.value })}
          className={CLASSE_CAMPO}
        />
      </div>

      <fieldset>
        <legend className={CLASSE_LEGENDA}>Categorias</legend>
        <div className="mb-2 flex gap-2">
          <button
            type="button"
            onClick={() => onChange({ categorias: null })}
            className={CLASSE_BOTAO_PEQUENO}
          >
            Todas
          </button>
          <button
            type="button"
            onClick={() => onChange({ categorias: [] })}
            className={CLASSE_BOTAO_PEQUENO}
          >
            Nenhuma
          </button>
        </div>
        <ul className="flex flex-col gap-1.5">
          {categorias.map((categoria) => (
            <li key={categoria}>
              <label className={CLASSE_OPCAO}>
                <input
                  type="checkbox"
                  checked={marcadas.has(categoria)}
                  onChange={(e) =>
                    onChange({
                      categorias: alternarCategoria(
                        marcadas,
                        categorias,
                        categoria,
                        e.target.checked,
                      ),
                    })
                  }
                  className={CLASSE_CHECKBOX}
                />
                {categoria}
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <div className="flex flex-col gap-1">
        <label htmlFor={idNivel} className={CLASSE_ROTULO}>
          Nível mínimo
        </label>
        <select
          id={idNivel}
          value={opcoes.nivelMinimo ?? QUALQUER_NIVEL}
          onChange={(e) =>
            onChange({
              nivelMinimo: e.target.value === QUALQUER_NIVEL ? null : (e.target.value as NivelId),
            })
          }
          className={CLASSE_CAMPO}
        >
          <option value={QUALQUER_NIVEL}>Qualquer nível</option>
          {NIVEIS.map((nivel) => (
            <option key={nivel.id} value={nivel.id}>
              {nivel.nome}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className={CLASSE_LEGENDA}>Comprovação</legend>
        <label className={CLASSE_OPCAO}>
          <input
            type="checkbox"
            checked={opcoes.somenteComprovado}
            onChange={(e) => onChange({ somenteComprovado: e.target.checked })}
            className={CLASSE_CHECKBOX}
          />
          Só o que tem evidência ou prática real
        </label>
        <div className="flex flex-col gap-1">
          <label
            className={`${CLASSE_OPCAO} ${teoriaHabilitada ? '' : 'cursor-not-allowed opacity-60'}`}
          >
            <input
              type="checkbox"
              checked={teoriaHabilitada && opcoes.incluirSeiPorSaber}
              disabled={!teoriaHabilitada}
              aria-describedby={idExplicacaoTeoria}
              onChange={(e) => onChange({ incluirSeiPorSaber: e.target.checked })}
              className={CLASSE_CHECKBOX}
            />
            Incluir “sei por saber” (seção Conhecimento teórico)
          </label>
          <p id={idExplicacaoTeoria} className="pl-6 text-xs text-muted">
            {teoriaHabilitada
              ? 'Stacks com teoria alta e pouca prática entram numa seção separada, no fim.'
              : 'Disponível só com “Só o que tem evidência ou prática real” desligado: essas stacks não têm prática que comprove.'}
          </p>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className={CLASSE_LEGENDA}>Mostrar</legend>
        {MOSTRAR.map(([campo, rotulo]) => (
          <label key={campo} className={CLASSE_OPCAO}>
            <input
              type="checkbox"
              checked={opcoes[campo]}
              onChange={(e) => {
                const mudanca: Partial<OpcoesCurriculo> = {}
                mudanca[campo] = e.target.checked
                onChange(mudanca)
              }}
              className={CLASSE_CHECKBOX}
            />
            {rotulo}
          </label>
        ))}
      </fieldset>

      <div>
        <button
          type="button"
          onClick={onRestaurar}
          className="rounded-theme border border-border bg-surface px-3 py-1.5 text-sm font-medium text-fg hover:bg-surface-2"
        >
          Restaurar padrão
        </button>
      </div>
    </form>
  )
}
