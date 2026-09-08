import { describe, it, expect } from 'vitest'
import {
  revisarNombre, cambioNombre, revisarCorreo, cambioCorreo,
  revisarClave, resultadoDeCambioDeCorreo, CLAVE_MINIMA
} from './cuenta.js'

/* Regla 10: se prueba la lógica que puede hacer daño. Estas tres
 * cambian cómo entra alguien a su propia cuenta, así que el daño
 * posible es dejar a una persona afuera. */

describe('revisarNombre', () => {
  it('no deja vaciarlo', () => {
    // `perfiles.nombre` es not null: un vacío lo rechaza Postgres con un
    // mensaje que no se le puede enseñar a nadie.
    expect(revisarNombre('')).toBeTruthy()
    expect(revisarNombre('   ')).toBeTruthy()
    expect(revisarNombre(null)).toBeTruthy()
  })

  it('acepta un nombre normal', () => {
    expect(revisarNombre('Ana María')).toBeNull()
  })

  it('corta los absurdos', () => {
    expect(revisarNombre('x'.repeat(200))).toBeTruthy()
  })
})

describe('cambioNombre', () => {
  it('no cuenta como cambio si solo sobran espacios', () => {
    // Sin esto, abrir la pantalla y tocar Guardar manda una escritura
    // que no cambia nada y contesta "Guardado".
    expect(cambioNombre('  Ana  ', 'Ana')).toBe(false)
  })

  it('sí cuenta cuando de verdad cambia', () => {
    expect(cambioNombre('Ana', 'Andrés')).toBe(true)
  })
})

describe('revisarCorreo', () => {
  it('atrapa el dedazo evidente', () => {
    expect(revisarCorreo('ana')).toBeTruthy()
    expect(revisarCorreo('ana@')).toBeTruthy()
    expect(revisarCorreo('ana@correo')).toBeTruthy()
    expect(revisarCorreo('')).toBeTruthy()
  })

  it('deja pasar uno normal', () => {
    expect(revisarCorreo('ana@correo.com')).toBeNull()
  })
})

describe('cambioCorreo', () => {
  it('ignora las mayúsculas, porque el correo también', () => {
    // Sin esto, escribir el mismo correo con otra caja hace que la app
    // diga "revisa tu correo" por un cambio que no existe.
    expect(cambioCorreo('Ana@Correo.com', 'ana@correo.com')).toBe(false)
  })

  it('detecta el cambio de verdad', () => {
    expect(cambioCorreo('otra@correo.com', 'ana@correo.com')).toBe(true)
  })
})

describe('revisarClave', () => {
  it('exige el mismo mínimo que el registro', () => {
    // Dos mínimos distintos harían que una clave válida al crear la
    // cuenta fuera inválida al cambiarla.
    expect(revisarClave('a'.repeat(CLAVE_MINIMA - 1), 'a'.repeat(CLAVE_MINIMA - 1))).toBeTruthy()
    expect(revisarClave('a'.repeat(CLAVE_MINIMA), 'a'.repeat(CLAVE_MINIMA))).toBeNull()
  })

  it('no deja guardar si las dos no son iguales', () => {
    // El campo va oculto: un dedazo no se ve, y guardarlo deja a la
    // persona fuera de su cuenta sin saber por qué.
    expect(revisarClave('clavelarga1', 'clavelarga2')).toBeTruthy()
  })

  it('pide la segunda, no solo la primera', () => {
    expect(revisarClave('clavelarga1', '')).toBeTruthy()
  })
})

describe('resultadoDeCambioDeCorreo', () => {
  it('con confirmación pendiente NO dice que ya está', () => {
    /* EL CASO CARO. Supabase deja el correo nuevo esperando en
     * `new_email` y no cambia nada hasta que se abra el enlace. Decir
     * "listo" aquí hace que alguien cierre sesión creyendo que su
     * correo cambió y no pueda volver a entrar. */
    const r = resultadoDeCambioDeCorreo({
      email: 'viejo@correo.com', new_email: 'nuevo@correo.com'
    })
    expect(r.estado).toBe('pendiente')
    expect(r.correoEnUso).toBe('viejo@correo.com')
    // El mensaje tiene que nombrar los dos: a cuál llegó el enlace y
    // con cuál se sigue entrando mientras tanto.
    expect(r.mensaje).toContain('nuevo@correo.com')
    expect(r.mensaje).toContain('viejo@correo.com')
  })

  it('sin confirmación dice que ya quedó', () => {
    const r = resultadoDeCambioDeCorreo({ email: 'nuevo@correo.com' })
    expect(r.estado).toBe('hecho')
    expect(r.correoEnUso).toBe('nuevo@correo.com')
  })

  it('trata new_email vacío como que no hay nada pendiente', () => {
    // Supabase lo devuelve como cadena vacía a veces, no como null.
    expect(resultadoDeCambioDeCorreo({ email: 'a@b.com', new_email: '' }).estado)
      .toBe('hecho')
  })

  it('no revienta si no llega usuario', () => {
    expect(resultadoDeCambioDeCorreo(null).estado).toBe('hecho')
  })
})
