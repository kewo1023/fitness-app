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

      Faltan: RUTINA_DE_HOY (Fase 4), HISTORIAL y LOGROS (Fase 5),
      USUARIO y META_SEMANAL (Fase 4, salen del plan).
   ===================================================================== */

export const USUARIO = {
  nombre: 'Camilo',
  rol: 'cliente',
  xp: 340,
  nivel: 4,
  racha: 3                 // entrenamientos hechos esta semana
}

export const META_SEMANAL = 4

export const RUTINA_DE_HOY = {
  nombre: 'Tren superior — empuje',
  duracionMin: 45,
  semana: 2,
  dia: 3,
  programa: 'Fuerza en casa',
  ejercicios: [
    { id: 1, nombre: 'Flexiones', series: 4, reps: '10-12', descanso: 60,
      grupo: 'Pecho', equipo: 'Ninguno' },
    { id: 2, nombre: 'Press militar con mancuernas', series: 4, reps: '8-10',
      descanso: 90, grupo: 'Hombro', equipo: 'Mancuernas' },
    { id: 3, nombre: 'Fondos en silla', series: 3, reps: '12', descanso: 60,
      grupo: 'Tríceps', equipo: 'Ninguno' },
    { id: 4, nombre: 'Elevaciones laterales', series: 3, reps: '15',
      descanso: 45, grupo: 'Hombro', equipo: 'Mancuernas' },
    { id: 5, nombre: 'Plancha', series: 3, reps: '40 seg', descanso: 45,
      grupo: 'Core', equipo: 'Ninguno' }
  ]
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

