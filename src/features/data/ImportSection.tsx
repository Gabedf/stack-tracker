import { useId, useLayoutEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router'
import type { Stack, StacksFile } from '../../domain/types'
import {
  aplicarImportacao,
  analisarImportacao,
  DICA_FORMATO,
  verificarTamanho,
  type ModoImportacao,
  type PreviaImportacao,
} from './importExport'
import { lerArquivoComoTexto } from './lerArquivo'

export interface ImportSectionProps {
  stacks: readonly Stack[]
  /** Salva o arquivo inteiro (useStacks().substituirTudo). */
  onImportar(arquivo: StacksFile): Promise<unknown>
  /** Desliga a importação (ex.: dados ainda carregando). */
  desabilitado?: boolean
}

type Leitura =
  | { tipo: 'nenhuma' }
  | { tipo: 'erro'; erros: string[] }
  | { tipo: 'texto'; texto: string; origem: string }

const CLASSE_BOTAO =
  'rounded-theme border px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60'
const CLASSE_SECUNDARIO = `${CLASSE_BOTAO} border-control bg-surface text-fg hover:bg-surface-2`
const CLASSE_PRIMARIO = `${CLASSE_BOTAO} border-accent bg-accent text-accent-contrast`
const CLASSE_PERIGO = `${CLASSE_BOTAO} border-danger bg-danger text-accent-contrast`

function plural(n: number, singular: string, varias: string): string {
  return `${n} ${n === 1 ? singular : varias}`
}

function ListaErros({
  titulo,
  erros,
  rodape,
}: {
  titulo: string
  erros: string[]
  rodape?: string
}) {
  return (
    <div role="alert" className="space-y-2 rounded-theme border border-danger bg-surface p-4">
      <p className="font-semibold text-danger">{titulo}</p>
      <ul className="list-disc space-y-1 pl-5 text-sm break-words text-fg">
        {erros.map((erro, i) => (
          <li key={i}>{erro}</li>
        ))}
      </ul>
      {rodape && <p className="text-sm text-muted">{rodape}</p>}
    </div>
  )
}

function ResumoPrevia({ previa }: { previa: PreviaImportacao }) {
  const itens: Array<[string, number]> = [
    ['no arquivo', previa.total],
    ['novas', previa.novas.length],
    ['substituem existentes (mesmo id)', previa.substituidas.length],
    ['inalteradas', previa.inalteradas.length],
    ['do painel não estão no arquivo', previa.ausentes.length],
  ]
  return (
    <dl className="grid gap-2 sm:grid-cols-2">
      {itens.map(([rotulo, valor]) => (
        <div
          key={rotulo}
          className="flex items-baseline gap-2 rounded-theme border border-border bg-surface-2 px-3 py-2"
        >
          <dt className="text-sm text-muted">{rotulo}</dt>
          <dd className="order-first text-lg font-semibold text-fg">{valor}</dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * Importa um JSON (arquivo ou texto colado): mostra erros amigáveis ou a
 * prévia, deixa escolher entre mesclar e substituir e só então salva. Nada é
 * salvo enquanto o arquivo e o resultado não passarem no schema.
 */
export function ImportSection({ stacks, onImportar, desabilitado = false }: ImportSectionProps) {
  const base = useId()
  const idTitulo = `${base}-titulo`
  const idArquivo = `${base}-arquivo`
  const idColar = `${base}-colar`
  const idDicaColar = `${base}-dica-colar`
  const idConfirmacao = `${base}-confirmacao`

  const [leitura, setLeitura] = useState<Leitura>({ tipo: 'nenhuma' })
  const [colado, setColado] = useState('')
  const [modo, setModo] = useState<ModoImportacao>('mesclar')
  const [confirmando, setConfirmando] = useState(false)
  const [importando, setImportando] = useState(false)
  const [erroSalvar, setErroSalvar] = useState<string[] | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)
  const cancelarRef = useRef<HTMLButtonElement>(null)

  useLayoutEffect(() => {
    if (confirmando) cancelarRef.current?.focus()
  }, [confirmando])

  // A comparação acompanha as stacks atuais do painel.
  const analise = useMemo(
    () => (leitura.tipo === 'texto' ? analisarImportacao(leitura.texto, stacks) : null),
    [leitura, stacks],
  )
  const erros =
    leitura.tipo === 'erro' ? leitura.erros : analise && !analise.ok ? analise.erros : null
  const previa = analise?.ok ? analise.previa : null

  function recomecar(proxima: Leitura) {
    setLeitura(proxima)
    setConfirmando(false)
    setErroSalvar(null)
    setSucesso(null)
  }

  async function escolherArquivo(evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0]
    // Permite escolher o mesmo arquivo de novo depois de corrigi-lo.
    evento.target.value = ''
    if (!arquivo) return
    const erroTamanho = verificarTamanho(arquivo.size)
    if (erroTamanho) {
      recomecar({ tipo: 'erro', erros: [erroTamanho] })
      return
    }
    try {
      const texto = await lerArquivoComoTexto(arquivo)
      recomecar({ tipo: 'texto', texto, origem: arquivo.name })
    } catch {
      recomecar({
        tipo: 'erro',
        erros: ['Não foi possível ler o arquivo. Tente escolher de novo.'],
      })
    }
  }

  function analisarColado() {
    recomecar({ tipo: 'texto', texto: colado, origem: 'texto colado' })
  }

  function cancelar() {
    recomecar({ tipo: 'nenhuma' })
  }

  async function importar() {
    if (!previa) return
    const resultado = aplicarImportacao(stacks, previa.arquivo, modo)
    if (!resultado.ok) {
      setConfirmando(false)
      setErroSalvar(resultado.erros)
      return
    }
    setErroSalvar(null)
    setImportando(true)
    try {
      await onImportar(resultado.dados)
      const total = resultado.dados.stacks.length
      setLeitura({ tipo: 'nenhuma' })
      setColado('')
      setConfirmando(false)
      setSucesso(`Importação concluída: o painel agora tem ${plural(total, 'stack', 'stacks')}.`)
    } catch (e) {
      const detalhes =
        e && typeof e === 'object' && 'detalhes' in e && Array.isArray(e.detalhes)
          ? (e.detalhes as string[])
          : []
      const mensagem = e instanceof Error && e.message ? e.message : 'Falha ao salvar.'
      setConfirmando(false)
      setErroSalvar([mensagem, ...detalhes])
    } finally {
      setImportando(false)
    }
  }

  function aoClicarImportar() {
    if (modo === 'substituir') setConfirmando(true)
    else void importar()
  }

  const removidas = previa?.ausentes.length ?? 0

  return (
    <section
      aria-labelledby={idTitulo}
      className="space-y-4 rounded-theme border border-border bg-surface p-4 shadow-theme"
    >
      <h2 id={idTitulo} className="text-xl font-semibold">
        Importar
      </h2>
      <p className="text-sm text-muted">
        Escolha um JSON exportado por este painel. Antes de salvar você vê o que muda; um arquivo
        inválido não altera nada.
      </p>

      <div className="flex flex-col gap-1">
        <label htmlFor={idArquivo} className="text-sm font-medium text-fg">
          Arquivo JSON
        </label>
        <input
          id={idArquivo}
          type="file"
          accept=".json,application/json"
          disabled={desabilitado || importando}
          onChange={(e) => void escolherArquivo(e)}
          className="text-sm text-fg file:mr-3 file:rounded-theme file:border file:border-control file:bg-surface-2 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-fg"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor={idColar} className="text-sm font-medium text-fg">
          Ou cole o JSON (opcional)
        </label>
        <textarea
          id={idColar}
          rows={5}
          value={colado}
          aria-describedby={idDicaColar}
          disabled={desabilitado || importando}
          onChange={(e) => setColado(e.target.value)}
          spellCheck={false}
          className="w-full rounded-theme border border-control bg-surface-2 px-3 py-2 font-mono text-sm text-fg"
        />
        <p id={idDicaColar} className="text-xs text-muted">
          {DICA_FORMATO}
        </p>
        <div>
          <button
            type="button"
            onClick={analisarColado}
            disabled={desabilitado || importando || colado.trim() === ''}
            className={CLASSE_SECUNDARIO}
          >
            Analisar JSON colado
          </button>
        </div>
      </div>

      {erros && (
        <ListaErros
          titulo="Não foi possível importar: o arquivo tem problemas."
          erros={erros}
          rodape={`${DICA_FORMATO} Seus dados não foram alterados.`}
        />
      )}

      {previa && leitura.tipo === 'texto' && (
        <div className="space-y-4">
          <h3 className="font-heading text-lg font-semibold">Prévia de “{leitura.origem}”</h3>
          <ResumoPrevia previa={previa} />

          <fieldset className="space-y-3" disabled={importando}>
            <legend className="text-sm font-medium text-fg">Como importar</legend>
            <label className="flex items-start gap-2">
              <input
                type="radio"
                name={`${base}-modo`}
                value="mesclar"
                checked={modo === 'mesclar'}
                onChange={() => {
                  setModo('mesclar')
                  setConfirmando(false)
                }}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-medium text-fg">Mesclar por id</span>
                <span className="block text-sm text-muted">
                  Stacks com o mesmo id ficam com a versão do arquivo, as novas são acrescentadas e{' '}
                  {plural(removidas, 'stack que não está', 'stacks que não estão')} no arquivo{' '}
                  {removidas === 1 ? 'continua' : 'continuam'} no painel.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2">
              <input
                type="radio"
                name={`${base}-modo`}
                value="substituir"
                checked={modo === 'substituir'}
                onChange={() => setModo('substituir')}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-medium text-fg">Substituir tudo</span>
                <span className="block text-sm text-muted">
                  O painel fica igual ao arquivo:{' '}
                  {removidas === 0
                    ? 'nenhuma stack será removida.'
                    : `${plural(removidas, 'stack será removida', 'stacks serão removidas')}.`}
                </span>
              </span>
            </label>
          </fieldset>

          {erroSalvar && (
            <ListaErros
              titulo="Não foi possível salvar a importação. Seus dados continuam como antes."
              erros={erroSalvar}
            />
          )}

          {confirmando ? (
            <div
              id={idConfirmacao}
              role="group"
              aria-labelledby={`${idConfirmacao}-titulo`}
              onKeyDown={(e) => {
                if (e.key === 'Escape' && !importando) {
                  e.stopPropagation()
                  setConfirmando(false)
                }
              }}
              className="space-y-3 rounded-theme border border-danger bg-surface p-4"
            >
              <p id={`${idConfirmacao}-titulo`} className="font-semibold text-fg">
                {removidas === 0
                  ? `Substituir tudo pelas ${plural(previa.total, 'stack', 'stacks')} do arquivo?`
                  : `Substituir tudo vai remover ${plural(removidas, 'stack', 'stacks')} do painel. Continuar?`}
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={importando}
                  onClick={() => void importar()}
                  className={CLASSE_PERIGO}
                >
                  {importando ? 'Importando…' : 'Confirmar substituição'}
                </button>
                <button
                  ref={cancelarRef}
                  type="button"
                  disabled={importando}
                  onClick={() => setConfirmando(false)}
                  className={CLASSE_SECUNDARIO}
                >
                  Voltar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={desabilitado || importando}
                onClick={aoClicarImportar}
                className={CLASSE_PRIMARIO}
              >
                {importando ? 'Importando…' : 'Importar'}
              </button>
              <button
                type="button"
                disabled={importando}
                onClick={cancelar}
                className={CLASSE_SECUNDARIO}
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      )}

      <div role="status" aria-live="polite" className="text-sm">
        {sucesso && (
          <p className="text-success">
            {sucesso}{' '}
            <Link to="/stacks" className="font-medium text-accent underline underline-offset-2">
              Ver stacks
            </Link>
          </p>
        )}
      </div>
    </section>
  )
}
