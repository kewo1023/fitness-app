import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { aplicarCapacidades } from './lib/dispositivo.js'
import { aplicarTema, temaActual } from './lib/tema.js'
import './styles/theme.css'   // primero las variables...
import './styles/app.css'     // ...y después quien las usa

// Antes de pintar nada: decidir en qué nivel de decoración corre este
// celular. Va aquí y no dentro de un componente para que el <html> ya
// tenga el atributo cuando el CSS se aplique por primera vez; si no, la
// barra se vería con vidrio un instante y luego sin él.
aplicarCapacidades()

// El TEMA ya lo puso el script del <head> de index.html, antes de que el
// navegador pintara nada. Esta llamada no lo cambia: lo vuelve a
// aplicar ahora que theme.css ya está cargado, y así --fondo existe y
// se puede copiar al color de la barra de estado del celular. Ese es
// todo el trabajo que hace aquí.
aplicarTema(temaActual())

/* ---------------------------------------------------------------------
   El service worker (public/sw.js)
   ---------------------------------------------------------------------
   Qué hace y qué NO hace está explicado dentro de ese archivo. Aquí
   solo se decide CUÁNDO se registra, y las dos condiciones tienen
   razón de ser:

   `import.meta.env.PROD` — en desarrollo no se registra. Vite recarga
   los módulos en caliente y un service worker en medio sirve el
   archivo viejo: se editaría un componente, no cambiaría nada en
   pantalla, y se perdería la tarde buscando el error en el sitio
   equivocado.

   `load` — se espera a que la página termine de cargar. Registrarlo
   antes lo pone a competir por la red con los archivos que el usuario
   está esperando para ver algo. El service worker no aporta nada en la
   PRIMERA visita: sirve a partir de la segunda, así que puede esperar.

   El `catch` vacío no es descuido. Esto falla de formas que no son
   culpa de nadie —modo incógnito, permisos de almacenamiento
   apagados— y en todas la app funciona igual de bien sin él. Un error
   en rojo en la consola haría pensar que algo se rompió.
   --------------------------------------------------------------------- */
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

createRoot(document.getElementById('raiz')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
