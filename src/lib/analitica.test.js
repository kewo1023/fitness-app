import { describe, it, expect } from 'vitest'
import {
  formatearMinutos, textoDesdeUltima, nivelDeAdherencia, semanasSeguidas,
  CORTE_AL_DIA, CORTE_IRREGULAR
} from './analitica.js'

/* =====================================================================
   Pruebas de cómo se leen los números de la analítica
   =====================================================================

   Estas frases las va a leer el entrenador AL LADO DEL NOMBRE de una
   persona que conoce. Una mal calculada no rompe la app: le hace
   escribirle a quien no era, o no escribirle a quien sí. Eso no lo
   detecta ninguna pantalla en blanco.

   Lo que NO se prueba aquí, porque no vive aquí: la adherencia, la
   racha y los minutos los calcula Postgres en 08-analitica.sql. Eso se
   comprueba con la prueba de suplantación del final de ese archivo.
   ===================================================================== */

describe('los minutos, para que se lean de un vistazo', () => {
  it('menos de una hora se queda en minutos', () => {
    expect(formatearMinutos(47)).toBe('47 min')
  })

  it('una hora justa no arrastra un "0" detrás', () => {
    // "1 h 0" se lee como un error de la app.
    expect(formatearMinutos(60)).toBe('1 h')
  })

  it('lo demás va en horas y minutos', () => {
    expect(formatearMinutos(1240)).toBe('20 h 40')
  })

  it('sin datos no dice NaN', () => {
    // Un cliente recién activado no tiene ni una sesión, y la vista de
    // resumen no le devuelve fila. "NaN min" en la pantalla de alguien
    // que apenas entra es la peor primera impresión posible.
    expect(formatearMinutos(null)).toBe('0 min')
    expect(formatearMinutos(undefined)).toBe('0 min')
    expect(formatearMinutos('hola')).toBe('0 min')
  })
})

describe('hace cuánto entrenó', () => {
  it('nunca haber entrenado NO es lo mismo que cero días', () => {
    // Es la distinción que importa de esta función. Cero días es
    // "entrenó hoy", que es lo contrario de "no ha entrenado nunca".
    // Si las dos dieran la misma frase, el cliente que nunca empezó
    // aparecería como el más cumplido de la lista.
    expect(textoDesdeUltima(null)).toBe('Nunca ha entrenado')
    expect(textoDesdeUltima(0)).toBe('Entrenó hoy')
  })

  it('ayer se dice ayer, no "hace 1 días"', () => {
    expect(textoDesdeUltima(1)).toBe('Entrenó ayer')
  })

  it('dentro de la semana da el número exacto', () => {
    expect(textoDesdeUltima(3)).toBe('Hace 3 días')
  })

  it('pasada la semana deja de contar días', () => {
    // A partir de aquí el número exacto ya no cambia lo que él va a
    // hacer: le va a escribir igual. Redondear evita un "hace 23 días"
    // que se lee como reproche.
    expect(textoDesdeUltima(9)).toBe('Hace más de una semana')
    expect(textoDesdeUltima(21)).toBe('Hace 3 semanas')
    expect(textoDesdeUltima(60)).toBe('Hace más de un mes')
  })
})

describe('en qué está cada cliente', () => {
  it('en el corte exacto ya cuenta como al día', () => {
    // Un cliente con la meta clavada tiene que salir "Al día". Si el
    // corte fuera "mayor que", quien cumple exactamente su plan
    // aparecería como irregular, que es justo al revés.
    expect(nivelDeAdherencia(CORTE_AL_DIA).clave).toBe('al-dia')
    expect(nivelDeAdherencia(100).clave).toBe('al-dia')
  })

  it('el tramo del medio es irregular', () => {
    expect(nivelDeAdherencia(CORTE_IRREGULAR).clave).toBe('irregular')
    expect(nivelDeAdherencia(65).clave).toBe('irregular')
  })

  it('por debajo del segundo corte', () => {
    expect(nivelDeAdherencia(20).clave).toBe('flojo')
    expect(nivelDeAdherencia(0).clave).toBe('flojo')
  })

  it('sin dato no inventa un cero', () => {
    expect(nivelDeAdherencia(null).clave).toBe('sin-datos')
    expect(nivelDeAdherencia(undefined).clave).toBe('sin-datos')
  })

  it('ningún texto califica a la persona', () => {
    // Regla de la app, no de estilo: el texto describe el dato. El día
    // que alguien escriba "Incumplido" aquí, esto se pone rojo.
    const textos = [0, 60, 90, null].map(n => nivelDeAdherencia(n).texto)
    for (const t of textos) {
      expect(t).not.toMatch(/vago|flojo|incumplid|abandon|malo/i)
    }
  })
})

describe('las semanas de la barra', () => {
  /* 2026-09-07, 2026-08-31 y 2026-08-24 son lunes seguidos. */
  const LUNES = '2026-09-07'

  it('devuelve siempre la cantidad pedida, aunque no haya datos', () => {
    expect(semanasSeguidas([], LUNES, 8)).toHaveLength(8)
  })

  it('la semana sin entrenar aparece en cero, no desaparece', () => {
    // ES LA RAZÓN DE SER DE ESTA FUNCIÓN. La vista solo devuelve las
    // semanas con sesiones; pintando eso tal cual, dos semanas
    // separadas por un mes de hueco se verían pegadas y la barra diría
    // que entrenó seguido.
    const filas = [
      { lunes: '2026-09-07', dias: 3, meta: 3, cumplida: true },
      { lunes: '2026-08-24', dias: 2, meta: 3, cumplida: false }
    ]
    const semanas = semanasSeguidas(filas, LUNES, 3)

    expect(semanas.map(s => s.lunes))
      .toEqual(['2026-08-24', '2026-08-31', '2026-09-07'])
    expect(semanas.map(s => s.dias)).toEqual([2, 0, 3])
  })

  it('la más vieja queda a la izquierda y la actual a la derecha', () => {
    // Una barra de tiempo que corriera al revés se leería como que la
    // persona viene empeorando cuando viene mejorando.
    const semanas = semanasSeguidas([], LUNES, 4)
    expect(semanas[0].lunes).toBe('2026-08-17')
    expect(semanas[semanas.length - 1].lunes).toBe(LUNES)
  })

  it('una semana sin fila no se cuenta como cumplida', () => {
    const semanas = semanasSeguidas([], LUNES, 2)
    expect(semanas.every(s => s.cumplida === false)).toBe(true)
  })
})
