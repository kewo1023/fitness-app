import { describe, it, expect } from 'vitest'
import {
  nuevaClaveLocal, esClaveLocal, esFalloDeRed, entradaEmpezar, entradaSerie,
  entradaTerminar, ordenarCola, resolverSesion, resumenCola, estadoDeSesion,
  EMPEZAR, SERIE, TERMINAR
} from './cola.js'

/* Regla 10. Aquí el daño es perder el entrenamiento de alguien, o —peor
 * porque no se nota— hacerle creer que está guardado cuando no lo va a
 * estar nunca. */

describe('esFalloDeRed', () => {
  it('reconoce cómo lo dice cada navegador', () => {
    // Chrome, Firefox y Safari lo dicen con tres frases distintas. Si
    // alguna se queda fuera, ese navegador pierde el entrenamiento.
    expect(esFalloDeRed({ message: 'TypeError: Failed to fetch' })).toBe(true)
    expect(esFalloDeRed({ message: 'NetworkError when attempting to fetch' })).toBe(true)
    expect(esFalloDeRed({ message: 'Load failed' })).toBe(true)
  })

  it('NO encola un error que no es de red', () => {
    /* EL CASO CARO Y SILENCIOSO. Un error de permisos guardado en la
     * cola se reintenta para siempre sin que nadie se entere, y la
     * persona cree que su entrenamiento está a salvo. Un error que no
     * es de red tiene que verse. */
    expect(esFalloDeRed({ code: '42501', message: 'new row violates row-level security policy' })).toBe(false)
    expect(esFalloDeRed({ code: '23505', message: 'duplicate key value' })).toBe(false)
    expect(esFalloDeRed({ message: 'JWT expired' })).toBe(false)
  })

  it('no revienta sin error', () => {
    expect(esFalloDeRed(null)).toBe(false)
    expect(esFalloDeRed({})).toBe(false)
  })
})

describe('nuevaClaveLocal', () => {
  it('lleva un prefijo que la hace imposible de confundir con un id', () => {
    /* `sesiones.id` es bigint. Sin el prefijo, alguien acabaría mandando
     * el texto de la clave a una columna numérica y el error saldría en
     * la base, no aquí. */
    const c = nuevaClaveLocal()
    expect(esClaveLocal(c)).toBe(true)
    expect(esClaveLocal(84)).toBe(false)
    expect(esClaveLocal('84')).toBe(false)
  })

  it('no repite', () => {
    const a = nuevaClaveLocal()
    const b = nuevaClaveLocal()
    expect(a).not.toBe(b)
  })
})

describe('las entradas y su orden', () => {
  it('mantiene el entrenamiento en su sitio: empezar, series, terminar', () => {
    /* Si el orden se torciera, las series llegarían antes que la sesión
     * que las contiene y la base las rechazaría por la llave foránea.
     * IndexedDB no promete devolver nada en el orden en que se
     * escribió, así que el orden va escrito en la propia entrada. */
    const clave = nuevaClaveLocal()
    const e1 = entradaEmpezar(clave, {})
    const e2 = entradaSerie(clave, { ejercicio_id: 3, serie: 1 })
    const e3 = entradaTerminar(clave, {})

    const revueltas = [e3, e1, e2]
    expect(ordenarCola(revueltas).map(e => e.tipo)).toEqual([EMPEZAR, SERIE, TERMINAR])
  })

  it('corregir una serie PISA la anterior en vez de encolar dos', () => {
    /* Es el mismo `unique (sesion_id, ejercicio_id, serie)` de la tabla,
     * aplicado en el celular. Con dos entradas para la misma serie, al
     * subir se escribiría dos veces y ganaría la que llegara última —
     * que puede ser la vieja. */
    const clave = nuevaClaveLocal()
    const a = entradaSerie(clave, { ejercicio_id: 3, serie: 2, peso_kg: 40 })
    const b = entradaSerie(clave, { ejercicio_id: 3, serie: 2, peso_kg: 45 })
    expect(a.clave).toBe(b.clave)
  })

  it('una serie de otro ejercicio o de otro número es otra entrada', () => {
    const clave = nuevaClaveLocal()
    const a = entradaSerie(clave, { ejercicio_id: 3, serie: 2 })
    const b = entradaSerie(clave, { ejercicio_id: 4, serie: 2 })
    const c = entradaSerie(clave, { ejercicio_id: 3, serie: 3 })
    expect(new Set([a.clave, b.clave, c.clave]).size).toBe(3)
  })

  it('terminar dos veces es terminar una vez', () => {
    const clave = nuevaClaveLocal()
    expect(entradaTerminar(clave, {}).clave).toBe(entradaTerminar(clave, {}).clave)
  })

  it('distingue una sesión que ya existe en la base de una local', () => {
    // Pasa de verdad: empezaste con señal y la perdiste a mitad del
    // entrenamiento. La sesión ya tiene número; las series, no.
    const conNumero = entradaSerie(84, { ejercicio_id: 3, serie: 1 })
    expect(conNumero.sesionId).toBe(84)
    expect(conNumero.sesionLocal).toBeNull()

    const local = entradaSerie('local:abc', { ejercicio_id: 3, serie: 1 })
    expect(local.sesionId).toBeNull()
    expect(local.sesionLocal).toBe('local:abc')
  })
})

describe('resolverSesion', () => {
  it('usa el número de la base cuando ya lo hay', () => {
    expect(resolverSesion({ sesionId: 84, sesionLocal: null }, {})).toBe(84)
  })

  it('traduce la clave local por el número que le tocó al subir', () => {
    // Es el truco entero de este archivo: la sesión se inserta primero,
    // se apunta qué número le dio Postgres, y las series se mandan ya
    // con ese número.
    expect(resolverSesion({ sesionId: null, sesionLocal: 'local:abc' },
                          { 'local:abc': 91 })).toBe(91)
  })

  it('devuelve null cuando no se puede saber, en vez de adivinar', () => {
    /* Mandar una serie con sesion_id nulo la rechaza la llave foránea, y
     * reintentarlo no lo va a arreglar nunca. Quien llama tiene que
     * parar, no seguir. */
    expect(resolverSesion({ sesionId: null, sesionLocal: 'local:abc' }, {})).toBeNull()
    expect(resolverSesion({ sesionId: null, sesionLocal: null }, {})).toBeNull()
    expect(resolverSesion(null, {})).toBeNull()
  })

  it('un id 0 no se confunde con "no hay id"', () => {
    // El clásico: `if (entrada.sesionId)` daría falso con 0.
    expect(resolverSesion({ sesionId: 0, sesionLocal: null }, {})).toBe(0)
  })
})

describe('resumenCola', () => {
  it('cuenta entrenamientos y series por separado', () => {
    // "3 cosas por subir" no dice si lo que está en riesgo es un dato
    // suelto o el entrenamiento entero.
    const c = nuevaClaveLocal()
    const cola = [
      entradaEmpezar(c, {}),
      entradaSerie(c, { ejercicio_id: 1, serie: 1 }),
      entradaSerie(c, { ejercicio_id: 1, serie: 2 })
    ]
    expect(resumenCola(cola)).toBe('Te falta subir 1 entrenamiento y 2 series.')
  })

  it('no dice nada cuando no hay nada', () => {
    expect(resumenCola([])).toBeNull()
    expect(resumenCola(null)).toBeNull()
  })

  it('sabe decirlo cuando solo falta el final', () => {
    // Empezaste con señal y la perdiste justo al terminar.
    expect(resumenCola([entradaTerminar(84, {})]))
      .toBe('Te falta subir el final de tu entrenamiento.')
  })
})

describe('estadoDeSesion', () => {
  const DIA = 5

  it('encuentra el entrenamiento que empezaste sin señal', () => {
    /* EL ESCENARIO NORMAL, no uno raro: entrenas sin señal y cierras la
     * app entre un ejercicio y otro. Sin esto, al volver la pantalla
     * dice que no has empezado. */
    const c = nuevaClaveLocal()
    const cola = [entradaEmpezar(c, { plan_dia_id: DIA, iniciada_en: 'x' })]
    expect(estadoDeSesion(cola, DIA, null)).toMatchObject({ id: c, completada: false })
  })

  it('y sabe que ya lo terminaste', () => {
    const c = nuevaClaveLocal()
    const cola = [
      entradaEmpezar(c, { plan_dia_id: DIA, iniciada_en: 'x' }),
      entradaTerminar(c, { terminada_en: 'y' })
    ]
    expect(estadoDeSesion(cola, DIA, null).completada).toBe(true)
  })

  it('cierra también una sesión que había empezado CON señal', () => {
    // Empezaste con cobertura y la perdiste antes de terminar. Lo
    // guardado dice "en curso"; la cola dice que ya la cerraste.
    const guardada = { id: 84, completada: false }
    const cola = [entradaTerminar(84, { terminada_en: 'y' })]
    expect(estadoDeSesion(cola, DIA, guardada).completada).toBe(true)
  })

  it('no inventa una sesión de OTRO día del plan', () => {
    /* Si la confundiera, la pantalla ofrecería "seguir entrenamiento"
     * de un día que no es el de hoy. */
    const c = nuevaClaveLocal()
    const cola = [entradaEmpezar(c, { plan_dia_id: 99, iniciada_en: 'x' })]
    expect(estadoDeSesion(cola, DIA, null)).toBeNull()
  })

  it('devuelve lo guardado tal cual si la cola está vacía', () => {
    const guardada = { id: 84, completada: false }
    expect(estadoDeSesion([], DIA, guardada)).toEqual(guardada)
    expect(estadoDeSesion([], DIA, null)).toBeNull()
  })
})
