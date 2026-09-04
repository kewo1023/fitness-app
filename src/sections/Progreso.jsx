import { useState, useEffect } from 'react'
import Pantalla from '../components/Pantalla.jsx'
import { supabase } from '../lib/supabase.js'
import { formatearFecha, nombreDia, diaSemanaBogota, inicioSemanaBogota, hoyBogota }
  from '../data/fechas.js'
import { formatearMinutos, semanasSeguidas } from '../lib/analitica.js'
import { nivelDesdeXp } from '../lib/gamificacion.js'

/* =====================================================================
   Progreso — lo que ya hizo. Ya no es mock.
   =====================================================================

   Era la última pantalla de la app que inventaba sus datos. Con esto
   `mock.js` se queda sin nada que guardar y desaparece, que era la
   promesa escrita en su propia cabecera desde la Fase 2.

   LOS NÚMEROS NO SE CALCULAN AQUÍ. Los tres de arriba salen de
   `v_resumen_cliente` y las semanas de `v_semanas_cliente`, las dos en
   `supabase/08-analitica.sql`. Esta pantalla pide y pinta.

   No es purismo: es que la racha que muestra `Hoy`, la que ve el
   entrenador en su panel y la que se pinta aquí tienen que ser el mismo
   número. Sumadas en tres sitios distintos, un día dejan de serlo y
   nadie sabe cuál está mal.

   =====================================================================
   LA REGLA 13, otra vez y por el mismo motivo
   =====================================================================

   Las tres vistas llevan `security_invoker`, así que el RLS de
   `sesiones` se aplica de verdad. Y como la política de `sesiones`
   termina en `or es_admin()`, para el ENTRENADOR esas vistas devuelven
   las filas de todos sus clientes.

   Sin el `.eq('cliente_id', …)` explícito, esta pantalla le mostraría
   al entrenador el historial de un cliente cualquiera como si fuera
   suyo. Es el bug del 2/09 esperando en una capa nueva.
   ===================================================================== */

/* Cuántas sesiones trae el historial. No son todas a propósito: quien
 * lleve dos años en la app tendría que descargar trescientas filas para
 * ver las de esta semana, con datos móviles, en la pantalla que menos
 * urgencia tiene de la app. Las viejas siguen estando —salen completas
 * en "Mis datos", que es el derecho de consulta de la Ley 1581— pero no
 * en la primera carga. */
const CUANTAS = 30

/* Ocho semanas de barra. Es lo que cabe sin apretarse en 360 px de
 * ancho, que es el Android de referencia. Con doce, cada barra queda
 * en 22 px y deja de leerse como una tendencia. */
const SEMANAS = 8

export default function Progreso ({ perfil }) {
  const [cargando, setCargando] = useState(true)
  const [resumen, setResumen] = useState(null)
  const [historial, setHistorial] = useState([])
  const [semanas, setSemanas] = useState([])

  useEffect(() => {
    let vivo = true
    ;(async () => {
      /* El lunes desde el que se piden las semanas. Se calcula con
       * `inicioSemanaBogota` y no con el reloj del celular por la regla
       * 5: quien mira esto puede estar en otra zona horaria, y la
       * semana de la app se corta en Bogotá siempre. */
      const lunes = inicioSemanaBogota(hoyBogota())
      const desde = new Date(`${lunes}T00:00:00Z`)
      desde.setUTCDate(desde.getUTCDate() - (SEMANAS - 1) * 7)
      const desdeTexto = desde.toISOString().slice(0, 10)

      const [r, h, s] = await Promise.all([
        supabase.from('v_resumen_cliente')
          .select('entrenamientos, minutos, primera, ultima')
          .eq('cliente_id', perfil.id)          // regla 13
          .maybeSingle(),

        supabase.from('v_sesiones_cliente')
          .select('id, fecha, minutos, rutina, completada')
          .eq('cliente_id', perfil.id)          // regla 13
          .eq('completada', true)
          .order('fecha', { ascending: false })
          .limit(CUANTAS),

        supabase.from('v_semanas_cliente')
          .select('lunes, dias, meta, cumplida')
          .eq('cliente_id', perfil.id)          // regla 13
          .gte('lunes', desdeTexto)
          .order('lunes')
      ])

      if (!vivo) return

      if (r.error) console.error('No se pudo leer el resumen:', r.error)
      if (h.error) console.error('No se pudo leer el historial:', h.error)
      if (s.error) console.error('No se pudieron leer las semanas:', s.error)

      setResumen(r.data || null)
      setHistorial(h.data || [])
      setSemanas(semanasSeguidas(s.data || [], lunes, SEMANAS))
      setCargando(false)
    })()
    return () => { vivo = false }
  }, [perfil.id])

  const encabezado = { titulo: 'Progreso', bajada: 'Lo que llevas hecho' }

  if (cargando) {
    return <Pantalla {...encabezado}><p className="meta">Cargando…</p></Pantalla>
  }

  /* El VISITANTE no tiene progreso y no es un error: no tiene plan.
   * Igual que en Perfil, se le dice qué se está perdiendo y cómo se
   * abre, porque una pantalla vacía sin explicación se lee como que la
   * app está rota. */
  if (perfil.rol === 'visitante') {
    return (
      <Pantalla {...encabezado}>
        <section className="tarjeta">
          <h2 className="chico">Aquí va a estar tu historial</h2>
          <p className="meta">
            Cuando tu entrenador te dé un código, cada entrenamiento que
            termines queda registrado aquí: cuántos llevas, cuánto tiempo
            y qué semanas cumpliste.
          </p>
        </section>
      </Pantalla>
    )
  }

  const sinNada = !resumen || resumen.entrenamientos === 0

  /* El ENTRENADOR entra aquí y no ve nada, porque él no entrena en su
   * propia app. Decirle "todavía no has entrenado" sería cierto y
   * completamente inútil: se le manda a donde sí hay algo para él. */
  if (sinNada && perfil.rol === 'admin') {
    return (
      <Pantalla {...encabezado}>
        <section className="tarjeta">
          <h2 className="chico">Esta es la pantalla de tus clientes</h2>
          <p className="meta">
            Aquí cada uno ve su historial y sus semanas cumplidas. Lo tuyo
            —quién está entrenando y quién no— está en Perfil, en
            “Cómo van tus clientes”.
          </p>
        </section>
      </Pantalla>
    )
  }

  if (sinNada) {
    return (
      <Pantalla {...encabezado}>
        <section className="tarjeta">
          <h2 className="chico">Todavía no hay nada que mostrar</h2>
          <p className="meta">
            Cuando termines tu primer entrenamiento desde la pestaña Hoy,
            aparece aquí.
          </p>
        </section>
      </Pantalla>
    )
  }

  /* El máximo de la barra. Se calcula sobre lo que se va a pintar y no
   * sobre la meta, porque una semana en la que entrenó de MÁS tiene que
   * caber: con el máximo clavado en la meta, esa barra se saldría del
   * cajón o habría que recortarla, y recortarla sería esconder el mejor
   * dato de la pantalla.
   *
   * El mínimo de 1 evita dividir por cero cuando todas están en cero. */
  const tope = Math.max(1, ...semanas.map(s => s.dias))

  return (
    <Pantalla {...encabezado}>
      <section className="cifras">
        <div className="cifra">
          <strong>{resumen.entrenamientos}</strong>
          <small>entrenamientos</small>
        </div>
        <div className="cifra">
          <strong>{formatearMinutos(resumen.minutos)}</strong>
          <small>entrenando</small>
        </div>
        <div className="cifra">
          <strong>{nivelDesdeXp(perfil.xp)}</strong>
          <small>nivel</small>
        </div>
      </section>

      <h3 className="titulillo">
        Tus semanas <span className="tenue">últimas {SEMANAS}</span>
      </h3>

      {/* La barra por semanas. Es la única forma de ver constancia: una
          lista de sesiones dice qué hizo, esto dice si viene sosteniendo
          el ritmo o si lleva un mes cayéndose.

          `aria-hidden` en las barras y la tabla de verdad en el texto de
          abajo: un lector de pantalla no puede leer alturas. */}
      <section className="semanas" aria-hidden="true">
        {semanas.map(s => (
          <span key={s.lunes}
                className={'semana' + (s.cumplida ? ' es-cumplida' : '')}>
            <span className="semana-barra"
                  style={{ '--alto': `${Math.round((s.dias / tope) * 100)}%` }} />
            <small>{formatearFecha(s.lunes).split(' ')[0]}</small>
          </span>
        ))}
      </section>

      <p className="meta">
        {semanas.filter(s => s.cumplida).length === 0
          ? 'Todavía no has cerrado una semana completa. Se cierra al llegar a tu meta.'
          : `Cumpliste tu meta en ${semanas.filter(s => s.cumplida).length} de las últimas ${SEMANAS} semanas.`}
      </p>

      <h3 className="titulillo">
        Historial <span className="tenue">{historial.length}</span>
      </h3>
      <ul className="lista">
        {historial.map(s => (
          <li key={s.id} className="fila">
            <span className="fila-datos">
              {/* Una sesión puede no tener rutina: `sesiones.rutina_id`
                  admite null para el entrenamiento suelto, fuera del
                  plan. Sin este respaldo, esa fila saldría en blanco. */}
              <strong>{s.rutina || 'Entrenamiento'}</strong>
              <small>
                {nombreDia(diaSemanaBogota(s.fecha))} {formatearFecha(s.fecha)}
              </small>
            </span>
            <span className="estado es-ok">
              {/* Sin `terminada_en` no hay duración que mostrar, y
                  poner "0 min" sería afirmar algo falso sobre un
                  entrenamiento que sí ocurrió. */}
              {s.minutos ? `${s.minutos} min` : 'hecho'}
            </span>
          </li>
        ))}
      </ul>
    </Pantalla>
  )
}
