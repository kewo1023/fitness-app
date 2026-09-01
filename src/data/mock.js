/* =====================================================================
   mock.js — datos FALSOS para poder ver la app antes de que exista la
   base de datos.
   =====================================================================

   Dos reglas sobre este archivo:

   1. Todos los nombres son inventados. El repo es público (regla 3 de
      PARAR en CLAUDE.md): aquí no entra ni un dato real de un cliente,
      nunca, ni siquiera "para probar un momento".

   2. Este archivo se BORRA en la Fase 2, cuando entre Supabase. En
      nosotros-app quedó dando vueltas más de la cuenta y confundía:
      uno no sabía si lo que veía en pantalla era real o de mentiras.
   ===================================================================== */

export const USUARIO = {
  nombre: 'Camilo',
  rol: 'cliente',          // cambia a 'admin' para ver el panel del entrenador
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

export const PROGRAMAS = [
  { id: 1, nombre: 'Fuerza en casa', semanas: 8, nivel: 'Intermedio',
    dias: 4, descripcion: 'Sin gimnasio. Mancuernas y peso corporal.',
    inscrito: true, semanaActual: 2 },
  { id: 2, nombre: 'Primeros pasos', semanas: 4, nivel: 'Principiante',
    dias: 3, descripcion: 'Para arrancar desde cero, sin equipo.',
    inscrito: false },
  { id: 3, nombre: 'Full body express', semanas: 6, nivel: 'Intermedio',
    dias: 3, descripcion: 'Sesiones de 30 minutos.', inscrito: false },
  { id: 4, nombre: 'Pierna y glúteo', semanas: 8, nivel: 'Avanzado',
    dias: 4, descripcion: 'Requiere barra y discos.', inscrito: false }
]

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

export const RECETAS = [
  { id: 1, nombre: 'Arepa de huevo al horno', momento: 'Desayuno', minutos: 20 },
  { id: 2, nombre: 'Bowl de pollo y aguacate', momento: 'Almuerzo', minutos: 25 },
  { id: 3, nombre: 'Crema de ahuyama',        momento: 'Comida',   minutos: 30 },
  { id: 4, nombre: 'Batido de banano y avena', momento: 'Snack',   minutos: 5 },
  { id: 5, nombre: 'Salmón con verduras',      momento: 'Comida',  minutos: 25 },
  { id: 6, nombre: 'Huevos pericos con arepa', momento: 'Desayuno', minutos: 12 }
]
