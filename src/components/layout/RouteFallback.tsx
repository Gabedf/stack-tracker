/** Aviso exibido no <main> enquanto o chunk da rota carrega. */
export function RouteFallback() {
  return (
    <p role="status" aria-live="polite" className="text-muted">
      Carregando…
    </p>
  )
}
