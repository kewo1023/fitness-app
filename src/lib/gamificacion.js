/* =====================================================================
   gamificacion.js — las cuentas del XP y los niveles.
   =====================================================================

   Están aquí y no dentro de una pantalla por dos razones:

   1. Se usan en más de un sitio (el perfil y, en la Fase 5, el
      progreso). Repetir la fórmula es garantizar que algún día las dos
      copias digan cosas distintas.
   2. Se pueden PROBAR. La regla 10 de CLAUDE.md pide pruebas sobre la
      lógica que puede hacer daño, y esta califica: si el nivel se
      calcula mal, alguien ve que bajó de nivel sin haber hecho nada
      malo. Eso no se arregla con una disculpa.

   OJO CON LO QUE **NO** ESTÁ AQUÍ: el XP no se suma en el navegador.
   Lo suma un trigger dentro de la base cuando una sesión pasa a
   completada (03-funciones.sql), y un permiso por columna impide
   escribir `perfiles.xp` desde fuera. Este archivo solo LEE el número
   para mostrarlo bonito.
   ===================================================================== */

export const XP_POR_NIVEL = 250

/** En qué nivel está alguien con ese XP. El nivel 1 empieza en 0. */
export function nivelDesdeXp (xp) {
  const n = Number(xp)
  // Un XP que no es número (null, undefined, texto raro) no debe
  // devolver NaN y pintar "Nivel NaN" en la pantalla de alguien.
  if (!Number.isFinite(n) || n < 0) return 1
  return Math.floor(n / XP_POR_NIVEL) + 1
}

/** Cuánto falta para el nivel siguiente, entre 0 y 1. Para la barra. */
export function avanceEnElNivel (xp) {
  const n = Number(xp)
  if (!Number.isFinite(n) || n < 0) return 0
  return (n % XP_POR_NIVEL) / XP_POR_NIVEL
}

/* ---------------------------------------------------------------------
   LOS LOGROS: cruzar el catálogo con lo que la persona ya tiene
   ---------------------------------------------------------------------

   Igual que el XP: aquí NO se otorga nada. Los logros los da un trigger
   (`otorgar_logros`, en 08-analitica.sql) cuando una sesión pasa a
   completada. Esto solo junta dos listas para pintarlas.

   POR QUÉ ESTÁ AQUÍ Y NO DENTRO DE `Perfil.jsx`. Porque decide si a
   alguien se le avisa o no de algo, y eso se prueba sin fingir un
   navegador. Es la misma razón por la que `hayQueRecargarPerfil` vive
   en `acceso.js` y no dentro del hook. */

/** Junta el catálogo con lo conseguido. Devuelve el catálogo COMPLETO,
 *  en su orden, con dos banderas por logro: si lo tiene, y si es la
 *  primera vez que lo va a ver. */
export function cruzarLogros (catalogo, obtenidos) {
  // Un Map y no un Set, que es lo que había antes: de cada logro
  // conseguido hacen falta DOS datos, que lo tiene y si ya lo vio.
  const mios = new Map()
  for (const l of obtenidos || []) mios.set(l.logro, l)

  return (catalogo || []).map(l => {
    const mio = mios.get(l.clave)
    return {
      ...l,
      obtenido: Boolean(mio),
      // `visto === false` EXACTO, y no `!mio.visto`. Si algún día una
      // consulta se deja la columna por fuera, `visto` llega
      // `undefined` y `!undefined` es `true`: saldrían TODOS como
      // nuevos, y además para siempre, porque la marca solo se escribe
      // sobre las filas que la base ve sin ver. Preguntando por el
      // `false` exacto, el error se cae del lado de no avisar de más,
      // que es el lado barato.
      nuevo: Boolean(mio) && mio.visto === false
    }
  })
}

/** ¿Hay algo que la persona todavía no ha visto? Sirve para no mandar
 *  una escritura a la base cada vez que alguien abre su perfil. */
export function hayLogrosNuevos (lista) {
  return (lista || []).some(l => l.nuevo)
}
