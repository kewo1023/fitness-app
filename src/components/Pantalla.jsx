import BotonTema from './BotonTema.jsx'

/* El envoltorio que usan las cinco secciones.
 *
 * Existe para que el encabezado y los márgenes se escriban UNA vez. Si
 * cada sección los repite, tarde o temprano una queda con 2px de
 * diferencia y se nota.
 *
 * El botón de tema vive aquí, y no en cada sección, por la misma razón:
 * está en las cinco pantallas sin repetirse ni una vez. Si una sección
 * pasa una `accion` propia, el botón se corre a su lado en vez de
 * desaparecer — nunca se queda una pantalla sin él.
 */
export default function Pantalla ({ titulo, bajada, children, accion }) {
  return (
    <main className="pantalla">
      <header className="pantalla-cab">
        <div>
          <h1>{titulo}</h1>
          {bajada && <p className="bajada">{bajada}</p>}
        </div>
        <div className="pantalla-acciones">
          {accion}
          <BotonTema />
        </div>
      </header>
      {children}
    </main>
  )
}
