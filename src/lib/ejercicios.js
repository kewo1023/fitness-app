/* =====================================================================
   ejercicios.js — el vocabulario de la biblioteca, en un solo sitio
   =====================================================================

   Todo lo que sabe la app sobre CÓMO se describe un ejercicio vive
   aquí: qué grupos existen, qué equipos, qué niveles, cómo se valida
   una fila y cómo se arma la dirección de su imagen.

   Por qué en un archivo aparte y no dentro de la pantalla: en la Fase 3
   estas listas las van a usar tres sitios distintos —el catálogo para
   filtrar, el panel del entrenador para el formulario, y la carga
   masiva para revisar la hoja de cálculo antes de guardarla—. Si cada
   uno tuviera su copia, el día que el entrenador pida un grupo nuevo
   habría que acordarse de los tres.

   Analogía de Excel: esto es la hoja de "Listas" que alimenta las
   validaciones de datos de todas las demás hojas. Se agrega el valor
   una vez y aparece en todos los desplegables.

   ESTE ARCHIVO NO TOCA LA BASE DE DATOS, y es a propósito. `supabase.js`
   lanza un error al cargarse si faltan las credenciales — que es lo
   correcto en la app, pero significa que cualquier archivo que lo
   importe no se puede probar sin un `.env.local`, y ese archivo no está
   en git. Al dejar aquí solo lógica pura, estas pruebas corren en un
   clon recién bajado. Lo que sí necesita la conexión vive en
   `imagenes.js`.
   ===================================================================== */


/* Los DOS EJES, que son columnas distintas a propósito.
 *
 * `grupo` es el músculo y `movimiento` es el patrón, y el entrenador
 * piensa en los dos a la vez. No es redundante: un press de banca y
 * unas flexiones son los dos EMPUJE de PECHO, pero una sentadilla es
 * SENTADILLA de PIERNA y un peso muerto es BISAGRA de la misma PIERNA.
 *
 * Colapsarlos en una sola columna es la tentación obvia y rompe la
 * pregunta que más le sirve a él: "¿qué puede hacer este cliente con lo
 * que tiene en la casa?".
 */
export const GRUPOS = [
  'pecho', 'espalda', 'pierna', 'hombro', 'brazo', 'core', 'cardio'
]

export const MOVIMIENTOS = [
  'empuje', 'jalon', 'sentadilla', 'bisagra', 'zancada', 'core', 'cardio'
]

/* Estos dos SÍ están fijados por la base: `01-esquema.sql` les puso un
 * CHECK. Si aquí se agrega un valor que allá no existe, el guardado
 * falla con un error feo de Postgres.
 *
 * Se validan igual en el navegador, y no por desconfianza de la base:
 * es para poder decirle al entrenador "la fila 47 dice 'pesas' y eso no
 * existe" ANTES de guardar 150 filas, en vez de que la carga se caiga a
 * la mitad. */
export const EQUIPOS = [
  'ninguno', 'mancuernas', 'banda', 'barra', 'maquina', 'polea',
  'kettlebell', 'banco'
]

export const NIVELES = ['principiante', 'intermedio', 'avanzado']

/* Cómo se escriben en pantalla. La base guarda 'jalon' sin tilde
 * —una tilde en un valor que se compara es una fuente de errores
 * silenciosos— pero al cliente se le muestra bien escrito. */
export const ETIQUETAS = {
  jalon:      'Jalón',
  maquina:    'Máquina',
  ninguno:    'Sin equipo',
  cardio:     'Cardio',
  core:       'Core'
}

export function etiqueta (valor) {
  if (!valor) return ''
  if (ETIQUETAS[valor]) return ETIQUETAS[valor]
  return valor.charAt(0).toUpperCase() + valor.slice(1)
}


/* ---------------------------------------------------------------------
   Normalizar: dejar el texto como lo espera la base
   ---------------------------------------------------------------------
   El entrenador va a escribir "Pecho", "PECHO" y "pecho " en la misma
   hoja, porque así escribe cualquiera. La base guarda un solo valor.

   Quita tildes a propósito: 'jalón' y 'jalon' tienen que caer en el
   mismo sitio. La forma rara (normalize + reemplazar) descompone cada
   letra acentuada en "letra + tilde suelta" y luego borra las tildes;
   es la manera estándar de hacerlo en JavaScript sin una tabla a mano.
   --------------------------------------------------------------------- */
export function normalizar (texto) {
  if (texto == null) return ''
  return String(texto)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/* El nombre es distinto: se conserva tal como él lo escribe, porque es
 * lo que va a leer el cliente. Solo se limpian los espacios de sobra,
 * incluidos los del medio — "Press  de   banca" y "Press de banca" son
 * el mismo ejercicio y el índice único de la base no lo sabría. */
export function limpiarNombre (texto) {
  if (texto == null) return ''
  return String(texto).replace(/\s+/g, ' ').trim()
}

/* La llave con la que se compara si dos filas son el mismo ejercicio.
 * La usa la carga masiva para no meter dos veces "Sentadilla goblet" y
 * "sentadilla  Goblet". */
export function claveNombre (texto) {
  return normalizar(limpiarNombre(texto))
}


/* ---------------------------------------------------------------------
   Validar una fila
   ---------------------------------------------------------------------
   Devuelve { valido, ejercicio, errores }. `errores` es una lista de
   frases en español, listas para mostrar: esta función alimenta tanto
   el formulario del panel como la vista previa de la carga masiva, y
   en los dos casos lo que se ve es una frase, no un código.
   --------------------------------------------------------------------- */
export function validarEjercicio (fila) {
  const errores = []

  const nombre     = limpiarNombre(fila.nombre)
  const grupo      = normalizar(fila.grupo)
  const movimiento = normalizar(fila.movimiento)
  const equipo     = normalizar(fila.equipo)
  const nivel      = normalizar(fila.nivel)

  if (!nombre) errores.push('Falta el nombre.')
  else if (nombre.length > 120) errores.push('El nombre es demasiado largo.')

  // Los dos obligatorios son nombre y grupo. El resto puede llegar
  // vacío: la hoja del entrenador no va a estar completa el primer día
  // y exigirle las seis columnas sería garantizar que no la mande.
  if (!grupo) errores.push('Falta el grupo muscular.')
  else if (!GRUPOS.includes(grupo)) {
    errores.push(`"${fila.grupo}" no es un grupo conocido.`)
  }

  if (movimiento && !MOVIMIENTOS.includes(movimiento)) {
    errores.push(`"${fila.movimiento}" no es un movimiento conocido.`)
  }
  if (equipo && !EQUIPOS.includes(equipo)) {
    errores.push(`"${fila.equipo}" no es un equipo conocido.`)
  }
  if (nivel && !NIVELES.includes(nivel)) {
    errores.push(`"${fila.nivel}" no es un nivel conocido.`)
  }

  return {
    valido: errores.length === 0,
    errores,
    // Lo que se le manda a la base. Los opcionales vacíos van como null
    // y NO como cadena vacía: el CHECK de `equipo` acepta null, pero
    // una cadena vacía no está en su lista y la rechazaría.
    ejercicio: {
      nombre,
      grupo,
      movimiento:   movimiento || null,
      equipo:       equipo     || null,
      nivel:        nivel      || null,
      indicaciones: (fila.indicaciones || '').trim() || null
    }
  }
}
