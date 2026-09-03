import { useState, useEffect } from 'react'
import Pantalla from '../components/Pantalla.jsx'
import { supabase } from '../lib/supabase.js'
import { ilustracionDeMomento } from '../lib/ilustraciones.js'
import Ilustracion from '../components/Ilustracion.jsx'

/* Recetas y hábitos. Ya con datos REALES de la base.
 *
 * OJO antes de agregarle nada a esta pantalla (regla 1 de PARAR en
 * CLAUDE.md): el contenido es GENÉRICO, igual para todos. Nada de
 * asignar un plan a una persona ni de calcular nada según su peso.
 * En Colombia eso es función reservada al nutricionista con tarjeta
 * profesional, y ejercerla sin licencia es materia penal.
 *
 * Por eso tampoco aparece la palabra "nutricional" en ningún texto de
 * esta pantalla, ni debe aparecer.
 *
 * DETALLE QUE NO SE VE PERO ES EL MÁS IMPORTANTE: esta consulta no
 * filtra por rol. Pide "las recetas" a secas, y la base decide cuáles
 * entrega — dos al visitante, seis al cliente. El filtro vive en la
 * política de RLS, no aquí.
 *
 * Es a propósito. Si el filtro estuviera en el navegador, cualquiera
 * podría quitarlo desde la consola y ver todo. Así, aunque alguien
 * reescriba esta línea, la base sigue mandando lo mismo.
 */
export default function Recetas ({ perfil }) {
  const [recetas, setRecetas] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let vivo = true
    ;(async () => {
      const { data, error } = await supabase
        .from('recetas')
        .select('id, nombre, momento, porciones, publica')
        .order('nombre')

      if (!vivo) return
      // El detalle técnico va a la consola. En pantalla, la lista vacía
      // ya cuenta la historia (regla 3 de CLAUDE.md).
      if (error) console.error('No se pudieron leer las recetas:', error)
      setRecetas(data || [])
      setCargando(false)
    })()
    return () => { vivo = false }
  }, [])

  const esVisitante = perfil?.rol === 'visitante'

  return (
    <Pantalla titulo="Recetas" bajada="Ideas simples para la semana">
      {cargando && <p className="meta">Cargando…</p>}

      {!cargando && recetas.length === 0 && (
        <p className="meta">Todavía no hay recetas publicadas.</p>
      )}

      <div className="rejilla">
        {recetas.map(r => (
          <article key={r.id} className="tarjeta">
            {/* En la Fase 6 aquí va la foto del plato —la columna
                foto_url ya existe, pero todavía no hay bucket donde
                guardarla— y cuando llegue gana, igual que en
                Ejercicios. La marca de abajo es relleno mientras tanto.

                MIENTRAS TANTO NO ES LA FOTO DE LA RECETA, es una marca
                del momento del día —desayuno, almuerzo, cena, snack—,
                que es una columna que la tabla ya tiene. Cuatro dibujos
                cubren todas las recetas que existan, y ninguno miente
                el día que el entrenador cambie los ingredientes.

                Son de autoría propia, dibujados para esta app, así que
                no deben atribución a nadie. Los de ejercicios sí, y por
                eso están en la pantalla de créditos y estos no. */}
            <Ilustracion ruta={ilustracionDeMomento(r.momento)} marca />
            <h2 className="chico">{r.nombre}</h2>
            <p className="pastillas">
              {r.momento && <span className="pastilla">{r.momento}</span>}
              {r.porciones && (
                <span className="pastilla">
                  {r.porciones} {r.porciones === 1 ? 'porción' : 'porciones'}
                </span>
              )}
            </p>
          </article>
        ))}
      </div>

      {esVisitante && !cargando && (
        <p className="meta">
          Estas son las recetas abiertas. Con un código de tu entrenador se
          abren todas.
        </p>
      )}

      <p className="descargo">
        Esto es información general de cocina, no una recomendación
        individual. Si tienes alguna condición de salud, consúltalo con un
        profesional.
      </p>
    </Pantalla>
  )
}
