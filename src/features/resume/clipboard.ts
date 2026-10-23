/**
 * Copiar e baixar texto no navegador. Sem React.
 */

/** Copia via textarea temporária + execCommand, para quando a Clipboard API falha ou não existe. */
function copiarComTextarea(texto: string): boolean {
  const area = document.createElement('textarea')
  area.value = texto
  area.setAttribute('readonly', '')
  area.style.position = 'fixed'
  area.style.top = '0'
  area.style.left = '-9999px'
  area.style.opacity = '0'
  document.body.appendChild(area)
  const foco = document.activeElement instanceof HTMLElement ? document.activeElement : null
  try {
    area.select()
    return typeof document.execCommand === 'function' && document.execCommand('copy')
  } catch {
    return false
  } finally {
    area.remove()
    foco?.focus()
  }
}

/**
 * Copia o texto para a área de transferência: tenta a Clipboard API e, se ela
 * falhar ou não existir, o fallback com execCommand. Rejeita se nada funcionar.
 */
export async function copiarTexto(texto: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(texto)
      return
    } catch {
      // Sem permissão ou contexto inseguro: tenta o fallback.
    }
  }
  if (!copiarComTextarea(texto)) {
    throw new Error('Não foi possível copiar para a área de transferência.')
  }
}

/** Dispara o download de um arquivo de texto com o nome dado. */
export function baixarArquivo(
  texto: string,
  nome: string,
  tipo = 'text/markdown;charset=utf-8',
): void {
  const url = URL.createObjectURL(new Blob([texto], { type: tipo }))
  const link = document.createElement('a')
  link.href = url
  link.download = nome
  link.style.display = 'none'
  document.body.appendChild(link)
  try {
    link.click()
  } finally {
    link.remove()
    // Revoga depois do clique ter sido processado.
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }
}
