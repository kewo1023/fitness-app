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
