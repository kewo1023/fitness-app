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

     sesion=null                  -> pantalla de acceso
     sesion=algo, perfil=null     -> pantalla de activación
     sesion=algo, perfil=algo     -> la app

   Analogía de Excel: `sesion` es haber abierto el archivo protegido con
   contraseña; `perfil` es la fila que dice tu nombre y qué permisos
   tienes. Abrir el archivo no te mete en la tabla de usuarios.
   ===================================================================== */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

export function useSesion () {
  const [sesion, setSesion] = useState(null)
  const [perfil, setPerfil] = useState(null)
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
    if (!idUsuario) return null

    const { data, error } = await supabase
      .from('perfiles')
      .select('*')
      .eq('id', idUsuario)
      .maybeSingle()

    if (error) {
      // A la consola, no a la pantalla: quien abre la app no sabe qué
      // es una tabla ni le sirve saberlo (regla 3 de CLAUDE.md).
      console.error('No se pudo leer el perfil:', error)
      return null
    }
    return data
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
        setPerfil(nuevaSesion ? await traerPerfil(nuevaSesion.user.id) : null)
        if (vivo) setCargando(false)
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
    setPerfil(session ? await traerPerfil(session.user.id) : null)
  }, [traerPerfil])

  const salir = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  return {
    sesion,
    perfil,
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
