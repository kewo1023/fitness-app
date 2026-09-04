import { describe, it, expect } from 'vitest'
import {
  sinMarcaInicial, detectarSeparador, analizarTexto,
  leerEncabezado, revisarHoja, nombreSeparador
} from './hoja.js'

/* =====================================================================
   Las pruebas de la lectura de la hoja
   =====================================================================

   Estas pruebas NO están para demostrar que el código funciona con una
   hoja bonita. Están para los casos que llegan de verdad, y cada
   describe de aquí abajo corresponde a una forma concreta en que la
   hoja de alguien se rompe.

   La que más importa es la del final: una fila que se pierde en
   silencio es peor que un error, porque nadie la busca.
   ===================================================================== */

describe('la marca invisible del principio (BOM)', () => {
  it('la quita, porque si no el primer encabezado no coincide', () => {
    expect(sinMarcaInicial('﻿nombre,grupo')).toBe('nombre,grupo')
  })

  it('deja igual un texto que no la tiene', () => {
    expect(sinMarcaInicial('nombre,grupo')).toBe('nombre,grupo')
  })

  it('el encabezado se reconoce CON la marca puesta', () => {
    // Es el caso real: la plantilla que se le manda al entrenador la
    // lleva. Si esto falla, la app le dice que su hoja no tiene nombre.
    const { conEncabezado, resumen } = revisarHoja(
      '﻿nombre,grupo\nSentadilla libre,pierna'
    )
    expect(conEncabezado).toBe(true)
    expect(resumen.nuevos).toBe(1)
  })
})

describe('detectar el separador', () => {
  it('tabulaciones cuando se pega desde Excel o Sheets', () => {
    expect(detectarSeparador('nombre\tgrupo\tequipo')).toBe('\t')
  })

  it('punto y coma, que es lo que exporta un Excel en español', () => {
    expect(detectarSeparador('nombre;grupo;equipo')).toBe(';')
  })

  it('comas en un CSV normal', () => {
    expect(detectarSeparador('nombre,grupo,equipo')).toBe(',')
  })

  it('una sola columna cae en coma y no revienta', () => {
    expect(detectarSeparador('nombre')).toBe(',')
  })

  it('gana el tabulador aunque haya comas dentro del texto', () => {
    // Pegado desde la hoja: las indicaciones traen comas propias y
    // ninguna de ellas separa nada.
    const pegado = 'Sentadilla\tpierna\tCodos adentro, rodillas afuera'
    expect(detectarSeparador(pegado)).toBe('\t')
  })
})

describe('las comillas', () => {
  it('una coma dentro de comillas no parte la celda', () => {
    const tabla = analizarTexto('a,"uno, dos",c', ',')
    expect(tabla[0]).toEqual(['a', 'uno, dos', 'c'])
  })

  it('dos comillas seguidas son una comilla literal', () => {
    const tabla = analizarTexto('a,"dijo ""alto""",c', ',')
    expect(tabla[0]).toEqual(['a', 'dijo "alto"', 'c'])
  })

  it('un salto de línea dentro de comillas no parte la fila', () => {
    const tabla = analizarTexto('a,"uno\ndos",c', ',')
    expect(tabla.length).toBe(1)
    expect(tabla[0][1]).toBe('uno\ndos')
  })

  it('una comilla en medio del campo es texto, no abre nada', () => {
    const tabla = analizarTexto('a,mide 5" de alto,c', ',')
    expect(tabla[0]).toEqual(['a', 'mide 5" de alto', 'c'])
  })

  it('los CRLF de Windows no dejan un \\r pegado al final', () => {
    const tabla = analizarTexto('a,b\r\nc,d', ',')
    expect(tabla).toEqual([['a', 'b'], ['c', 'd']])
  })

  it('las filas totalmente vacías se descartan', () => {
    const tabla = analizarTexto('a,b\n\n\nc,d\n', ',')
    expect(tabla).toEqual([['a', 'b'], ['c', 'd']])
  })
})

describe('el encabezado', () => {
  it('reconoce los nombres de la plantilla', () => {
    const mapa = leerEncabezado(['nombre', 'grupo', 'movimiento', 'equipo'])
    expect(mapa).toEqual({ nombre: 0, grupo: 1, movimiento: 2, equipo: 3 })
  })

  it('reconoce sinónimos con tilde y en mayúscula', () => {
    const mapa = leerEncabezado(['Ejercicio', 'Músculo', 'Dificultad'])
    expect(mapa).toEqual({ nombre: 0, grupo: 1, nivel: 2 })
  })

  it('da igual el orden de las columnas', () => {
    const { filas } = revisarHoja('grupo,nombre\npierna,Sentadilla libre')
    expect(filas[0].ejercicio.nombre).toBe('Sentadilla libre')
    expect(filas[0].ejercicio.grupo).toBe('pierna')
  })

  it('ignora una columna que sobra en el medio', () => {
    const { filas } = revisarHoja(
      'nombre,series,grupo\nSentadilla libre,4x10,pierna'
    )
    expect(filas[0].ejercicio.grupo).toBe('pierna')
    expect(filas[0].estado).toBe('nuevo')
  })

  it('UNA sola columna reconocida no basta para ser encabezado', () => {
    // Si bastara, un ejercicio que se llamara "Tipo" haría que su
    // propia fila se tomara por encabezado y desapareciera.
    expect(leerEncabezado(['Tipo', 'algo', 'otra cosa'])).toBe(null)
  })

  it('sin encabezado usa el orden de la plantilla y NO pierde la fila 1', () => {
    const { conEncabezado, filas, resumen } = revisarHoja(
      'Sentadilla libre,pierna\nFlexiones de pecho,pecho'
    )
    expect(conEncabezado).toBe(false)
    expect(resumen.total).toBe(2)
    expect(filas[0].ejercicio.nombre).toBe('Sentadilla libre')
    expect(filas[0].numero).toBe(1)
  })
})

describe('el estado de cada fila', () => {
  const HOJA = [
    'nombre,grupo,equipo',
    'Sentadilla libre,pierna,ninguno',      // nuevo
    'Flexiones de pecho,pecho,ninguno',     // ya está en la biblioteca
    'sentadilla  LIBRE,pierna,ninguno',     // repetido dentro de la hoja
    'Remo raro,pierna,pesas',               // equipo que no existe
    ',pecho,ninguno'                        // sin nombre
  ].join('\n')

  const revision = revisarHoja(HOJA, ['Flexiones de pecho'])

  it('cuenta cada caso por separado', () => {
    expect(revision.resumen).toEqual({
      total: 5, nuevos: 1, existentes: 1, repetidos: 1, conError: 2
    })
  })

  it('el repetido se detecta aunque cambien mayúsculas y espacios', () => {
    expect(revision.filas[2].estado).toBe('repetido')
  })

  it('un valor que no existe se señala con la palabra que él escribió', () => {
    const fila = revision.filas[3]
    expect(fila.estado).toBe('error')
    expect(fila.errores[0]).toContain('pesas')
  })

  it('el número de fila es el renglón que él ve, contando el encabezado', () => {
    // La fila sin nombre es el sexto renglón del texto: encabezado + 5.
    expect(revision.filas[4].numero).toBe(6)
    expect(revision.filas[4].errores).toContain('Falta el nombre.')
  })

  it('una fila sin nombre igual se puede nombrar en un mensaje', () => {
    expect(revision.filas[4].etiquetaFila).toBe('Fila 6')
  })

  it('lo que ya está en la biblioteca NO es un error', () => {
    expect(revision.filas[1].estado).toBe('existe')
    expect(revision.filas[1].errores).toEqual([])
  })
})

describe('ninguna fila se pierde en silencio', () => {
  /* La regla que sostiene todo lo demás: el entrenador tiene que poder
   * contar sus filas y que el número le cuadre. Si la app se come una
   * sin decir nada, él se entera meses después, cuando un cliente le
   * pregunte por un ejercicio que no aparece. */
  it('el total revisado es igual al número de renglones con contenido', () => {
    const hoja = 'nombre,grupo\n' +
      Array.from({ length: 40 }, (_, i) => `Ejercicio ${i},pierna`).join('\n')
    expect(revisarHoja(hoja).resumen.total).toBe(40)
  })

  it('los cuatro estados suman siempre el total', () => {
    const { resumen } = revisarHoja(
      'nombre,grupo\nA,pierna\nB,nada\nA,pierna\nC,pecho',
      ['C']
    )
    const suma = resumen.nuevos + resumen.existentes +
                 resumen.repetidos + resumen.conError
    expect(suma).toBe(resumen.total)
  })

  it('una hoja vacía no revienta', () => {
    expect(revisarHoja('').resumen.total).toBe(0)
    expect(revisarHoja('   \n  \n').resumen.total).toBe(0)
  })
})

describe('el nombre del separador que se le muestra', () => {
  it('lo dice en español, no como símbolo', () => {
    expect(nombreSeparador('\t')).toBe('tabulaciones')
    expect(nombreSeparador(';')).toBe('punto y coma')
    expect(nombreSeparador(',')).toBe('comas')
  })
})
