/* El envoltorio que usan las cinco secciones.
 *
 * Existe para que el encabezado y los márgenes se escriban UNA vez. Si
 * cada sección los repite, tarde o temprano una queda con 2px de
 * diferencia y se nota.
 */
export default function Pantalla ({ titulo, bajada, children, accion }) {
  return (
    <main className="pantalla">
      <header className="pantalla-cab">
        <div>
          <h1>{titulo}</h1>
          {bajada && <p className="bajada">{bajada}</p>}
        </div>
        {accion}
      </header>
      {children}
    </main>
  )
}
