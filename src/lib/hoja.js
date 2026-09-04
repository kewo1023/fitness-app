/* =====================================================================
   hoja.js — leer la hoja de cálculo del entrenador
   =====================================================================

   Convierte el texto que él PEGA en una lista de ejercicios revisados,
   fila por fila, ANTES de que nada toque la base de datos.

   Por qué existe separado de `ejercicios.js`: aquel archivo sabe qué es
   un ejercicio válido, este sabe leer una hoja. Son dos trabajos y el
   segundo es el que está lleno de casos raros. Juntarlos haría que las
   21 pruebas de la validación y las de aquí se estorbaran.

   NO TOCA LA BASE DE DATOS, igual que `ejercicios.js` y por la misma
   razón: así se puede probar en un clon recién bajado, sin
   credenciales. Lo que habla con Supabase vive en la pantalla.

   =====================================================================
   LOS TRES CASOS RAROS QUE ESTE ARCHIVO EXISTE PARA RESOLVER
   =====================================================================

   Ninguno es hipotético. Los tres pasan la primera vez que alguien
   pega una hoja de verdad, y los tres se ven igual desde afuera: "la
   app dice que mi hoja está mal".

   1. EL SEPARADOR NO SIEMPRE ES UNA COMA. Cuando se copian celdas de
      Excel o de Google Sheets y se pegan, el portapapeles NO entrega
      comas: entrega TABULADORES. Y si en vez de copiar celdas él
      exporta un CSV desde un Excel configurado en español, el
      separador es PUNTO Y COMA, porque en español la coma es el
      separador decimal. Un lector que solo entienda comas ve toda la
      fila como una sola celda y le dice que le falta el grupo
      muscular. Por eso el separador se DETECTA, no se asume.

   2. LOS ENCABEZADOS NO VAN A LLAMARSE COMO AQUÍ. Él va a escribir
      "Ejercicio" en vez de "nombre", o "Músculo" en vez de "grupo".
      Se traducen con una lista de sinónimos, y si no se reconoce
      ninguno se asume que no hay encabezado y que las columnas van en
      el orden de la plantilla.

   3. LAS COMILLAS. Una indicación como
        Codos a 45 grados, no abiertos
      lleva una coma dentro. Al exportar, la hoja la envuelve en
      comillas para que esa coma no parta la celda. Hay que
      entenderlas, incluso cuando el texto tiene un salto de línea
      dentro.
   ===================================================================== */

import {
  normalizar, limpiarNombre, claveNombre, validarEjercicio
} from './ejercicios.js'


/* Los nombres que puede llevar cada columna en la hoja de él. Se
 * comparan ya normalizados (sin tildes, en minúscula), así que aquí van
 * escritos de esa forma: 'musculo', no 'músculo'.
 *
 * Es la hoja de "Listas" del BUSCARV, otra vez: agregar un sinónimo es
 * agregar un renglón aquí y ya funciona en toda la app. */
const SINONIMOS = {
  nombre: ['nombre', 'ejercicio', 'nombre del ejercicio', 'movimiento a'],
  grupo: ['grupo', 'grupo muscular', 'musculo', 'musculos', 'zona', 'parte'],
  movimiento: ['movimiento', 'patron', 'patron de movimiento', 'tipo'],
  equipo: ['equipo', 'material', 'implemento', 'elemento', 'maquina'],
  nivel: ['nivel', 'dificultad'],
  indicaciones: [
    'indicaciones', 'indicacion', 'tecnica', 'notas', 'nota',
    'correcciones', 'observaciones', 'como se hace', 'claves'
  ]
}

/* El orden de la plantilla. Se usa cuando la hoja llega SIN encabezado
 * reconocible: entonces la primera columna es el nombre, la segunda el
 * grupo, y así. */
const ORDEN = ['nombre', 'grupo', 'movimiento', 'equipo', 'nivel', 'indicaciones']

/* Los candidatos a separador, EN ESTE ORDEN. El orden decide los
 * empates y no es casual: el tabulador es el que llega al pegar desde
 * la hoja, que es el camino que más se va a usar. Un texto pegado de
 * Excel puede tener comas dentro de las indicaciones y ninguna coma
 * separadora; si la coma ganara el empate, la hoja se leería mal. */
const SEPARADORES = ['\t', ';', ',']


/* ---------------------------------------------------------------------
   Quitar la marca invisible del principio
   ---------------------------------------------------------------------
   Un CSV guardado en UTF-8 desde Excel empieza con tres bytes
   invisibles (el "BOM") que le dicen a Excel en qué codificación está.
   No se ven, pero SÍ cuentan como carácter: sin quitarlos, el primer
   encabezado no es "nombre" sino "﻿nombre" y no coincide con
   ningún sinónimo. La plantilla que se le manda al entrenador lleva ese
   BOM a propósito —sin él Excel en Windows rompe las tildes— así que
   este caso es el NORMAL, no la excepción.
   --------------------------------------------------------------------- */
export function sinMarcaInicial (texto) {
  if (typeof texto !== 'string') return ''
  return texto.charCodeAt(0) === 0xFEFF ? texto.slice(1) : texto
}


/* ---------------------------------------------------------------------
   Cuál es el separador
   ---------------------------------------------------------------------
   Se cuenta cada candidato en la PRIMERA línea con contenido y gana el
   más frecuente. La primera línea es la más confiable porque es el
   encabezado: nombres cortos de una palabra, sin comas ni puntos y
   comas dentro.
   --------------------------------------------------------------------- */
export function detectarSeparador (texto) {
  const primera = sinMarcaInicial(texto)
    .split('\n')
    .map(l => l.trim())
    .find(l => l !== '')

  if (!primera) return ','

  let mejor = ','
  let masAltas = 0
  for (const s of SEPARADORES) {
    const cuantas = primera.split(s).length - 1
    if (cuantas > masAltas) { masAltas = cuantas; mejor = s }
  }
  return masAltas === 0 ? ',' : mejor
}


/* ---------------------------------------------------------------------
   El texto a una tabla de celdas
   ---------------------------------------------------------------------
   Un recorrido carácter por carácter. Se hace a mano y no con
   `split(separador)` porque `split` no sabe de comillas: partiría
   "Codos a 45 grados, no abiertos" en dos celdas.

   La bandera `entreComillas` es todo el truco: mientras está
   encendida, un separador y hasta un salto de línea son texto normal.
   Dos comillas seguidas dentro de un campo entrecomillado son UNA
   comilla literal — así es como las escriben Excel y Google Sheets.
   --------------------------------------------------------------------- */
export function analizarTexto (texto, separador) {
  const fuente = sinMarcaInicial(texto)
  const filas = []
  let fila = []
  let campo = ''
  let entreComillas = false
  let i = 0

  const cerrarCampo = () => { fila.push(campo); campo = '' }
  const cerrarFila = () => { cerrarCampo(); filas.push(fila); fila = [] }

  while (i < fuente.length) {
    const c = fuente[i]

    if (entreComillas) {
      if (c === '"') {
        if (fuente[i + 1] === '"') { campo += '"'; i += 2; continue }
        entreComillas = false; i++; continue
      }
      campo += c; i++; continue
    }

    // Una comilla solo ABRE si está al principio del campo. Así un
    // apóstrofo o una comilla suelta en medio de una indicación no
    // desordena el resto de la hoja.
    if (c === '"' && campo === '') { entreComillas = true; i++; continue }
    if (c === separador) { cerrarCampo(); i++; continue }
    if (c === '\r') { i++; continue }          // los CRLF de Windows
    if (c === '\n') { cerrarFila(); i++; continue }

    campo += c; i++
  }
  cerrarFila()

  // Las filas totalmente vacías se van: son el renglón en blanco del
  // final que deja cualquier hoja, y contarlas como error asustaría
  // sin motivo.
  return filas.filter(f => f.some(v => v.trim() !== ''))
}


/* ---------------------------------------------------------------------
   ¿La primera fila son encabezados, o ya es un ejercicio?
   ---------------------------------------------------------------------
   Devuelve el mapa de qué columna es cada cosa, o null si la primera
   fila no parece un encabezado.

   El umbral es DOS columnas reconocidas y no una. Con una sola bastaría
   que un ejercicio se llamara "Nivel" o "Tipo" para que su fila se
   tomara por encabezado y ese ejercicio desapareciera sin decir nada.
   Perder una fila en silencio es el peor error posible aquí.
   --------------------------------------------------------------------- */
export function leerEncabezado (celdas) {
  const mapa = {}
  let reconocidas = 0

  celdas.forEach((celda, indice) => {
    const limpia = normalizar(celda)
    for (const [campo, nombres] of Object.entries(SINONIMOS)) {
      if (mapa[campo] === undefined && nombres.includes(limpia)) {
        mapa[campo] = indice
        reconocidas++
        return
      }
    }
  })

  return reconocidas >= 2 ? mapa : null
}


/* ---------------------------------------------------------------------
   La revisión completa, que es lo que usa la pantalla
   ---------------------------------------------------------------------
   `existentes` son los nombres que YA están en la biblioteca. Se pasan
   como argumento en vez de consultarlos aquí para que este archivo siga
   sin tocar la base.

   Cada fila sale con un `estado`, y son cuatro:

     error     — no se puede guardar. Le falta el nombre o el grupo, o
                 tiene un valor que no existe.
     repetido  — el nombre ya salió antes EN ESTA MISMA HOJA. Se guarda
                 la primera y esta se descarta: la base tiene un índice
                 único por nombre y rechazaría el lote entero.
     existe    — ya está en la biblioteca. No es un error: es lo normal
                 al volver a cargar la hoja después de llenar una
                 columna, y de hecho es el caso que hace útil el botón
                 de actualizar.
     nuevo     — se va a agregar.

   El `numero` es el renglón TAL COMO LO VE ÉL en su hoja, contando el
   encabezado. Decir "la fila 47" y que en su pantalla la 47 sea otra
   cosa haría el mensaje inútil.
   --------------------------------------------------------------------- */
export function revisarHoja (texto, existentes = []) {
  const separador = detectarSeparador(texto)
  const tabla = analizarTexto(texto, separador)

  if (tabla.length === 0) {
    return {
      separador, conEncabezado: false, filas: [],
      resumen: { total: 0, nuevos: 0, existentes: 0, repetidos: 0, conError: 0 }
    }
  }

  const mapa = leerEncabezado(tabla[0])
  const conEncabezado = mapa !== null

  // Sin encabezado se usa el orden de la plantilla. Con encabezado, el
  // que se acaba de leer: así da igual en qué orden tenga él sus
  // columnas y si le sobra alguna en el medio.
  const columnas = conEncabezado
    ? mapa
    : Object.fromEntries(ORDEN.map((c, i) => [c, i]))

  const cuerpo = conEncabezado ? tabla.slice(1) : tabla
  const desplazamiento = conEncabezado ? 2 : 1   // a qué renglón de la hoja

  const vistos = new Set()
  const yaEnBiblioteca = new Set(existentes.map(claveNombre))

  const filas = cuerpo.map((celdas, i) => {
    const tomar = (campo) => {
      const indice = columnas[campo]
      return indice === undefined ? '' : (celdas[indice] || '')
    }

    const cruda = {
      nombre: tomar('nombre'),
      grupo: tomar('grupo'),
      movimiento: tomar('movimiento'),
      equipo: tomar('equipo'),
      nivel: tomar('nivel'),
      indicaciones: tomar('indicaciones')
    }

    // La MISMA función que valida el formulario del panel. Es lo que
    // impide que la hoja acepte algo que el formulario rechaza, o al
    // revés — que es como se termina con dos vocabularios distintos en
    // la misma biblioteca.
    const { valido, errores, ejercicio } = validarEjercicio(cruda)

    const numero = i + desplazamiento
    const clave = claveNombre(cruda.nombre)

    let estado
    if (!valido) estado = 'error'
    else if (vistos.has(clave)) estado = 'repetido'
    else if (yaEnBiblioteca.has(clave)) estado = 'existe'
    else estado = 'nuevo'

    if (valido) vistos.add(clave)

    return {
      numero,
      estado,
      errores,
      ejercicio,
      // Para poder nombrar la fila en un mensaje aunque no sea válida:
      // si le falta el nombre, `ejercicio.nombre` está vacío.
      etiquetaFila: limpiarNombre(cruda.nombre) || `Fila ${numero}`
    }
  })

  return {
    separador,
    conEncabezado,
    filas,
    resumen: {
      total: filas.length,
      nuevos: filas.filter(f => f.estado === 'nuevo').length,
      existentes: filas.filter(f => f.estado === 'existe').length,
      repetidos: filas.filter(f => f.estado === 'repetido').length,
      conError: filas.filter(f => f.estado === 'error').length
    }
  }
}


/* Cómo se llama el separador en pantalla. Se le muestra al entrenador
 * porque es el dato que explica el 90% de las hojas que salen mal, y
 * verlo escrito le deja corregirlo solo sin escribirle a nadie. */
export function nombreSeparador (separador) {
  if (separador === '\t') return 'tabulaciones'
  if (separador === ';') return 'punto y coma'
  return 'comas'
}
