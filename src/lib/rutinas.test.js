import { describe, it, expect } from 'vitest'
import {
  mover, validarRutina, clave, mapaDeDias, diasParaGuardar,
  diasDeEntrenoPorSemana, resumenRutina
} from './rutinas.js'

const EJ = (n, extra = {}) => ({
  ejercicio_id: n, nombre: `Ejercicio ${n}`,
  series: 3, reps: '10', descanso_seg: 60, ...extra
})

describe('mover un ejercicio de puesto', () => {
  const L = [EJ(1), EJ(2), EJ(3)]

  it('baja el primero', () => {
    expect(mover(L, 0, 1).map(e => e.ejercicio_id)).toEqual([2, 1, 3])
  })

  it('sube el último', () => {
    expect(mover(L, 2, -1).map(e => e.ejercicio_id)).toEqual([1, 3, 2])
  })

  it('NO modifica la lista original', () => {
    // Una lista modificada en el sitio es una lista que React no vuelve
    // a pintar: compara la referencia, la ve igual, y no hace nada.
    mover(L, 0, 1)
    expect(L.map(e => e.ejercicio_id)).toEqual([1, 2, 3])
  })

  it('subir el primero devuelve LA MISMA lista, no una copia', () => {
    // Así el componente ni se vuelve a pintar cuando el botón no aplica.
    expect(mover(L, 0, -1)).toBe(L)
    expect(mover(L, 2, 1)).toBe(L)
  })

  it('un índice fuera de rango no revienta', () => {
    expect(mover(L, 9, 1)).toBe(L)
    expect(mover(L, -3, 1)).toBe(L)
    expect(mover(null, 0, 1)).toEqual([])
  })
})

describe('validar una rutina', () => {
  const BASE = { nombre: 'Empuje A', nivel: 'intermedio', duracion_min: 45 }

  it('una rutina completa pasa', () => {
    const r = validarRutina(BASE, [EJ(1), EJ(2)])
    expect(r.valido).toBe(true)
    expect(r.rutina.ejercicios).toHaveLength(2)
  })

  it('sin nombre no pasa', () => {
    expect(validarRutina({ ...BASE, nombre: '  ' }, [EJ(1)]).errores)
      .toContain('La rutina necesita un nombre.')
  })

  it('sin ejercicios no pasa', () => {
    expect(validarRutina(BASE, []).errores).toContain('Agrega al menos un ejercicio.')
  })

  it('el error dice QUÉ ejercicio, no solo que hay uno', () => {
    // "Revisa las series" obliga a mirar los doce; con el puesto y el
    // nombre se arregla de una. Misma decisión que la carga masiva.
    const r = validarRutina(BASE, [EJ(1), EJ(2, { reps: '' })])
    expect(r.valido).toBe(false)
    expect(r.errores[0]).toContain('2. Ejercicio 2')
    expect(r.errores[0]).toContain('repeticiones')
  })

  it('acepta reps en rango, porque así las escribe un entrenador', () => {
    // La columna es TEXTO a propósito: "8-10" es una respuesta válida.
    expect(validarRutina(BASE, [EJ(1, { reps: '8-10' })]).valido).toBe(true)
  })

  it('rechaza series absurdas', () => {
    expect(validarRutina(BASE, [EJ(1, { series: 0 })]).valido).toBe(false)
    expect(validarRutina(BASE, [EJ(1, { series: 99 })]).valido).toBe(false)
  })

  it('el descanso puede ser CERO, que es un circuito', () => {
    expect(validarRutina(BASE, [EJ(1, { descanso_seg: 0 })]).valido).toBe(true)
  })

  it('la duración vacía es válida y sale como null', () => {
    const r = validarRutina({ ...BASE, duracion_min: '' }, [EJ(1)])
    expect(r.valido).toBe(true)
    expect(r.rutina.duracion_min).toBe(null)
  })

  it('publica sale siempre como booleano', () => {
    expect(validarRutina(BASE, [EJ(1)]).rutina.publica).toBe(false)
    expect(validarRutina({ ...BASE, publica: true }, [EJ(1)]).rutina.publica)
      .toBe(true)
  })
})

describe('el calendario de la plantilla', () => {
  it('las filas de la base se vuelven mapa', () => {
    const m = mapaDeDias([
      { semana: 1, dia: 1, rutina_id: 5 },
      { semana: 1, dia: 3, rutina_id: null }
    ])
    expect(m[clave(1, 1)]).toBe(5)
    expect(m[clave(1, 3)]).toBe(null)
  })

  it('un DESCANSO y un día SIN PROGRAMAR no son lo mismo', () => {
    // El descanso lo puso el entrenador y la pantalla de Hoy le dice
    // cosas distintas al cliente. La diferencia tiene que sobrevivir.
    const m = mapaDeDias([{ semana: 1, dia: 3, rutina_id: null }])
    expect(clave(1, 3) in m).toBe(true)     // existe: es descanso
    expect(clave(1, 4) in m).toBe(false)    // no existe: sin programar
  })

  it('al guardar se recortan los días fuera de las semanas', () => {
    // Pasa al bajar la plantilla de 4 semanas a 3: la semana 4 llena
    // quedaría huérfana y clonar_plantilla la copiaría igual al plan.
    const m = { [clave(1, 1)]: 5, [clave(4, 2)]: 7 }
    const filas = diasParaGuardar(m, 3)
    expect(filas).toHaveLength(1)
    expect(filas[0]).toEqual({ semana: 1, dia: 1, rutina_id: 5 })
  })

  it('se guardan ordenados por semana y día', () => {
    const m = { [clave(2, 1)]: 1, [clave(1, 5)]: 2, [clave(1, 2)]: 3 }
    expect(diasParaGuardar(m, 4).map(f => `${f.semana}-${f.dia}`))
      .toEqual(['1-2', '1-5', '2-1'])
  })

  it('el descanso sí se guarda, con rutina en null', () => {
    const filas = diasParaGuardar({ [clave(1, 3)]: null }, 4)
    expect(filas).toEqual([{ semana: 1, dia: 3, rutina_id: null }])
  })
})

describe('cuántos días entrena por semana', () => {
  it('cuenta solo los días CON rutina', () => {
    // Un descanso programado no es un día de entrenamiento. Contarlo le
    // pondría al cliente una meta que su propio plan no le deja cumplir.
    const m = {
      [clave(1, 1)]: 5, [clave(1, 3)]: null, [clave(1, 5)]: 6,
      [clave(2, 1)]: 5
    }
    expect(diasDeEntrenoPorSemana(m, 2)).toEqual([2, 1])
  })

  it('una plantilla vacía da ceros y no revienta', () => {
    expect(diasDeEntrenoPorSemana({}, 3)).toEqual([0, 0, 0])
  })
})

describe('el resumen de una rutina', () => {
  it('junta nivel, ejercicios y duración', () => {
    expect(resumenRutina({ nivel: 'intermedio', duracion_min: 45 }, 6))
      .toBe('Intermedio · 6 ejercicios · 45 min')
  })

  it('sin nivel ni duración sigue diciendo algo', () => {
    expect(resumenRutina({}, 1)).toBe('1 ejercicio')
  })
})
