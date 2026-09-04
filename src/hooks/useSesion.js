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

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

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
    for (let intento = 0; intento < 3; intento++) {
      const { data, error } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', idUsuario)
        .maybeSingle()

      // Sin error hay respuesta de verdad, y `null` aquí SÍ significa
      // "no tiene perfil": la consulta corrió y no encontró la fila.
      if (!error) return data

      // A la consola, no a la pantalla: quien abre la app no sabe qué
      // es una tabla ni le sirve saberlo (regla 3 de CLAUDE.md).
      console.error(`No se pudo leer el perfil (intento ${intento + 1}):`, error)
      await new Promise(r => setTimeout(r, 300 * (intento + 1)))
    }

    /* undefined, NUNCA null. Es la corrección del 4/09: agotados los
     * reintentos seguimos SIN SABER si esta persona tiene perfil, y
     * devolver null haría que la app afirme que no lo tiene. */
    return undefined
  }, [])

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
        setSesion(nuevaSesion)

        // Sin sesión el perfil es null de verdad: no hay a quién
        // buscarle uno. Aquí null sí es una respuesta.
        if (!nuevaSesion) {
          setPerfil(null)
          setErrorPerfil(false)
          setCargando(false)
          return
        }

        const traido = await traerPerfil(nuevaSesion.user.id)
        if (!vivo) return
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
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setPerfil(null); setErrorPerfil(false); return }

    const traido = await traerPerfil(session.user.id)
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
