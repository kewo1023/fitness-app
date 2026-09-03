import { describe, it, expect } from 'vitest'
import {
  GRUPOS, MOVIMIENTOS, EQUIPOS, NIVELES,
  normalizar, limpiarNombre, claveNombre, etiqueta, validarEjercicio
} from './ejercicios.js'

/* Regla 10 de CLAUDE.md: se prueba la lógica que puede hacer daño.
 *
 * Aquí el daño no es un número mal calculado: es el entrenador pegando
 * su hoja de 150 ejercicios y que la carga se caiga a la mitad, o que
 * entren 150 filas con "Pecho", "pecho" y "PECHO" como si fueran tres
 * grupos distintos. La biblioteca es el trabajo de una tarde suya, y
 * ensuciarla se paga limpiándola a mano.
 *
 * Estas mismas funciones las va a usar la carga masiva. Que el
 * formulario y la hoja de cálculo validen con el mismo código es lo que
 * impide que una acepte lo que la otra rechaza.
 */

describe('normalizar', () => {
  it('deja el texto como lo espera la base', () => {
    // Nadie escribe una hoja de cálculo con un criterio constante.
    expect(normalizar('  Pecho ')).toBe('pecho')
    expect(normalizar('PECHO')).toBe('pecho')
  })

  it('quita las tildes, que es lo que rompe las comparaciones', () => {
    // La base guarda 'jalon' sin tilde. Si el entrenador escribe
    // "Jalón" —que es como se escribe bien— y esto no lo normalizara,
    // la fila se rechazaría por un acento.
    expect(normalizar('Jalón')).toBe('jalon')
    expect(normalizar('Máquina')).toBe('maquina')
    expect(MOVIMIENTOS).toContain(normalizar('Jalón'))
    expect(EQUIPOS).toContain(normalizar('Máquina'))
  })

  it('no explota con una celda vacía', () => {
    // Una hoja de cálculo real llega con huecos. Si esto devolviera
    // undefined, el .includes() de la validación reventaría la carga
    // entera por una celda en blanco.
    expect(normalizar(null)).toBe('')
    expect(normalizar(undefined)).toBe('')
    expect(normalizar('')).toBe('')
  })
})

describe('limpiarNombre y claveNombre', () => {
  it('conserva las mayúsculas del nombre: es lo que lee el cliente', () => {
    expect(limpiarNombre('  Press de banca  ')).toBe('Press de banca')
  })

  it('colapsa los espacios de más, incluidos los del medio', () => {
    // Este es el caso que el índice único de la base NO atrapa solo:
    // "Press  de banca" y "Press de banca" son cadenas distintas para
    // Postgres, así que entrarían las dos y quedarían duplicadas en el
    // catálogo del cliente.
    expect(limpiarNombre('Press  de   banca')).toBe('Press de banca')
  })

  it('la clave reconoce el mismo ejercicio escrito de dos formas', () => {
    expect(claveNombre('Sentadilla Goblet'))
      .toBe(claveNombre('  sentadilla  goblet '))
  })
})

describe('etiqueta', () => {
  it('escribe bien lo que la base guarda sin tilde', () => {
    // Regla 3 de CLAUDE.md: lo que sale en pantalla lo lee el cliente.
    // 'jalon' es un detalle de la base, no algo que él deba ver.
    expect(etiqueta('jalon')).toBe('Jalón')
    expect(etiqueta('maquina')).toBe('Máquina')
  })

  it('traduce "ninguno", que sin traducir no se entiende', () => {
    // Una píldora que diga "Ninguno" al lado de "Pecho" no dice nada.
    expect(etiqueta('ninguno')).toBe('Sin equipo')
  })

  it('pone en mayúscula lo que no tiene traducción especial', () => {
    expect(etiqueta('pecho')).toBe('Pecho')
    expect(etiqueta('principiante')).toBe('Principiante')
  })

  it('devuelve cadena vacía y no "Null" con un valor ausente', () => {
    // `movimiento`, `equipo` y `nivel` son opcionales y van a llegar
    // nulos mucho tiempo. Una píldora que diga "Null" es la app rota.
    expect(etiqueta(null)).toBe('')
    expect(etiqueta(undefined)).toBe('')
    expect(etiqueta('')).toBe('')
  })
})

describe('validarEjercicio', () => {
  it('acepta una fila completa y la normaliza', () => {
    const r = validarEjercicio({
      nombre: '  Press de Banca  ', grupo: 'Pecho', movimiento: 'Empuje',
      equipo: 'Barra', nivel: 'Intermedio', indicaciones: ' Omóplatos atrás. '
    })
    expect(r.valido).toBe(true)
    expect(r.ejercicio).toEqual({
      nombre: 'Press de Banca',
      grupo: 'pecho',
      movimiento: 'empuje',
      equipo: 'barra',
      nivel: 'intermedio',
      indicaciones: 'Omóplatos atrás.'
    })
  })

  it('solo exige nombre y grupo', () => {
    // La hoja del entrenador NO va a estar completa el primer día.
    // Exigirle las seis columnas es garantizar que no la mande.
    const r = validarEjercicio({ nombre: 'Plancha', grupo: 'core' })
    expect(r.valido).toBe(true)
  })

  it('manda null y no cadena vacía en los opcionales', () => {
    // No es un detalle: el CHECK de `equipo` en 01-esquema.sql acepta
    // null, pero una cadena vacía no está en su lista y Postgres
    // rechazaría la fila entera con un error que no dice nada.
    const r = validarEjercicio({ nombre: 'Plancha', grupo: 'core', equipo: '' })
    expect(r.ejercicio.equipo).toBeNull()
    expect(r.ejercicio.movimiento).toBeNull()
    expect(r.ejercicio.nivel).toBeNull()
    expect(r.ejercicio.indicaciones).toBeNull()
  })

  it('rechaza la fila sin nombre y dice por qué', () => {
    const r = validarEjercicio({ nombre: '   ', grupo: 'pecho' })
    expect(r.valido).toBe(false)
    expect(r.errores).toContain('Falta el nombre.')
  })

  it('rechaza un grupo inventado', () => {
    const r = validarEjercicio({ nombre: 'Curl', grupo: 'bíceps' })
    expect(r.valido).toBe(false)
    // "bíceps" es un músculo, pero no uno de los siete grupos que él
    // usa. Va dentro de 'brazo'. El mensaje tiene que decir cuál era
    // el valor, o el entrenador no sabe qué fila arreglar.
    expect(r.errores[0]).toContain('bíceps')
  })

  it('rechaza un equipo que la base no aceptaría', () => {
    // Este es EL error que evita que la carga se caiga a la mitad: el
    // CHECK de Postgres rechazaría "pesas", y sin esta validación el
    // entrenador vería un error críptico después de esperar la subida.
    const r = validarEjercicio({ nombre: 'Curl', grupo: 'brazo', equipo: 'pesas' })
    expect(r.valido).toBe(false)
    expect(r.errores[0]).toContain('pesas')
  })

  it('junta todos los errores de una fila, no solo el primero', () => {
    // Si devolviera de a uno, arreglar una fila con tres problemas
    // serían tres vueltas de carga.
    const r = validarEjercicio({ nombre: '', grupo: 'tríceps', nivel: 'experto' })
    expect(r.errores.length).toBe(3)
  })

  it('no explota con una fila vacía de la hoja de cálculo', () => {
    // Una hoja pegada casi siempre trae renglones en blanco al final.
    const r = validarEjercicio({})
    expect(r.valido).toBe(false)
    expect(r.errores).toContain('Falta el nombre.')
  })
})

describe('los valores válidos coinciden con lo que acepta la base', () => {
  /* Estas dos pruebas no cuidan el código: cuidan que nadie agregue
   * aquí un valor sin agregarlo también al CHECK de
   * supabase/01-esquema.sql. Si se desincronizan, el formulario ofrece
   * una opción que el guardado rechaza — y el entrenador ve un error
   * después de llenar todo. */
  it('los equipos son exactamente los ocho del esquema', () => {
    expect(EQUIPOS).toEqual([
      'ninguno', 'mancuernas', 'banda', 'barra', 'maquina', 'polea',
      'kettlebell', 'banco'
    ])
  })

  it('los niveles son exactamente los tres del esquema', () => {
    expect(NIVELES).toEqual(['principiante', 'intermedio', 'avanzado'])
  })

  it('ningún valor lleva tilde ni mayúscula: se comparan normalizados', () => {
    for (const lista of [GRUPOS, MOVIMIENTOS, EQUIPOS, NIVELES]) {
      for (const v of lista) expect(v).toBe(normalizar(v))
    }
  })
})
