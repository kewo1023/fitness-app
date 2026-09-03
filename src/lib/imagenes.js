import { supabase } from './supabase.js'

/* =====================================================================
   imagenes.js — dónde vive la foto de un ejercicio
   =====================================================================

   Está separado de `ejercicios.js` por una razón práctica: aquel es
   lógica pura y se puede probar sin credenciales; este necesita la
   conexión. Mezclarlos haría que las pruebas del vocabulario dependieran
   de tener un `.env.local`, que no está en git.

   QUÉ SE GUARDA EN LA BASE. `ejercicios.imagen_url` guarda la RUTA
   dentro del bucket ("sentadilla-goblet.webp"), no la dirección
   completa.

   Por qué: la dirección completa lleva dentro el identificador del
   proyecto de Supabase. Si un día el proyecto cambia, con la ruta
   guardada se arregla aquí, en una línea; con la dirección completa
   habría que reescribir 150 filas.

   En Excel es la diferencia entre guardar el nombre del archivo y
   armar la ruta con una fórmula, o pegar la ruta absoluta en cada
   celda. Lo segundo funciona hasta que se mueve la carpeta.
   ===================================================================== */

export const BUCKET_IMAGENES = 'ejercicios'

export function urlDeImagen (ruta) {
  if (!ruta) return null

  // Aguanta que ya venga una dirección completa. Durante la carga masiva
  // alguien podría pegar una, y fallar por eso sería absurdo.
  if (/^https?:\/\//i.test(ruta)) return ruta

  const { data } = supabase.storage.from(BUCKET_IMAGENES).getPublicUrl(ruta)
  return data?.publicUrl || null
}
