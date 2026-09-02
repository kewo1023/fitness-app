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

createRoot(document.getElementById('raiz')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
