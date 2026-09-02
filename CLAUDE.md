# CLAUDE.md — contexto del proyecto

Archivo de contexto para Claude. **Léelo antes de proponer nada**, y lee
también `BITACORA.md`: ahí están las decisiones ya tomadas y por qué.

## Qué es esto

Una app de entrenamiento para **un entrenador colombiano y sus clientes**.
Rutinas guiadas con videos cortos, programas por objetivo, recetas y
gamificación. La referencia es silBe (`id1631277320` en la App Store), a
menor escala.

**Arranca con 6 a 15 clientes, pero el objetivo es que el entrenador llegue
a más.** Eso no es un detalle de marketing: es un requisito técnico. Las
decisiones que cuestan lo mismo hoy y son caras después —cómo se escriben
las políticas de RLS, qué columnas llevan índice, si existe
`perfiles.entrenador_id`— se toman ya pensando en el número grande. Lo que
NO se construye por adelantado es la app multi-entrenador: ese es otro
producto y se decide cuando exista el segundo entrenador.

**El nombre todavía no existe.** Se decide con el entrenador. Hasta
entonces la carpeta se llama `fitness-app` y así se queda.

Doble propósito, y los dos importan:

1. **Es una herramienta real** para un entrenador. Cómo entrega hoy las
   rutinas todavía no se sabe: es la pregunta 1 del cuestionario. Si no le
   sirve a él, fracasó.
2. **La capa de analítica va en SQL dentro de Postgres**, no en JavaScript.
   Es una decisión deliberada y no se sacrifica cuando falte tiempo — ver
   "La capa de analítica" abajo.

Hoja de ruta: 9 fases, ~94 h. El desglose está en `BITACORA.md`; el enlace
al documento vive en `CONTEXTO-LOCAL.md`, que no se versiona.

## Cómo trabajar en este proyecto

- El código y los comentarios van en **español**, explicando el *porqué*.
- **Evaluar antes de construir.** Ante una función nueva: utilidad, fricción,
  impacto en el código existente, y lo que no se ve (límites de plataforma).
  Ser propositivo, no solo evaluador.
- Plan corto -> confirmar -> ejecutar de corrido.
- Hay un `CLAUDE.local.md` fuera de git con el contexto personal y de negocio.

## El dato que cambia todo: están en Colombia

El entrenador y el 95% de sus clientes viven en Colombia. Eso tiene cuatro
consecuencias que **no se pueden olvidar a mitad de
una sesión**:

1. **El público es Android, no iPhone.** 83,28% contra 16,72% (Statcounter,
   julio 2026). El iPhone NO es el dispositivo de referencia: todo se prueba
   primero en un Android real.
2. **Las notificaciones push sí existen.** En Android una PWA instalada las
   recibe nativamente. Es la palanca de retención más grande del proyecto.
3. **La zona horaria es `America/Bogota`** (UTC−5, sin horario de verano).
   El desarrollo se hace desde una zona que sí lo tiene. Ver la regla 5.
4. **El marco legal es colombiano.** Ley 1581 de 2012, Ley 73 de 1979 y
   Ley 2210 de 2022. Ver la sección de PARAR.

## PARAR — cuatro cosas que no se hacen sin frenar antes

Ninguna necesita que nadie la invoque. Si aparecen, se frena y se dice.

### 1. Planes de alimentación personalizados por cliente

La Ley 73 de 1979 protege el título de nutricionista-dietista en Colombia
(título universitario + ReTHUS + tarjeta de COLNUD). Diseñar el plan
alimentario individual de una persona es función reservada, y el ejercicio
ilegal de una profesión de la salud allá es materia penal, no una multa.

**La línea:** información general y planes genéricos por objetivo, iguales
para todos → sí. Asignar o calcular un plan para *una persona* según su peso,
su meta o su condición → no, salvo que un nutricionista con tarjeta lo firme.

Tampoco usar en la interfaz las palabras "nutricional", "nutricionista",
"plan nutricional" ni "asesoría nutricional". La sección se llama
**Recetas y hábitos**.

### 2. Datos sensibles sin la autorización que exige la Ley 1581

Los datos de salud son sensibles. La ley exige autorización explícita **y**
informarle al titular que responder esas preguntas es **facultativo**. Eso es
diseño de producto, no un párrafo en un PDF:

- Todo campo de salud va marcado como opcional, y de verdad se puede dejar
  vacío sin bloquear nada.
- Finalidades separadas en la autorización, no una casilla que lo abarca todo.
- Tiene que existir la pantalla "Mis datos": descargar, corregir, eliminar.
  Esa pantalla es el canal de habeas data (consulta: 10 días hábiles;
  reclamo: 15).
- **Nada de fotos de progreso en la v1.** Es el dato más sensible y el que
  menos aporta al principio.

Lo que sí está resuelto y no hay que volver a discutir: alojar los datos en
Estados Unidos es legal. La SIC declaró a EE. UU. país con nivel adecuado en
la Circular Externa 005 de 2017.

### 3. Datos reales de clientes en el repo

**El repo es público.** Volver público un repo expone TODO el historial, no
el estado de hoy, y aquí el historial podría llevar datos de salud de
terceros. Lo mismo aplica al contexto personal: lo que no deba leer un
tercero va a `CLAUDE.local.md`, que git ignora.

Por eso: cero datos reales en el código, seed con nombres inventados,
`.env.local` ignorado desde antes del primer commit. Si alguna vez hay que
depurar con datos reales, se hace contra la base, nunca pegándolos en un
archivo.

### 4. Cobrar

El día que se hable de cobrar cambian tres cosas: el plan de Vercel (el
gratuito es para uso personal), las reglas de las tiendas, y las obligaciones
fiscales y legales de quien recibe el dinero. Eso último no lo resuelve
Claude: toca un profesional, y se habla ANTES de cobrar el primer peso.

Mientras la app sea gratis, nada de esto aplica.

## Stack

React 18 + Vite 5 + CSS plano con variables (sin Tailwind, a propósito) +
Supabase. PWA instalable. Publicada en Vercel.

```
npm run dev      # servidor local en :5173 (host:true, se abre desde el celular)
npm run build    # verificar que compila antes de dar algo por hecho
npm run test     # Vitest
git push         # publica en Vercel: republica solo con cada push
```

**En producción:** https://fitness-app-ivory-mu.vercel.app
**Repo (PÚBLICO):** github.com/kewo1023/fitness-app — público a propósito, es
público a propósito. Por eso la regla 3 de PARAR: ni un dato real de un
cliente, ni contexto personal, entra aquí.

**Dónde vive el proyecto:** fuera de cualquier carpeta que sincronice iCloud.
Un repo dentro de iCloud ya rompió git antes (`unable to map index file`).

- **Supabase en `us-east-1`** (Virginia): mejor latencia hacia Colombia que
  São Paulo, y legal por la Circular 005.
- **Video en Bunny Stream**, no en Supabase Storage. Supabase da 1 GB gratis
  (se acaba en ~130 clips) y no transcodifica. Bunny cuesta ~$1–2/mes con
  200 clips y 20 clientes.
- **Sin TypeScript.** Igual que `nosotros-app`.

## Reglas del código

No son preferencias. Son las que sostienen el proyecto:

1. **Ni un color literal fuera de `theme.css`.** Todo sale de `var(--...)`.
   Una sola excepción, comentada en su sitio: el `theme-color` de
   arranque en `index.html`. Es el valor que usa la barra de estado
   antes de que la hoja de estilos exista, así que no hay variable de
   dónde sacarlo. Dura milisegundos y `tema.js` lo reemplaza.
2. **Comentarios que explican el PORQUÉ, no el qué.** El código está
   comentado para que se pueda aprender leyéndolo. Si escribes algo no obvio,
   explica la razón y usa una analogía de Excel si ayuda.
3. **Ningún texto visible habla de "tablas", "sesiones", "RLS" ni
   "Supabase".** Lo que sale en pantalla lo leen el entrenador y sus
   clientes. El detalle técnico de un error va a la consola.
4. **Ningún campo por debajo de 16 px.** Safari del iPhone hace zoom solo al
   tocar un input con letra menor, y al salir NO lo deshace. Costó un bug
   real en `nosotros-app` el 21/08/2026.
5. **Fechas: siempre en hora de Bogotá.** Se guarda en UTC y se convierte a
   `America/Bogota` para decidir qué día es. **Nunca `new Date()` suelto**
   para saber "hoy". El desarrollo se hace desde una zona con horario de
   verano y Bogotá no lo tiene: dos veces al año la diferencia cambia en una
   hora.
   Si esto se hace mal, se rompen rachas que el usuario sí completó. Va una
   sola función, `hoyBogota()`, usada en toda la app.
6. **Rejillas de dos columnas: `minmax(0, 1fr)`, nunca `1fr` a secas.**
7. **Respeta el área segura** (`var(--sat)` / `var(--sab)`).
8. **Verifica antes de afirmar.** Compila, y revisa en un **Android** real o
   con el viewport en móvil. No des nada por hecho sin haberlo visto.
9. **Tutoriales de herramientas: busca la documentación oficial actual.** Las
   interfaces cambian; un tutorial de memoria le hace perder la tarde.
10. **Vitest desde la Fase 2**, sobre la lógica que puede hacer daño:
    permisos, cálculo de progreso, XP y fechas en hora de Bogotá.
11. **Los niveles de decoración cambian SOLO cómo se ve la app.** Nunca qué
    se puede hacer, ni el orden, ni los textos. `data-nivel` en el `<html>`
    vale `alto`, `medio` o `bajo`, y cada nivel redefine tres variables en
    `theme.css` (`--desenfoque`, `--entrada`, `--sombra`). Si alguna vez un
    nivel esconde un botón, se rompió la regla: el entrenador terminaría
    explicándole a un cliente por qué su app es distinta a la de otro.
12. **El tema sale de `data-tema` en el `<html>`, nunca de una
    `@media (prefers-color-scheme)`.** Desde que existe el botón, la
    preferencia del sistema es solo el valor INICIAL. Si además quedara
    una media query, alguien con el sistema en oscuro que elija claro
    tendría media app de cada color. Por eso en `theme.css` no hay ni
    una sola media query de color, y por eso el `theme-color` de la
    barra de estado se lee de `--fondo` en vez de escribirse a mano.
13. **Animar solo `opacity` y `transform`.** Son las dos propiedades que el
    celular resuelve en la tarjeta gráfica sin rehacer el diseño de la
    página. `height`, `top` o `filter` obligan a recalcular el cuadro
    entero, y es la causa número uno de que una web se sienta lenta en un
    celular.

## Mapa del código

```
index.html               viewport-fit=cover, el theme-color de la barra
                         de estado, y el script suelto que aplica el
                         tema ANTES de pintar. Ese script está ahí a
                         propósito: si fuera un módulo se vería un
                         fogonazo blanco al abrir en oscuro.
src/main.jsx             El arranque. theme.css va ANTES que app.css.
src/App.jsx              El cerebro. Decide QUÉ PANTALLA se ve, que
                         sale de dos datos: hay sesión, y hay perfil.
                         Son cuatro estados y el tercero es el que
                         sostiene la seguridad — ver el comentario.
src/data/
  fechas.js              TODO lo de "qué día es" pasa por aquí. hoyBogota(),
                         diaEnBogota(), inicioSemanaBogota(). Ver regla 5.
  fechas.test.js         14 pruebas. Se corren con npm run test.
  mock.js                Datos FALSOS, nombres inventados. SE VA
                         ENCOGIENDO: cada vez que una pantalla se
                         conecta a la base, su parte se borra el mismo
                         día. Ya no tiene RECETAS.
src/lib/supabase.js      La conexión. Falla temprano y en claro si
                         faltan las credenciales.
src/lib/consentimientos.js
                         Los textos de la Ley 1581, su versión, y la
                         traducción de los errores de Supabase.
src/lib/gamificacion.js  XP y niveles. Solo LEE el número: el XP lo suma
                         un trigger en la base.
src/hooks/useSesion.js   Quién está usando la app. Devuelve sesion y
                         perfil, que NO son lo mismo.
src/sections/Acceso.jsx  Entrar o crear cuenta. Solo correo y clave.
src/sections/Activar.jsx Nombre, código opcional y consentimientos.
src/sections/MisDatos.jsx
                         Habeas data: conocer, actualizar, suprimir.
src/sections/            Una por pestaña: Hoy, Programas, Progreso,
                         Recetas, Perfil.
src/components/
  Navegacion.jsx         La barra de abajo. Respeta var(--sab).
  Pantalla.jsx           El envoltorio con el encabezado. Lo usan las cinco
                         secciones para que los márgenes se escriban una vez.
  Iconos.jsx             Los cinco iconos, como SVG a mano. Sin librería:
                         traería cientos para usar cinco.
src/lib/dispositivo.js   Decide el NIVEL de decoración (alto/medio/bajo)
                         mirando RAM y núcleos, y lo escribe como
                         data-nivel en el <html>.
src/lib/tema.js          Claro u oscuro. Guarda la elección en el
                         celular (localStorage), no en la base: el tema
                         se aplica antes de saber quién entró.
src/components/BotonTema.jsx
                         El botón discreto del encabezado.
src/styles/theme.css     SOLO variables. Claro y oscuro (por data-tema,
                         sin @media), más los tres niveles.
README.md                La cara pública del repo. Cuenta el problema (un
                         entrenador que manda PDFs y no sabe quién entrenó),
                         no la lista de funciones.
src/styles/app.css       Todos los estilos.
supabase/01-esquema.sql  Las 19 tablas.
supabase/02-politicas.sql RLS + los índices que la sostienen. Sin esto
                         la base está abierta.
supabase/03-funciones.sql Invitaciones, clonar plantilla, XP y habeas
                         data. Todo lo que el cliente necesita HACER
                         pero no puede tener permiso para hacer.
supabase/04-ejemplo.sql  La biblioteca de prueba, con contenido
                         inventado. No siembra clientes.
```

Dónde va a entrar lo que sigue: la Fase 2 mete `src/lib/supabase.js`,
`src/hooks/` y las pantallas de acceso; la Fase 3 reemplaza el cuadro gris
de `.ejercicio-video` por el video real de Bunny.

## La base de datos

Esquema cerrado en `supabase/01-esquema.sql`, con las respuestas del
entrenador del 1/09. 19 tablas.

**La decisión que manda sobre todo el modelo: cada cliente tiene su propia
rutina.** No hay catálogo de programas al que la gente se inscribe. El plan
cuelga del cliente (`planes` + `plan_dias`), uno por persona.

Y por eso existen las **plantillas**: con 6 a 15 clientes, armar cada plan de
4 semanas desde cero sería más lento que el PDF que él usa hoy. La plantilla
es el molde que copia y ajusta. **Al copiarla queda independiente** — si
después cambia el molde, los planes ya entregados no se mueven. Nadie quiere
que a un cliente le cambie sola la rutina de ayer.

Otros puntos que ya se decidieron y hay que respetar:

- **`planes.meta_semanal` es por cliente, no una constante.** Los días a la
  semana varían según la persona. La racha se calcula contra ese número.
- **`ejercicios.video_id` es opcional y va a estar vacío mucho tiempo.** El
  entrenador arranca con imágenes y va reemplazando poco a poco. Toda
  pantalla que muestre un ejercicio tiene que verse bien sin video.
- **Bunny está aplazado.** Las imágenes van a Supabase Storage; Bunny entra
  cuando haya video de verdad. La regla de "el video NO vive en Supabase"
  sigue en pie para cuando llegue.
- **Los ejercicios se agrupan por DOS ejes**, `grupo` y `movimiento`, porque
  así los piensa él. No colapsarlos en uno.

- **RLS activo en todas las tablas, desde el primer día.** Un cliente jamás
  ve datos de otro. Toda política se apoya en el rol del perfil.
- **Toda política se escribe `(select auth.uid())`, nunca `auth.uid()` a
  secas.** Envuelta en un `select`, Postgres la resuelve una vez por
  consulta; suelta, una vez por fila. No es un detalle de estilo: es la
  diferencia entre que la app aguante crecer o no.
- **Las columnas que aparecen en una política necesitan índice.** Una
  política es un `WHERE` invisible pegado a todas las consultas de esa
  tabla. Cada política nueva viene con su índice o no está terminada.
- **Estar autenticado y tener perfil son cosas distintas.** El registro
  queda abierto y la confirmación de correo apagada; lo que da acceso es el
  código de invitación, que canjea `vincular_con_codigo` y es lo único que
  crea la fila en `perfiles`. Sin perfil no se ve absolutamente nada.
  **No poner un trigger que cree el perfil al registrarse:** eso convierte
  el código de invitación en adorno.
- **El XP nunca lo escribe la app.** Lo suma un trigger al completar una
  sesión, y un permiso por columna impide escribir `perfiles.xp` desde el
  navegador. Todo lo que corre en el navegador lo puede reescribir quien
  tenga el navegador.
- **`perfiles.entrenador_id` existe y todavía no la usa ninguna política.**
  Se llena al canjear la invitación. Es la semilla para el día que haya un
  segundo entrenador: sin ella, ese día tocaría adivinar qué cliente era de
  quién.
- **Dos roles: `admin` y `cliente`.** Hay dos administradores.
- **Nada de registro abierto.** Se entra por código de invitación, con
  funciones RPC. El correo integrado de Supabase manda 2 por hora.
- Las credenciales van en `.env.local` (ignorado por git). **El prefijo
  `VITE_` es obligatorio**: Vite solo expone al navegador las que empiezan
  así.
- **El video NO vive en Supabase** cuando llegue: la tabla guarda un
  `video_id` de Bunny. Las imágenes sí van a Storage.

## La capa de analítica

Es la parte que más fácil se recorta cuando falta tiempo, y la que no se
debe recortar:

- **La analítica va en SQL**, con vistas y funciones en Postgres: adherencia
  por cliente, retención semana a semana, ejercicios más saltados, hora
  típica de entrenamiento. No con bucles en JavaScript.
- **Rachas, XP y adherencia se calculan en la base**, no en el navegador.
- **La pantalla "Mis datos" es gobernanza implementada**, no un PDF.
- **El README cuenta el problema, no las funciones.**

## Estado (2 de septiembre de 2026)

**Fases 1 y 2 cerradas.** La base de datos existe y está protegida; la app
tiene acceso por cuenta, tres roles y la Ley 1581 implementada. Todo
verificado contra producción: se creó un visitante desde la app, se
comprobó qué ve, se guardaron y descargaron sus datos, y se eliminó la
cuenta. 32 pruebas pasan.

**En curso: Fase 3 — la biblioteca de ejercicios.** Panel del entrenador,
carga masiva desde hoja de cálculo e imágenes en Supabase Storage. El
detalle está en `BITACORA.md` y lo que depende de la cuenta, en
`PASOS-FASE-3.md`.

**Qué está conectado a la base y qué no:** Acceso, Activar, Mis datos,
Perfil y Recetas son reales. `Hoy` tiene el saludo real y el resto de
mock; `Programas` y `Progreso` siguen en mock. Se conectan en las Fases 4
y 5. `mock.js` no se borra de golpe: **cada pantalla que se conecta borra
su parte el mismo día.**

**Dos pendientes que no bloquean la Fase 3 pero sí la difusión:**

1. **Nadie ha visto la app en un Android real.** El público es 83%
   Android. Hay que sentir los formularios, el teclado tapando el botón de
   entrar, y si el vidrio de la barra va a tirones; si va mal, se sube el
   umbral de `nivelDetectado()` en `src/lib/dispositivo.js`.
2. **Falta la puerta de edad.** Con registro abierto entran menores, y el
   artículo 7 de la Ley 1581 prohíbe tratar sus datos salvo excepciones.
   El artículo 12 del Decreto 1377 sigue sin verificar. **Antes de darle
   la URL a desconocidos, esto se resuelve.**

**No se publica en tiendas por ahora** (decisión del 1/09): la instalación
es desde el navegador. La Fase 9 se aparca, pero la puerta sigue abierta.

## Cómo retomar

1. Leer `BITACORA.md` (el estado y el siguiente paso están al final) y
   `CONTEXTO-LOCAL.md`.
2. `npm install && npm run dev`. Verificar con `npm run test` que las **32
   pruebas** siguen pasando antes de tocar nada.
3. **Comprobar que `.env.local` existe.** No está en git y sin él la app
   no arranca: lanza un error explícito en la consola. Las dos variables
   y de dónde salen están en `PASOS-FASE-2.md`, pasos 4 y 5.
4. Leer `supabase/01-esquema.sql` y `02-politicas.sql` antes de tocar la
   base: los comentarios explican por qué cada tabla y cada política están
   como están. **La base YA ESTÁ CORRIDA** — los archivos son
   repetibles, pero cualquier cambio nuevo va en un archivo nuevo, no
   editando los que ya se corrieron.
5. Revisar las preguntas abiertas al final de `BITACORA.md` antes de
   construir algo que dependa de ellas.

**Cómo se prueba que los permisos siguen bien.** Es el ritual de este
proyecto y se repite cada vez que se agrega una tabla o una pantalla:
suplantar a un cliente y a un visitante en el SQL Editor y contar qué ve
cada uno. Está escrito paso a paso al final de `PASOS-FASE-2.md` (paso 8)
y al final de `02-politicas.sql`. **Si el visitante ve lo mismo que el
cliente, la app quedó gratis sin querer.**

## Cosas ya decididas — no volver a proponerlas

Están en `BITACORA.md` con su razón. Las que más se tienden a reproponer:

- Tailwind (CSS plano con variables, igual que `nosotros-app`).
- React Native o Flutter (rehacer todo en un stack nuevo).
- Next.js (no hace falta render en servidor).
- Firebase (NoSQL; el proyecto se apoya en SQL a propósito).
- Guardar los videos en Supabase Storage.
- YouTube oculto para los videos (marca ajena y recomendados encima).
- Pagar Google Play o la App Store ahora. La instalación va desde el
  navegador.
- Un catálogo de programas al que los clientes se inscriben. Cada cliente
  tiene su propia rutina; ese fue el dato del entrenador.
- Meta semanal fija para todos (varía por cliente).
- Chat de comunidad (es una app dentro de la app, con moderación y datos de
  terceros cruzándose).
- Racha diaria (castiga el descanso, que es lo contrario de lo que un
  entrenador quiere; va semanal).
- Tabla de posiciones obligatoria con nombres reales.
- Fotos de progreso en la v1.
- Registro abierto con correo. (El registro en Supabase sí queda abierto,
  pero no da acceso a nada: el acceso lo da el código de invitación.)
- Un trigger que cree el perfil al registrarse. Deja el código de
  invitación sin función.
- Multi-entrenador (cada entrenador con su propia biblioteca y sus
  clientes). Es otro producto. La columna `entrenador_id` ya está puesta
  para que ese día no cueste una arqueología.
