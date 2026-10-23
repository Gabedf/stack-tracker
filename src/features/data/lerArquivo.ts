/** Lê o conteúdo de um arquivo como texto (File.text ou FileReader). */
export function lerArquivoComoTexto(arquivo: Blob): Promise<string> {
  if (typeof arquivo.text === 'function') return arquivo.text()
  return new Promise((resolve, reject) => {
    const leitor = new FileReader()
    leitor.onload = () => resolve(String(leitor.result ?? ''))
    leitor.onerror = () => reject(leitor.error ?? new Error('Falha ao ler o arquivo.'))
    leitor.readAsText(arquivo)
  })
}
