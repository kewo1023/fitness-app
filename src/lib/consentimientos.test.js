import { describe, it, expect } from 'vitest'
import { CONSENTIMIENTOS, mensajeDeError } from './consentimientos.js'

/* Estas pruebas no cuidan el código: cuidan el cumplimiento de la Ley
 * 1581. Son las que van a saltar el día que alguien "simplifique" el
 * formulario y, sin darse cuenta, lo vuelva ilegal. */

describe('las autorizaciones cumplen la Ley 1581', () => {
  it('hay finalidades SEPARADAS, no una casilla que lo abarque todo', () => {
    // Una sola autorización general no es autorización válida: la ley
    // exige poder aceptar unas cosas y rechazar otras.
    expect(Object.keys(CONSENTIMIENTOS).length).toBeGreaterThanOrEqual(4)
  })

  it('los datos de salud son OPCIONALES', () => {
    // El artículo 6 y el decreto reglamentario obligan a informar que
    // responder preguntas sobre datos sensibles es facultativo. Si
    // alguien marca esto como obligatorio, la app deja de cumplir.
    expect(CONSENTIMIENTOS.datos_sensibles.obligatorio).toBe(false)
  })

  it('las notificaciones son opcionales', () => {
    expect(CONSENTIMIENTOS.notificaciones.obligatorio).toBe(false)
  })

  it('el texto de datos sensibles dice que es opcional, con esa palabra', () => {
    // No basta con que el campo se pueda dejar vacío: hay que
    // informarlo, y en un texto que se entienda.
    expect(CONSENTIMIENTOS.datos_sensibles.texto.toLowerCase())
      .toContain('opcional')
  })

  it('el texto de datos personales avisa dónde se guardan', () => {
    // Alojar en Estados Unidos es legal (Circular 005 de 2017 de la
    // SIC), pero hay que declararlo.
    expect(CONSENTIMIENTOS.datos_personales.texto)
      .toMatch(/Estados Unidos/)
  })

  it('ningún texto usa palabras reservadas al nutricionista', () => {
    // Regla 1 de PARAR en CLAUDE.md: la Ley 73 de 1979 protege el
    // título, y usar estas palabras en la interfaz sugiere un servicio
    // que la app no puede prestar.
    const prohibidas = /nutricional|nutricionista|dieta personalizada/i
    for (const c of Object.values(CONSENTIMIENTOS)) {
      expect(c.texto).not.toMatch(prohibidas)
      expect(c.titulo).not.toMatch(prohibidas)
    }
  })
})

describe('mensajeDeError', () => {
  it('traduce los errores de Supabase, que vienen en inglés', () => {
    expect(mensajeDeError({ message: 'Invalid login credentials' }))
      .toBe('Correo o contraseña incorrectos.')
  })

  it('deja pasar tal cual los mensajes de nuestras funciones SQL', () => {
    // Los de 03-funciones.sql ya están escritos en español y pensados
    // para leerse. Traducirlos otra vez los estropearía.
    const nuestro = 'Ese código ya venció. Pídele uno nuevo a tu entrenador.'
    expect(mensajeDeError({ message: nuestro })).toBe(nuestro)
  })

  it('nunca deja escapar texto técnico a la pantalla', () => {
    // Regla 3 de CLAUDE.md: lo que sale en pantalla lo leen el
    // entrenador y sus clientes.
    const tecnico = { message: 'PGRST301: JWSError JWSInvalidSignature' }
    const salida = mensajeDeError(tecnico)
    expect(salida).toBe('Algo salió mal. Intenta de nuevo.')
    expect(salida).not.toMatch(/PGRST|JWS/)
  })

  it('con null no revienta', () => {
    expect(mensajeDeError(null)).toBe(null)
  })
})
