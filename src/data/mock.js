/* =====================================================================
   mock.js — datos FALSOS para poder ver la app antes de que exista la
   base de datos.
   =====================================================================

   Dos reglas sobre este archivo:

   1. Todos los nombres son inventados. El repo es público (regla 3 de
      PARAR en CLAUDE.md): aquí no entra ni un dato real de un cliente,
      nunca, ni siquiera "para probar un momento".

   2. Este archivo SE VA ENCOGIENDO hasta desaparecer. La idea original
      era borrarlo entero en la Fase 2, pero conectar las cinco
      secciones a datos reales es trabajo de las fases 4 y 5 (el plan
      del cliente, sus sesiones, su progreso).

      Así que la regla se cumple de otra forma: **cada vez que una
      pantalla se conecta a la base, su parte se borra de aquí el mismo
      día.** Lo que queda en este archivo es exactamente lo que todavía
      no existe de verdad, ni un dato más.

      Ya se fueron:
        - RECETAS   (Fase 2, ahora sale de la tabla `recetas`)
        - PROGRAMAS (Fase 3). Este no se conectó: se BORRÓ. Describía un
          catálogo de programas a los que el cliente se inscribía, y ese
          modelo está descartado desde el 1/09 — aquí cada cliente tiene
          su propia rutina. Era mock de algo que la base no puede
          representar, que es la peor clase de mock: enseña una app que
          no va a existir. La pestaña ahora muestra el catálogo real de
          ejercicios.

      4/09 — se fueron RUTINA_DE_HOY y META_SEMANAL: `Hoy` ya lee el
          plan real del cliente. De USUARIO solo queda el nivel, que
          usa `Progreso`.

      Faltan: HISTORIAL y LOGROS (Fase 5), y el nivel de USUARIO.
   ===================================================================== */




/* Lo único que queda de USUARIO. `Progreso` lo usa para el nivel, y esa
 * pantalla sigue en mock hasta la Fase 5.
 *
 * `racha` y el resto SE FUERON el 4/09: los usaba `Hoy`, que ya lee el
 * plan real. La regla es que cada pantalla borra SU parte el mismo día
 * que se conecta, no la del vecino — borrar el nivel de aquí habría
 * roto `Progreso` sin conectarlo, que es cambiar un mock por un hueco. */
export const USUARIO = {
  nombre: 'Camilo',
  rol: 'cliente',
  xp: 340,
  nivel: 4
}

export const HISTORIAL = [
  { fecha: '2026-09-01', rutina: 'Tren inferior', duracion: 52, completada: true },
  { fecha: '2026-08-31', rutina: 'Cardio y core',  duracion: 30, completada: true },
  { fecha: '2026-08-29', rutina: 'Tren superior — jalón', duracion: 47, completada: true },
  { fecha: '2026-08-28', rutina: 'Tren inferior', duracion: 55, completada: true },
  { fecha: '2026-08-26', rutina: 'Full body',     duracion: 41, completada: true },
  { fecha: '2026-08-25', rutina: 'Cardio y core', duracion: 28, completada: false }
]

export const LOGROS = [
  { clave: 'primera',   nombre: 'La primera',        desc: 'Completaste tu primer entrenamiento.', obtenido: true },
  { clave: 'semana1',   nombre: 'Semana cerrada',    desc: 'Cumpliste la meta de una semana.',     obtenido: true },
  { clave: 'diez',      nombre: 'Diez sesiones',     desc: 'Diez entrenamientos completados.',     obtenido: true },
  { clave: 'madrugada', nombre: 'Madrugador',        desc: 'Entrenaste antes de las 6 a.m.',       obtenido: false },
  { clave: 'mes',       nombre: 'Mes completo',      desc: 'Cuatro semanas seguidas cumpliendo.',  obtenido: false },
  { clave: 'programa',  nombre: 'Programa terminado',desc: 'Terminaste un programa completo.',     obtenido: false }
]

