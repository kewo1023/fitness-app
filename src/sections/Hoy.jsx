import { useState, useEffect } from 'react'
import Pantalla from '../components/Pantalla.jsx'
import { supabase } from '../lib/supabase.js'
import { fechaLarga, diaEnBogota, inicioSemanaBogota, hoyBogota }
  from '../data/fechas.js'
import { puntoDelPlan, diaDelPlan, rachaSemanal } from '../lib/plan.js'
import { etiqueta } from '../lib/ejercicios.js'
import { nivelDesdeXp } from '../lib/gamificacion.js'
import Entrenamiento from './Entrenamiento.jsx'

/* OJO: el XP que paga una sesión NO se escribe aquí.
 *
 * Son 50 y viven en el trigger `otorgar_xp` de 03-funciones.sql. Poner
 * un 50 en este archivo para mostrar "+50 XP" crearía una segunda
 * verdad, y el día que el entrenador quiera cambiarlo la pantalla
 * mentiría sin que nada fallara. Así que después de completar se
 * RELEE el XP real y se muestra el número que devolvió la base. */

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

export default function Hoy ({ perfil, recargarPerfil }) {
  const [cargando, setCargando] = useState(true)
  const [plan, setPlan] = useState(null)
  const [dias, setDias] = useState([])
  const [rutina, setRutina] = useState(null)
  const [ejercicios, setEjercicios] = useState([])
  const [fechasHechas, setFechasHechas] = useState([])
  /* La sesión de HOY, que tiene tres estados y no dos:
   *   null                      -> no ha empezado
   *   { completada: false }     -> empezó y no ha terminado
   *   { completada: true }      -> ya la hizo
   * El del medio existe porque la tabla guarda `iniciada_en` y
   * `terminada_en` por separado, y de ahí sale la duración real. Con un
   * solo botón de "ya lo hice" esa columna sería siempre igual a la
   * otra y la capa de analítica perdería el dato antes de existir. */
  const [sesion, setSesion] = useState(null)
  const [ocupado, setOcupado] = useState(false)
  const [avisoXp, setAvisoXp] = useState(null)
  /* Si está DENTRO del entrenamiento o mirándolo desde fuera.
   *
   * Son dos pantallas y no una porque responden dos preguntas
   * distintas: `Hoy` responde "¿qué me toca?" de un vistazo, y el
   * entrenamiento responde "¿voy en la serie 3 o en la 4?" durante
   * cuarenta minutos. Meter la segunda dentro de la primera dejaría la
   * racha y el saludo ocupando la pantalla justo cuando lo único que
   * importa es la lista de series. */
  const [entrenando, setEntrenando] = useState(false)

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

      /* ¿Ya hay una sesión para el día de hoy del plan?
       *
       * Se busca por `plan_dia_id` y no por fecha: el día del plan ES la
       * identidad de "este entrenamiento". Y el `.eq('cliente_id')` va
       * otra vez por la regla 13 — sin él, al entrenador le saldría la
       * sesión de otro y creería que ya entrenó. */
      if (delDia) {
        const { data: hecha } = await supabase
          .from('sesiones')
          .select('id, completada, iniciada_en')
          .eq('cliente_id', perfil.id)
          .eq('plan_dia_id', delDia.id)
          /* LA COMPLETADA GANA SIEMPRE, y por eso este orden va primero.
           * Si alguien empezó dos veces —dos pestañas, un toque doble—
           * queda una sesión terminada y otra en curso. Ordenando solo
           * por fecha ganaría la más nueva, que es la que quedó a
           * medias, y la app le ofrecería terminar algo que ya hizo. */
          .order('completada', { ascending: false })
          .order('iniciada_en', { ascending: false })
          .limit(1)
        if (!vivo) return
        setSesion(hecha?.[0] || null)
      }

      if (delDia?.rutina_id) {
        const [{ data: r }, { data: re }] = await Promise.all([
          supabase.from('rutinas')
            .select('id, nombre, duracion_min, notas')
            .eq('id', delDia.rutina_id).maybeSingle(),
          supabase.from('rutina_ejercicios')
            /* `peso_sugerido` y `nota` los pide la pantalla de
             * registrar series: el primero prellena el campo cuando no
             * hay historial, y la nota es lo que él le diría al lado si
             * estuviera presente. */
            .select('id, orden, series, reps, descanso_seg, peso_sugerido, nota, ' +
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

  /* ---------------------------------------------------------------
     Empezar y terminar
     ---------------------------------------------------------------
     Son dos pasos y no uno porque la tabla guarda `iniciada_en` y
     `terminada_en` por separado. Con un solo botón de "ya lo hice",
     las dos columnas quedarían siempre iguales y la duración real del
     entrenamiento —un dato de la capa de analítica, que según CLAUDE.md
     no se sacrifica— nacería falsa.

     Si alguien empieza y cierra la app, al volver encuentra su sesión
     en curso y puede terminarla. No se pierde. */
  async function empezar () {
    const punto = puntoDelPlan(plan)
    const delDia = diaDelPlan(dias, punto)
    if (!delDia) return

    setOcupado(true)
    const { data, error } = await supabase
      .from('sesiones')
      .insert({
        cliente_id: perfil.id,
        plan_dia_id: delDia.id,
        rutina_id: delDia.rutina_id
        // `completada` se queda en false por defecto: empezar no paga
        // XP. Lo paga terminar, y de eso se encarga el trigger.
      })
      .select('id, completada, iniciada_en')
      .maybeSingle()
    setOcupado(false)

    if (error) {
      console.error('No se pudo empezar la sesión:', error)
      setAvisoXp({ tipo: 'error', texto: 'No se pudo empezar. Revisa la conexión.' })
      return
    }
    setSesion(data)
    // Se entra derecho al entrenamiento. Empezar y quedarse en esta
    // pantalla obligaría a un segundo toque para llegar a lo único que
    // se va a hacer los próximos cuarenta minutos.
    setEntrenando(true)
  }

  async function terminar () {
    if (!sesion) return
    setOcupado(true)
    setAvisoXp(null)

    const antes = nivelDesdeXp(perfil.xp)

    const { error } = await supabase
      .from('sesiones')
      .update({ completada: true, terminada_en: new Date().toISOString() })
      .eq('id', sesion.id)
      .eq('cliente_id', perfil.id)      // regla 13: la política dice
                                        // cliente_id = auth.uid(), pero
                                        // el filtro se escribe igual
    if (error) {
      setOcupado(false)
      console.error('No se pudo terminar la sesión:', error)
      /* 23505 es el índice único de 06-sesiones.sql: este día ya estaba
       * completado. No es un fallo del usuario ni algo que deba ver como
       * error rojo — casi siempre es un doble toque o dos pestañas. */
      if (error.code === '23505') setEntrenando(false)
      setAvisoXp(error.code === '23505'
        ? { tipo: 'ok', texto: 'Este entrenamiento ya estaba marcado como hecho.' }
        : { tipo: 'error', texto: 'No se pudo guardar. Revisa la conexión.' })
      return
    }

    /* El XP lo sumó el TRIGGER, en la base, mientras corría el update.
     * Aquí solo se vuelve a leer para poder decir el número de verdad.
     * El `.eq('id')` es la regla 13 en su versión original — la del bug
     * del 2/09, que empezó justo en esta tabla. */
    const { data: yo } = await supabase
      .from('perfiles').select('xp').eq('id', perfil.id).maybeSingle()

    const despues = nivelDesdeXp(yo?.xp)
    setOcupado(false)
    setSesion(s => ({ ...s, completada: true }))
    setFechasHechas(f => [...f, hoyBogota()])
    // Se vuelve a `Hoy` para que el aviso del XP se vea: es la
    // recompensa de haber terminado y se pierde si queda detrás de la
    // pantalla del entrenamiento.
    setEntrenando(false)
    setAvisoXp({
      tipo: 'ok',
      texto: despues > antes
        ? `¡Subiste al nivel ${despues}! Llevas ${yo?.xp} XP.`
        : `Entrenamiento guardado. Llevas ${yo?.xp} XP.`
    })

    // Para que el XP y el nivel de la pestaña Perfil no se queden viejos.
    if (recargarPerfil) recargarPerfil()
  }

  const encabezado = {
    titulo: `Hola, ${perfil.nombre}`,
    bajada: fechaLarga()
  }

  if (cargando) {
    return <Pantalla {...encabezado}><p className="meta">Cargando…</p></Pantalla>
  }

  /* DENTRO del entrenamiento. Se pide `rutina` además de la sesión
   * porque un día suelto puede tener sesión sin rutina —entrenar fuera
   * del plan— y ahí no hay series que registrar: no habría nada que
   * pintar y la pantalla saldría vacía sin explicar por qué. */
  if (entrenando && sesion && !sesion.completada && rutina) {
    return (
      <Entrenamiento
        sesion={sesion}
        rutina={rutina}
        ejercicios={ejercicios}
        perfil={perfil}
        ocupado={ocupado}
        alVolver={() => setEntrenando(false)}
        alTerminar={terminar}
      />
    )
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

            {avisoXp && (
              <p className={'aviso' + (avisoXp.tipo === 'error' ? ' es-error' : ' es-ok')}>
                {avisoXp.texto}
              </p>
            )}

            {/* TRES BOTONES DISTINTOS PARA TRES ESTADOS, y ninguno
                aparece a la vez. Un solo botón que cambie de texto se
                lee peor: aquí el estado "ya lo hiciste" no es un botón,
                porque no hay nada más que hacer y ofrecer una acción
                que no existe invita a tocarla. */}
            {sesion?.completada ? (
              <p className="estado es-ok">Hecho por hoy ✓</p>
            ) : sesion ? (
              /* Ya empezó y no terminó. El botón lleva DE VUELTA al
               * entrenamiento en vez de terminarlo desde aquí: terminar
               * es lo que se hace al final, y ofrecerlo en la pantalla
               * de entrada invita a darle sin haber entrenado. */
              <button type="button" className="boton-principal"
                      disabled={ocupado} onClick={() => setEntrenando(true)}>
                Seguir entrenamiento
              </button>
            ) : (
              <button type="button" className="boton-principal"
                      disabled={ocupado} onClick={empezar}>
                {ocupado ? 'Un momento…' : 'Empezar entrenamiento'}
              </button>
            )}

            {sesion && !sesion.completada && (
              <p className="pista">
                Puedes cerrar la app: cuando vuelvas sigue aquí para que
                la termines.
              </p>
            )}
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
