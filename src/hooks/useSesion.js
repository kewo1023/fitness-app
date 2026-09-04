/* =====================================================================
   useSesion.js — quién está usando la app, en un solo sitio.
   =====================================================================

   LO MÁS IMPORTANTE DE ESTE ARCHIVO, y lo que más confunde al empezar
   con Supabase: **estar autenticado y tener perfil son cosas
   distintas.**

     - `sesion`  -> Supabase sabe que existes: tienes correo y clave.
     - `perfil`  -> la app sabe quién eres: nombre, rol, XP.

   Se puede tener lo primero sin lo segundo, y ese estado no es un
   error: es alguien que se registró y todavía no ha dicho su nombre ni
   ha canjeado un código. Sin perfil, todas las políticas de la base le
   dejan ver exactamente nada.

   Los tres estados que devuelve, y qué pinta la app en cada uno:

     sesion=null                    -> pantalla de acceso
     sesion=algo, perfil=undefined  -> todavía no se sabe: cargando
     sesion=algo, perfil=null       -> pantalla de activación
     sesion=algo, perfil=algo       -> la app

   OJO CON undefined Y null: no son lo mismo y confundirlos costó dos
   bugs. `undefined` es "no sabemos"; `null` es "preguntamos y no
   tiene". Quién decide la pantalla es `src/lib/acceso.js`, que está
   probado.

   Analogía de Excel: `sesion` es haber abierto el archivo protegido con
   contraseña; `perfil` es la fila que dice tu nombre y qué permisos
   tienes. Abrir el archivo no te mete en la tabla de usuarios.
   ===================================================================== */

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import {
  hayQueReintentar, resultadoPerfil, alCambiarSesion
} from '../lib/acceso.js'

export function useSesion () {
  const [sesion, setSesion] = useState(null)
  /* undefined, NO null. Los dos valores significan cosas distintas y
   * confundirlos es el bug del 4/09 (ver src/lib/acceso.js):
   *   undefined -> todavía no se sabe
   *   null      -> se preguntó y esta persona no tiene perfil
   * Arrancar en null sería afirmar, antes de preguntar, que no tiene. */
  const [perfil, setPerfil] = useState(undefined)
  const [errorPerfil, setErrorPerfil] = useState(false)
  const [cargando, setCargando] = useState(true)

  /* Cuál es la búsqueda del perfil más reciente. Ver el comentario
   * largo dentro de onAuthStateChange: sin esto, una respuesta vieja
   * que llega tarde pisa a una nueva que ya llegó. */
  const peticion = useRef(0)

  /* El perfil que hay AHORA, en una referencia además de en el estado.
   *
   * El callback de onAuthStateChange se registra una sola vez, así que
   * la variable `perfil` que ve por dentro se queda congelada en la del
   * primer render —vacía— para siempre. Una referencia sí se puede leer
   * al día. Es el clásico "closure viejo" de React, y aquí importa
   * porque de ese valor depende no poner la app en blanco cada vez que
   * se refresca el token. */
  const perfilVigente = useRef(undefined)

  /* Trae el perfil del usuario actual.
   *
   * maybeSingle() y no single(): single() considera un ERROR que no
   * haya fila, y aquí "no hay fila" es un estado normal y esperado —
   * es justamente el visitante que aún no se ha activado. Con single()
   * la app mostraría un error rojo a alguien que no ha hecho nada mal.
   *
   * EL .eq('id', ...) NO SOBRA, y quitarlo rompe la app ENTERA para el
   * entrenador. Es el bug del 2/09 y vale la pena entenderlo, porque el
   * mismo error se puede repetir en cualquier consulta futura.
   *
   * Antes esta consulta no filtraba por nadie: pedía "las filas de
   * perfiles" y confiaba en que RLS devolviera solo la del usuario. Y
   * para un cliente eso es cierto. Pero la política dice
   *
   *     using (id = auth.uid() OR es_admin())
   *
   * o sea que PARA UN ADMIN es verdadera en TODAS las filas: el
   * entrenador recibe los perfiles de todos sus clientes. Entonces
   * maybeSingle() —que falla si llega más de una fila— devolvía error,
   * el error se traducía a `perfil = null`, y la app leía eso como
   * "esta persona no se ha activado" y le mostraba la pantalla de
   * activación al dueño de la app. Al enviarla, la función SQL
   * respondía "Esta cuenta ya está activada" y ahí quedaba, en un
   * callejón sin salida.
   *
   * LA LECCIÓN, que aplica a toda consulta nueva: RLS decide qué se
   * PUEDE ver, no qué se QUIERE ver. Si el código necesita una fila
   * concreta, la pide por su id. Confiar en que la política recorte
   * hasta dejar una sola funciona para el 90% de los usuarios y falla
   * justo para el que más permisos tiene — que es el peor sitio donde
   * puede fallar y el último donde se prueba.
   *
   * En Excel: es la diferencia entre filtrar la tabla y confiar en que
   * solo quedó una fila visible, contra usar BUSCARV con la clave. Lo
   * segundo devuelve lo que pediste aunque el filtro cambie. */
  const traerPerfil = useCallback(async (idUsuario) => {
    if (!idUsuario) return undefined

    /* REINTENTOS, y la razón es concreta.
     *
     * Al abrir la app con la sesión guardada, Supabase avisa primero
     * con el token que tenía en el celular. Si ese token ya venció, esta
     * consulta falla, y un instante después la librería lo refresca
     * sola y todo funciona. O sea: el primer fallo no es un fallo, es el
     * estado normal de arrancar.
     *
     * Sin reintentos había que esperar al siguiente aviso de Supabase
     * para recuperarse, y en ese hueco la app ya había decidido qué
     * pantalla mostrar — con información equivocada. */
    const MAXIMO = 4
    let ultimo = { data: null, error: null }

    for (let intento = 0; intento < MAXIMO; intento++) {
      ultimo = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', idUsuario)
        .maybeSingle()

      if (!hayQueReintentar({ ...ultimo, intento, maximo: MAXIMO })) break

      if (ultimo.error) {
        // A la consola, no a la pantalla: quien abre la app no sabe qué
        // es una tabla ni le sirve saberlo (regla 3 de CLAUDE.md).
        console.error(`No se pudo leer el perfil (intento ${intento + 1}):`,
                      ultimo.error)
      }
      await new Promise(r => setTimeout(r, 250 * (intento + 1)))
    }

    return resultadoPerfil(ultimo)
  }, [])

  useEffect(() => { perfilVigente.current = perfil }, [perfil])

  useEffect(() => {
    let vivo = true   // evita escribir estado si el componente ya murió

    /* onAuthStateChange se dispara al arrancar Y en cada cambio de
     * sesión, así que sirve para las dos cosas a la vez: saber en qué
     * estado se abre la app, y enterarse de que alguien entró o salió.
     * Antes se hacía con getSession() aparte; esto es una llamada menos
     * y no deja un hueco entre las dos. */
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_evento, nuevaSesion) => {
        if (!vivo) return

        /* TODO EL ESTADO SE FIJA DE UNA, ANTES DE IR A LA RED.
         *
         * Esta línea es el arreglo del parpadeo, y lo que arregla es
         * que antes `setSesion` se aplicaba solo: quedaba la sesión
         * nueva junto al `perfil = null` del evento anterior, y ese
         * par es exactamente la pantalla de activación. El detalle
         * está contado en `alCambiarSesion`, en src/lib/acceso.js.
         *
         * `perfilVigente` se lee de una referencia y no del estado
         * porque este callback lo creó React una sola vez: la variable
         * `perfil` que ve aquí dentro es la del primer render y estaría
         * siempre vacía. */
        const siguiente = alCambiarSesion(nuevaSesion, perfilVigente.current)
        setSesion(siguiente.sesion)
        setPerfil(siguiente.perfil)
        setErrorPerfil(siguiente.errorPerfil)
        setCargando(siguiente.cargando)

        if (!nuevaSesion) {
          peticion.current++          // invalida cualquier búsqueda en vuelo
          return
        }

        /* EL NÚMERO DE PETICIÓN, QUE ES LA MITAD DEL ARREGLO DEL 4/09.
         *
         * `onAuthStateChange` no se dispara una vez: al abrir la app
         * llega `INITIAL_SESSION` y muy poco después puede llegar
         * `SIGNED_IN` o `TOKEN_REFRESHED`. Cada uno arranca su propia
         * búsqueda del perfil, y las dos van por la red al tiempo.
         *
         * Sin este contador gana la que TERMINE última, no la más
         * nueva. Si la vieja —la que salió antes de que el token
         * estuviera puesto y volvió vacía— termina de última, machaca
         * el perfil bueno con un null y la app manda al entrenador a la
         * pantalla de activación.
         *
         * Con el contador, cada búsqueda se queda con su número y solo
         * escribe si sigue siendo la última. Es el mismo `vivo` de
         * arriba, pero por evento en vez de por componente.
         *
         * En Excel: es no dejar que un cálculo viejo sobrescriba la
         * celda cuando ya entró un dato más reciente. */
        const mia = ++peticion.current
        const traido = await traerPerfil(nuevaSesion.user.id)
        if (!vivo || mia !== peticion.current) return

        setPerfil(traido)
        setErrorPerfil(traido === undefined)
        setCargando(false)
      }
    )

    // Desconectar al desmontar. Sin esto, cada montaje deja una
    // suscripción viva escuchando para siempre: la fuga de memoria más
    // común de React.
    return () => { vivo = false; subscription.unsubscribe() }
  }, [traerPerfil])

  /* Para llamar después de activar la cuenta o de canjear un código:
   * el perfil cambió en la base, pero la app todavía tiene el de
   * antes. */
  const recargarPerfil = useCallback(async () => {
    // El id sale de la sesión que ya está en memoria. Se lee de dentro
    // de setPerfil para no tener que meter `sesion` en las dependencias
    // del useCallback: si estuviera, esta función se volvería a crear en
    // cada cambio de sesión y quien la reciba por props se re-renderiza
    // sin motivo.
    const mia = ++peticion.current
    const { data: { session } } = await supabase.auth.getSession()
    if (mia !== peticion.current) return
    if (!session) { setPerfil(null); setErrorPerfil(false); return }

    const traido = await traerPerfil(session.user.id)
    if (mia !== peticion.current) return   // mismo guardia que arriba

    setPerfil(traido)
    setErrorPerfil(traido === undefined)
  }, [traerPerfil])

  const salir = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  return {
    sesion,
    perfil,
    errorPerfil,
    cargando,
    recargarPerfil,
    salir,
    // Atajos, para que las pantallas no anden comparando textos sueltos
    // por ahí. Si mañana se agrega un cuarto rol, se cambia aquí.
    esAdmin:     perfil?.rol === 'admin',
    esCliente:   perfil?.rol === 'cliente' || perfil?.rol === 'admin',
    esVisitante: perfil?.rol === 'visitante'
  }
}
