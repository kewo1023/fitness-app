import { useState, useEffect } from 'react'
import Pantalla from '../components/Pantalla.jsx'
import { supabase } from '../lib/supabase.js'
import { fechaLarga, diaEnBogota, inicioSemanaBogota, hoyBogota }
  from '../data/fechas.js'
import { puntoDelPlan, diaDelPlan, rachaSemanal } from '../lib/plan.js'
import { etiqueta } from '../lib/ejercicios.js'

/* =====================================================================
   Hoy — la pantalla de entrada. Ya no es mock.
   =====================================================================

   Responde UNA pregunta: ¿qué hago hoy? No ofrece opciones, ofrece EL
   entrenamiento del día. Es la diferencia entre una app que se usa y un
   catálogo que se abre una vez.

   Hasta el 4/09 la rutina y la racha salían de `mock.js`. Ahora salen
   del plan del cliente, que es lo que hace que esto sea una app de
   entrenamiento y no un catálogo con un saludo.

   =====================================================================
   LA REGLA 13, QUE AQUÍ MUERDE TRES VECES
   =====================================================================

   `planes`, `plan_dias` y `sesiones` tienen políticas que terminan en
   `or es_admin()`. Para el entrenador esa condición es VERDADERA EN
   TODAS LAS FILAS: sin un filtro explícito, esta pantalla le mostraría
   el plan de un cliente cualquiera —el primero que devuelva la base—
   como si fuera suyo. Y peor: le mostraría las sesiones de otro.

   Por eso las tres consultas llevan su `.eq('cliente_id', …)` aunque
   la política "ya filtre". RLS decide qué se PUEDE ver, no qué se
   QUIERE ver. Costó cuatro bugs el 2/09.

   =====================================================================
   TRES ESTADOS QUE NO SON "NO HAY NADA"
   =====================================================================

   Un cliente sin rutina hoy puede estar en cuatro situaciones
   distintas, y decirle "no hay nada" a las cuatro sería mentirle a
   tres:

     - No tiene plan            -> su entrenador no se lo asignó todavía.
     - El plan arranca después  -> normal: se asigna el viernes para el
                                   lunes. Se le dice cuándo empieza.
     - Hoy es día de DESCANSO   -> el entrenador lo programó. Descansar
                                   es parte del plan, no un hueco.
     - El plan terminó          -> cumplió su ciclo. No es un error.

   El descanso es el que más importa: la bitácora ya decidió el 31/08
   que la racha es semanal y no diaria justamente porque castigar el
   descanso es lo contrario de lo que un entrenador quiere.
   ===================================================================== */

export default function Hoy ({ perfil }) {
  const [cargando, setCargando] = useState(true)
  const [plan, setPlan] = useState(null)
  const [dias, setDias] = useState([])
  const [rutina, setRutina] = useState(null)
  const [ejercicios, setEjercicios] = useState([])
  const [fechasHechas, setFechasHechas] = useState([])

  useEffect(() => {
    let vivo = true
    ;(async () => {
      const hoy = hoyBogota()

      /* 1. El plan activo DE ESTA PERSONA. El `.eq('cliente_id')` es
       *    obligatorio: ver el comentario de la regla 13 arriba.
       *    `maybeSingle` y no `single` porque no tener plan es normal,
       *    no un error — un visitante nunca va a tener uno. */
      const { data: p, error: errPlan } = await supabase
        .from('planes')
        .select('id, nombre, semanas, inicio, meta_semanal')
        .eq('cliente_id', perfil.id)
        .eq('activo', true)
        .maybeSingle()

      if (!vivo) return
      if (errPlan) console.error('No se pudo leer el plan:', errPlan)

      if (!p) { setCargando(false); return }
      setPlan(p)

      /* 2. Los días del plan. Se piden TODOS y se elige en el navegador
       *    en vez de preguntar por la semana y el día concretos.
       *
       *    Es a propósito: un plan de 4 semanas son como mucho 28 filas
       *    de tres columnas, o sea nada. A cambio, la pantalla no
       *    necesita otra consulta si mañana hay que mostrar "lo que
       *    viene esta semana", y el cálculo de qué día es queda en un
       *    solo sitio probado (`plan.js`) en vez de repartido entre el
       *    código y una consulta. */
      const { data: pd } = await supabase
        .from('plan_dias')
        .select('id, semana, dia, rutina_id')
        .eq('plan_id', p.id)

      if (!vivo) return
      setDias(pd || [])

      /* 3. Las sesiones completadas de la semana, para la racha.
       *
       *    Se piden desde el lunes MENOS UN DÍA. No es paranoia: la
       *    base guarda un instante en UTC y la semana se corta en hora
       *    de Bogotá, que va cinco horas atrás. Una sesión del lunes a
       *    las 8 p.m. en Bogotá quedó guardada como martes en UTC. Con
       *    el corte justo en el lunes, esa sesión se perdería. El día
       *    de sobra se filtra después con `diaEnBogota`, que es quien
       *    de verdad decide. Regla 5. */
      const desde = inicioSemanaBogota(hoy)
      const colchon = new Date(`${desde}T00:00:00Z`)
      colchon.setUTCDate(colchon.getUTCDate() - 1)

      const { data: ses } = await supabase
        .from('sesiones')
        .select('iniciada_en, terminada_en')
        .eq('cliente_id', perfil.id)        // regla 13, otra vez
        .eq('completada', true)
        .gte('iniciada_en', colchon.toISOString())

      if (!vivo) return
      // Una sesión cuenta el día que se TERMINÓ. Si terminada_en está
      // vacío se usa cuándo empezó, que es lo más cercano a la verdad.
      setFechasHechas(
        (ses || []).map(s => diaEnBogota(s.terminada_en || s.iniciada_en))
      )

      /* 4. La rutina de hoy, solo si hoy toca alguna. */
      const punto = puntoDelPlan(p, hoy)
      const delDia = diaDelPlan(pd || [], punto)

      if (delDia?.rutina_id) {
        const [{ data: r }, { data: re }] = await Promise.all([
          supabase.from('rutinas')
            .select('id, nombre, duracion_min, notas')
            .eq('id', delDia.rutina_id).maybeSingle(),
          supabase.from('rutina_ejercicios')
            .select('id, orden, series, reps, ' +
                    'ejercicios ( id, nombre, grupo, equipo )')
            .eq('rutina_id', delDia.rutina_id)
            .order('orden')
        ])
        if (!vivo) return
        setRutina(r || null)
        setEjercicios(re || [])
      }

      setCargando(false)
    })()
    return () => { vivo = false }
  }, [perfil.id])

  const encabezado = {
    titulo: `Hola, ${perfil.nombre}`,
    bajada: fechaLarga()
  }

  if (cargando) {
    return <Pantalla {...encabezado}><p className="meta">Cargando…</p></Pantalla>
  }

  /* --- Sin plan: tres mensajes distintos, uno por rol --------------- */
  if (!plan) {
    return (
      <Pantalla {...encabezado}>
        <section className="tarjeta">
          {perfil.rol === 'admin' ? (
            <>
              <h2>Esta es la pantalla de tus clientes</h2>
              <p className="meta">
                Aquí cada uno ve su rutina del día. Para asignarle un plan
                a alguien, entra a tu biblioteca desde Perfil.
              </p>
            </>
          ) : perfil.rol === 'visitante' ? (
            <>
              <h2>Todavía no tienes un plan</h2>
              <p className="meta">
                Con un código de tu entrenador se abren tu plan, tu
                progreso y tus rutinas de la semana. Mientras tanto puedes
                ver toda la biblioteca de ejercicios.
              </p>
            </>
          ) : (
            <>
              <h2>Tu entrenador todavía no te asignó un plan</h2>
              <p className="meta">
                Cuando lo haga, aquí vas a ver qué te toca cada día.
              </p>
            </>
          )}
        </section>
      </Pantalla>
    )
  }

  const punto = puntoDelPlan(plan)
  const delDia = diaDelPlan(dias, punto)
  const racha = rachaSemanal(plan, fechasHechas)

  return (
    <Pantalla {...encabezado}>
      {/* La racha. Único lugar de la app donde aparece el cobre de
          señal, y por eso sigue arriba: si apareciera en tres sitios
          dejaría de significar algo. Es SEMANAL, no diaria — decisión
          del 31/08: una racha diaria castiga el descanso. */}
      <section className="racha">
        <div className="racha-texto">
          <p className="racha-cifra">
            {racha.mostradas}<span> / {racha.meta}</span>
          </p>
          <p className="racha-pie">
            {racha.cumplida
              ? 'Semana cumplida. Bien ahí.'
              : `Te ${racha.faltan === 1 ? 'falta' : 'faltan'} ${racha.faltan} esta semana`}
          </p>
        </div>
        <div className="racha-puntos" aria-hidden="true">
          {Array.from({ length: racha.meta }, (_, i) => (
            <span key={i}
                  className={'punto' + (i < racha.mostradas ? ' es-lleno' : '')} />
          ))}
        </div>
      </section>

      {punto.estado === 'noEmpieza' && (
        <section className="tarjeta destacada">
          <p className="etiqueta">{plan.nombre}</p>
          <h2>Tu plan arranca pronto</h2>
          <p className="meta">
            Empieza el {fechaLarga(plan.inicio).toLowerCase()}. Hasta
            entonces puedes mirar la biblioteca de ejercicios.
          </p>
        </section>
      )}

      {punto.estado === 'terminado' && (
        <section className="tarjeta destacada">
          <p className="etiqueta">{plan.nombre}</p>
          <h2>Terminaste este plan</h2>
          <p className="meta">
            Completaste las {plan.semanas} semanas. Habla con tu entrenador
            para el siguiente.
          </p>
        </section>
      )}

      {punto.estado === 'enCurso' && !delDia && (
        <section className="tarjeta destacada">
          <p className="etiqueta">{plan.nombre} · Semana {punto.semana}</p>
          <h2>Hoy no tienes rutina</h2>
          <p className="meta">
            Tu plan no tiene nada programado para hoy.
          </p>
        </section>
      )}

      {/* DESCANSO PROGRAMADO. Se distingue del caso de arriba a
          propósito: la fila existe en el plan y su rutina está vacía, o
          sea que el entrenador lo puso ahí. Decirle "no tienes nada"
          convertiría una decisión suya en un hueco. */}
      {punto.estado === 'enCurso' && delDia && !delDia.rutina_id && (
        <section className="tarjeta destacada">
          <p className="etiqueta">{plan.nombre} · Semana {punto.semana}</p>
          <h2>Hoy toca descansar</h2>
          <p className="meta">
            El descanso es parte del plan. Mañana seguimos.
          </p>
        </section>
      )}

      {punto.estado === 'enCurso' && rutina && (
        <>
          <section className="tarjeta destacada">
            <p className="etiqueta">{plan.nombre} · Semana {punto.semana}</p>
            <h2>{rutina.nombre}</h2>
            <p className="meta">
              {ejercicios.length} ejercicios
              {rutina.duracion_min && ` · ${rutina.duracion_min} min`}
            </p>
            {rutina.notas && <p className="meta">{rutina.notas}</p>}
            {/* El botón de empezar entra en la próxima sesión, junto con
                marcar la sesión como completa y el XP. Se dice en vez de
                poner un botón que no hace nada: un botón muerto se lee
                como que la app falló. */}
            <p className="pista">
              Marcar el entrenamiento como hecho llega en la próxima
              versión. Por ahora esta es tu rutina del día.
            </p>
          </section>

          <h3 className="titulillo">Los ejercicios</h3>
          <ol className="lista-ejercicios">
            {ejercicios.map((re, i) => (
              <li key={re.id} className="ejercicio">
                <span className="ejercicio-video" aria-hidden="true">{i + 1}</span>
                <span className="ejercicio-datos">
                  <strong>{re.ejercicios?.nombre}</strong>
                  <small>
                    {etiqueta(re.ejercicios?.grupo)}
                    {re.ejercicios?.equipo && ` · ${etiqueta(re.ejercicios.equipo)}`}
                  </small>
                </span>
                <span className="ejercicio-series">
                  {re.series} × {re.reps}
                </span>
              </li>
            ))}
          </ol>
        </>
      )}
    </Pantalla>
  )
}
