/* =====================================================================
   rutinas.js — armar una rutina y armar una plantilla
   =====================================================================

   La lógica de los dos constructores del entrenador: mover un ejercicio
   de puesto, validar lo que se va a guardar, y llevar la cuenta de qué
   día de la plantilla tiene qué.

   NO TOCA LA BASE, igual que `ejercicios.js`, `hoja.js`, `plan.js` y
   `acceso.js`. A estas alturas es el patrón del proyecto: la lógica que
   puede hacer daño vive en un archivo sin credenciales, para que se
   pueda probar en un clon recién bajado.

   =====================================================================
   POR QUÉ EL ORDEN SE CAMBIA CON BOTONES Y NO ARRASTRANDO
   =====================================================================

   Arrastrar es lo que todo el mundo espera, y en un celular es lo peor
   que se puede elegir: el gesto de arrastrar hacia arriba es el mismo
   con el que se desplaza la página. Hacerlo bien exige distinguir
   "mantuvo apretado y movió" de "deslizó para bajar", manejar el
   desplazamiento automático al llegar al borde, y volverlo accesible
   para quien no puede arrastrar. Son horas, y el resultado sigue
   peleando con el navegador.

   Dos botones de subir y bajar funcionan al primer toque, se entienden
   sin explicación, y un lector de pantalla los lee solos.

   En Excel es la diferencia entre arrastrar una fila con el ratón y
   usar Alt+Flecha: lo segundo es más rápido para quien lo conoce y no
   se puede hacer mal.
   ===================================================================== */

import { etiqueta } from './ejercicios.js'


/* ---------------------------------------------------------------------
   Mover un ejercicio de puesto
   ---------------------------------------------------------------------
   Devuelve una lista NUEVA, no modifica la que recibe. En React, una
   lista modificada en el sitio es una lista que no vuelve a pintar: el
   componente compara la referencia, ve que es la misma, y no hace nada.
   Es el error de estado más común, y aquí se evita de raíz.

   Moverse fuera de los extremos devuelve la MISMA lista, no una copia.
   Así el componente ni siquiera se vuelve a pintar cuando alguien toca
   "subir" en el primero.
   --------------------------------------------------------------------- */
export function mover (lista, desde, direccion) {
  const hasta = desde + direccion
  if (!Array.isArray(lista)) return []
  if (desde < 0 || desde >= lista.length) return lista
  if (hasta < 0 || hasta >= lista.length) return lista

  const copia = [...lista]
  ;[copia[desde], copia[hasta]] = [copia[hasta], copia[desde]]
  return copia
}


/* ---------------------------------------------------------------------
   Validar una rutina antes de mandarla
   ---------------------------------------------------------------------
   Mismo contrato que `validarEjercicio` en ejercicios.js:
   { valido, errores, rutina }. `errores` son frases listas para
   mostrar, porque quien las lee es el entrenador, no un programador.
   --------------------------------------------------------------------- */
export function validarRutina (datos, ejercicios) {
  const errores = []
  const nombre = (datos.nombre || '').replace(/\s+/g, ' ').trim()

  if (!nombre) errores.push('La rutina necesita un nombre.')
  else if (nombre.length > 120) errores.push('El nombre es demasiado largo.')

  if (!Array.isArray(ejercicios) || ejercicios.length === 0) {
    errores.push('Agrega al menos un ejercicio.')
  }

  /* Las series y las reps se revisan POR FILA y el mensaje dice cuál.
   * "Revisa las series" obliga a mirar los doce; "el ejercicio 4 no
   * tiene reps" se arregla de una. Es la misma decisión de la carga
   * masiva, que señala el número de fila. */
  ;(ejercicios || []).forEach((e, i) => {
    const puesto = `${i + 1}. ${e.nombre || 'Sin nombre'}`
    const series = Number(e.series)
    if (!Number.isInteger(series) || series < 1 || series > 20) {
      errores.push(`${puesto}: las series tienen que ser un número de 1 a 20.`)
    }
    // `reps` es TEXTO en la base a propósito: acepta "12" y también
    // "8-10", que es como lo escribe un entrenador de verdad.
    if (!String(e.reps || '').trim()) {
      errores.push(`${puesto}: falta cuántas repeticiones.`)
    }
    const descanso = Number(e.descanso_seg)
    if (!Number.isInteger(descanso) || descanso < 0 || descanso > 600) {
      errores.push(`${puesto}: el descanso va entre 0 y 600 segundos.`)
    }
  })

  const duracion = datos.duracion_min === '' || datos.duracion_min == null
    ? null : Number(datos.duracion_min)
  if (duracion !== null && (!Number.isInteger(duracion) || duracion < 1)) {
    errores.push('La duración tiene que ser un número de minutos.')
  }

  return {
    valido: errores.length === 0,
    errores,
    rutina: {
      nombre,
      nivel: datos.nivel || null,
      duracion_min: duracion,
      notas: (datos.notas || '').trim() || null,
      publica: Boolean(datos.publica),
      ejercicios: (ejercicios || []).map(e => ({
        ejercicio_id: e.ejercicio_id,
        series: Number(e.series),
        reps: String(e.reps).trim(),
        descanso_seg: Number(e.descanso_seg),
        nota: (e.nota || '').trim() || null
      }))
    }
  }
}


/* ---------------------------------------------------------------------
   La plantilla: un calendario de semanas por días
   ---------------------------------------------------------------------
   En la pantalla es una rejilla; en la base son filas de
   `plantilla_dias`. Estas dos funciones traducen de una a otra.

   LA CLAVE ES "semana-dia" Y NO UN ÍNDICE. Con un índice, bajar la
   plantilla de 4 semanas a 3 correría todos los días una casilla y el
   entrenador vería su lunes convertido en martes. Con la clave, un día
   sabe cuál es sin depender de cuántos haya.
   --------------------------------------------------------------------- */
export const clave = (semana, dia) => `${semana}-${dia}`

/** De las filas de la base al mapa que usa la rejilla. */
export function mapaDeDias (filas) {
  const mapa = {}
  for (const f of filas || []) {
    // Se guarda la fila entera y no solo la rutina: un día de descanso
    // es una fila con rutina_id en null, y eso NO es lo mismo que un
    // día que no está en el mapa. Ver el comentario de plan.js.
    mapa[clave(f.semana, f.dia)] = f.rutina_id ?? null
  }
  return mapa
}

/** Del mapa de la rejilla al arreglo que recibe `guardar_plantilla`. */
export function diasParaGuardar (mapa, semanas) {
  const filas = []
  for (const [k, rutinaId] of Object.entries(mapa || {})) {
    const [semana, dia] = k.split('-').map(Number)
    if (semana < 1 || semana > semanas) continue   // ver el SQL: se recorta
    if (dia < 1 || dia > 7) continue
    filas.push({ semana, dia, rutina_id: rutinaId })
  }
  return filas.sort((a, b) => a.semana - b.semana || a.dia - b.dia)
}

/** Cuántos días de entrenamiento tiene la semana más cargada.
 *
 * Sirve para sugerir `dias_semana`, que es el número contra el que se
 * mide la racha del cliente. Se cuentan solo los días CON rutina: un
 * descanso programado no es un día de entrenamiento, y contarlo le
 * pondría al cliente una meta que su propio plan no le deja cumplir. */
export function diasDeEntrenoPorSemana (mapa, semanas) {
  const cuenta = []
  for (let s = 1; s <= semanas; s++) {
    let n = 0
    for (let d = 1; d <= 7; d++) {
      if (mapa[clave(s, d)]) n++
    }
    cuenta.push(n)
  }
  return cuenta
}


/** El resumen de una rutina para una lista: "Pecho · 6 ejercicios". */
export function resumenRutina (rutina, cuantos) {
  const partes = []
  if (rutina?.nivel) partes.push(etiqueta(rutina.nivel))
  partes.push(`${cuantos} ${cuantos === 1 ? 'ejercicio' : 'ejercicios'}`)
  if (rutina?.duracion_min) partes.push(`${rutina.duracion_min} min`)
  return partes.join(' · ')
}
