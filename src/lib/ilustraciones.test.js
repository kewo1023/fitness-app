import { describe, it, expect } from 'vitest'
import { readdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  ILUSTRACIONES_EJERCICIOS,
  ILUSTRACIONES_RECETAS,
  ilustracionDeEjercicio,
  ilustracionDeMomento,
  CREDITO_ILUSTRACIONES
} from './ilustraciones.js'

/* =====================================================================
   Pruebas de las ilustraciones
   =====================================================================

   Qué se está protegiendo aquí, que no es obvio:

   1. QUE EL ARCHIVO EXISTA DE VERDAD. Una tabla de equivalencias que
      apunta a un archivo borrado no falla al compilar ni al abrir la
      app: el dibujo simplemente no aparece y la tarjeta se ve como si
      el ejercicio no tuviera lámina. Es el peor tipo de error, el que
      no se nota. Por eso estas pruebas van contra el disco.

   2. QUE LA ATRIBUCIÓN NO SE PIERDA. La licencia CC BY-SA 4.0 exige
      nombrar al autor, enlazar la licencia y declarar los cambios. Si
      alguien "simplifica" ese objeto, el uso de las ilustraciones pasa
      a ser una infracción, y este repositorio es público. Es la misma
      idea que las pruebas del aviso de derechos y las del formulario de
      consentimiento: proteger de una simplificación bienintencionada lo
      que la ley obliga a mantener.
   ===================================================================== */

const dir = (sub) => resolve(process.cwd(), 'public/ilustraciones', sub)

describe('las láminas de los ejercicios', () => {
  it('todas apuntan a un archivo que existe', () => {
    for (const [nombre, archivo] of Object.entries(ILUSTRACIONES_EJERCICIOS)) {
      const ruta = resolve(dir('ejercicios'), `${archivo}.svg`)
      expect(existsSync(ruta), `falta ${archivo}.svg, que usa "${nombre}"`).toBe(true)
    }
  })

  it('no hay dos ejercicios compartiendo el mismo dibujo', () => {
    // Dos nombres apuntando al mismo archivo casi siempre es un
    // copiar-pegar mal terminado, no una decisión.
    const usados = Object.values(ILUSTRACIONES_EJERCICIOS)
    expect(new Set(usados).size).toBe(usados.length)
  })

  it('no sobra ningún archivo sin usar', () => {
    // Al revés que la anterior: un SVG que nadie referencia es peso
    // muerto que igual se publica y se descarga.
    const enDisco = readdirSync(dir('ejercicios')).filter(f => f.endsWith('.svg'))
    const usados = new Set(Object.values(ILUSTRACIONES_EJERCICIOS))
    const sobran = enDisco.filter(f => !usados.has(f.replace('.svg', '')))
    expect(sobran).toEqual([])
  })

  it('las llaves ya están normalizadas', () => {
    // Si una llave llevara tilde o mayúscula, ilustracionDeEjercicio()
    // no la encontraría nunca: busca con claveNombre(), que las quita.
    // Sería un dibujo que existe y no se muestra jamás.
    for (const llave of Object.keys(ILUSTRACIONES_EJERCICIOS)) {
      expect(llave).toBe(llave.toLowerCase())
      expect(llave.normalize('NFD')).toBe(llave)
    }
  })
})

describe('ilustracionDeEjercicio', () => {
  it('encuentra el dibujo escriba como escriba el nombre', () => {
    const esperada = '/ilustraciones/ejercicios/goblet-squat.svg'
    expect(ilustracionDeEjercicio('Sentadilla goblet')).toBe(esperada)
    expect(ilustracionDeEjercicio('SENTADILLA GOBLET')).toBe(esperada)
    expect(ilustracionDeEjercicio('  sentadilla   goblet  ')).toBe(esperada)
  })

  it('aguanta las tildes, que la base no guarda', () => {
    expect(ilustracionDeEjercicio('Jalón al pecho en polea'))
      .toBe('/ilustraciones/ejercicios/lat-pulldown.svg')
    expect(ilustracionDeEjercicio('Zancada búlgara'))
      .toBe('/ilustraciones/ejercicios/bulgarian-split-squat.svg')
  })

  it('devuelve null cuando no hay dibujo, sin reventar', () => {
    // Es el caso NORMAL, no el excepcional: todo ejercicio que cree el
    // entrenador va a caer aquí hasta que se le asigne una lámina.
    expect(ilustracionDeEjercicio('Ejercicio que el entrenador inventó')).toBe(null)
    expect(ilustracionDeEjercicio('')).toBe(null)
    expect(ilustracionDeEjercicio(null)).toBe(null)
    expect(ilustracionDeEjercicio(undefined)).toBe(null)
  })
})

describe('las marcas de las recetas', () => {
  it('cubren los cuatro momentos y existen en disco', () => {
    for (const archivo of Object.values(ILUSTRACIONES_RECETAS)) {
      expect(existsSync(resolve(dir('recetas'), `${archivo}.svg`))).toBe(true)
    }
  })

  it('resuelven el momento tal como lo guarda la base', () => {
    expect(ilustracionDeMomento('desayuno')).toBe('/ilustraciones/recetas/desayuno.svg')
    expect(ilustracionDeMomento('Almuerzo')).toBe('/ilustraciones/recetas/almuerzo.svg')
    expect(ilustracionDeMomento(null)).toBe(null)
    expect(ilustracionDeMomento('merienda')).toBe(null)
  })
})

describe('el crédito de la licencia', () => {
  /* Estas tres son las que exige CC BY-SA 4.0. Si alguien borra una,
     el uso de las ilustraciones deja de estar permitido. */
  it('nombra al autor', () => {
    expect(CREDITO_ILUSTRACIONES.autor).toBe('Everkinetic')
  })

  it('enlaza la licencia', () => {
    expect(CREDITO_ILUSTRACIONES.licencia).toMatch(/CC BY-SA 4\.0/)
    expect(CREDITO_ILUSTRACIONES.enlace).toMatch(/^https:\/\/creativecommons\.org\//)
  })

  it('declara que se modificaron', () => {
    expect(CREDITO_ILUSTRACIONES.cambios.length).toBeGreaterThan(20)
  })
})
