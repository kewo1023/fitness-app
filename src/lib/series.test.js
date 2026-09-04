import { describe, it, expect } from 'vitest'
import {
  objetivoReps, valoresPrellenados, validarSerie, progresoSesion,
  textoObjetivo, PESO_MAXIMO, REPS_MAXIMAS
} from './series.js'

/* =====================================================================
   Pruebas del registro de series
   =====================================================================

   Lo que se protege aquí no es que la app no se rompa: es que no
   ESCRIBA UN NÚMERO QUE NADIE HIZO.

   Esta tabla es la que alimenta la métrica de ejercicios saltados y el
   historial de progreso de una persona. Un prellenado de más mete un
   dato falso que después nadie puede distinguir de uno real, porque en
   la base se ven idénticos.
   ===================================================================== */

describe('entender lo que pide el plan', () => {
  it('un número solo es un objetivo exacto', () => {
    expect(objetivoReps('12')).toEqual({ exacto: 12 })
  })

  it('un rango se entiende, en sus tres formas', () => {
    expect(objetivoReps('8-10')).toEqual({ min: 8, max: 10 })
    expect(objetivoReps('8 - 10')).toEqual({ min: 8, max: 10 })
    expect(objetivoReps('8 a 10')).toEqual({ min: 8, max: 10 })
  })

  it('un rango al revés se ordena, no se rechaza', () => {
    // Es un error de tecleo del entrenador, no otra intención.
    expect(objetivoReps('10-8')).toEqual({ min: 8, max: 10 })
  })

  it('lo que no se entiende devuelve null, NO el primer número', () => {
    // ES LA PRUEBA QUE IMPORTA DE ESTE BLOQUE. Si "12 por lado"
    // devolviera 12, ese 12 acabaría prellenado en un campo que la
    // persona puede guardar sin mirar, y de ahí a su historial como si
    // lo hubiera hecho.
    expect(objetivoReps('12 por lado')).toBeNull()
    expect(objetivoReps('al fallo')).toBeNull()
    expect(objetivoReps('AMRAP')).toBeNull()
    expect(objetivoReps('')).toBeNull()
    expect(objetivoReps(null)).toBeNull()
  })
})

describe('con qué llegan los campos', () => {
  it('el peso sale de la última vez antes que de la sugerencia', () => {
    // Lo que él levantó de verdad le gana a lo que el plan sugiere: la
    // sugerencia la escribió el entrenador una vez, el peso real es de
    // la semana pasada.
    const v = valoresPrellenados({
      ultima: { peso_kg: 72.5 }, pesoSugerido: 60, objetivo: { exacto: 12 }
    })
    expect(v.peso).toBe('72.5')
  })

  it('sin historial cae en la sugerencia del plan', () => {
    expect(valoresPrellenados({ pesoSugerido: 60 }).peso).toBe('60')
  })

  it('sin nada, el campo llega vacío y no en cero', () => {
    // Un 0 prellenado se puede guardar sin mirar y queda registrado
    // como que levantó cero kilos. Vacío obliga a escribirlo o a
    // dejarlo en blanco a conciencia.
    expect(valoresPrellenados({}).peso).toBe('')
    expect(valoresPrellenados().peso).toBe('')
  })

  it('las reps se prellenan SOLO con un objetivo exacto', () => {
    expect(valoresPrellenados({ objetivo: { exacto: 12 } }).reps).toBe('12')
  })

  it('con un rango las reps van vacías', () => {
    // Elegir el 8 o el 10 por él sería inventar. Es la decisión de
    // diseño de toda la pantalla y por eso está fijada aquí.
    expect(valoresPrellenados({ objetivo: { min: 8, max: 10 } }).reps).toBe('')
  })

  it('las reps NUNCA salen de la última vez', () => {
    // El peso sí, las repeticiones no: son lo que acaba de pasar y es
    // justo lo que la app existe para medir.
    const v = valoresPrellenados({ ultima: { peso_kg: 70, reps: 9 } })
    expect(v.reps).toBe('')
  })
})

describe('lo que se guarda', () => {
  it('la coma decimal se acepta', () => {
    // En Colombia se escribe 72,5. Sin esto, la mitad de los pesos se
    // rechazarían por escribirlos como se escriben allá.
    expect(validarSerie({ peso: '72,5' }).valores.peso_kg).toBe(72.5)
  })

  it('los dos campos vacíos son válidos', () => {
    // La fila significa "hice esta serie". Quien entrena sin pesas o no
    // quiere anotar números tiene que poder marcarla igual, o la
    // métrica de ejercicios saltados acaba midiendo quién anota.
    const r = validarSerie({ peso: '', reps: '' })
    expect(r.valido).toBe(true)
    expect(r.valores).toEqual({ peso_kg: null, reps: null })
  })

  it('se redondea a los dos decimales que guarda la columna', () => {
    expect(validarSerie({ peso: '72,555' }).valores.peso_kg).toBe(72.56)
  })

  it('rechaza lo que la columna no aguanta', () => {
    // numeric(6,2) llega hasta 9999.99. Pasarse no da un error bonito:
    // da un error de Postgres en la cara del usuario a media serie.
    expect(validarSerie({ peso: String(PESO_MAXIMO + 1) }).valido).toBe(false)
    expect(validarSerie({ reps: String(REPS_MAXIMAS + 1) }).valido).toBe(false)
  })

  it('rechaza negativos y texto', () => {
    expect(validarSerie({ peso: '-5' }).valido).toBe(false)
    expect(validarSerie({ reps: '-1' }).valido).toBe(false)
    expect(validarSerie({ peso: 'mucho' }).valido).toBe(false)
  })

  it('las repeticiones no admiten decimales', () => {
    expect(validarSerie({ reps: '8.5' }).valido).toBe(false)
  })

  it('ningún mensaje de error habla de la base', () => {
    // Regla 3 de CLAUDE.md: lo que sale en pantalla lo leen el
    // entrenador y sus clientes.
    const errores = [
      ...validarSerie({ peso: 'mucho' }).errores,
      ...validarSerie({ reps: '-1' }).errores,
      ...validarSerie({ peso: '99999' }).errores
    ]
    expect(errores.length).toBeGreaterThan(0)
    for (const e of errores) {
      expect(e).not.toMatch(/numeric|column|tabla|null|constraint|supabase/i)
    }
  })
})

describe('cuánto lleva del entrenamiento', () => {
  it('cuenta lo hecho contra lo planeado', () => {
    expect(progresoSesion(6, 12)).toMatchObject({
      hechas: 6, total: 12, mostradas: 6, completo: false, porcentaje: 50
    })
  })

  it('una serie de más no dice "13 de 12"', () => {
    const p = progresoSesion(13, 12)
    expect(p.mostradas).toBe(12)
    expect(p.porcentaje).toBe(100)
    expect(p.completo).toBe(true)
  })

  it('una rutina vacía NO está completa', () => {
    // Sin este caso, una rutina sin ejercicios ofrecería terminar un
    // entrenamiento que no existe.
    expect(progresoSesion(0, 0).completo).toBe(false)
  })
})

describe('el texto del objetivo', () => {
  it('junta series y repeticiones', () => {
    expect(textoObjetivo(4, '8-10')).toBe('4 × 8-10')
  })

  it('sin repeticiones no deja un "×" suelto', () => {
    expect(textoObjetivo(4, '')).toBe('4 series')
  })
})
