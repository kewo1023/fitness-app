# La ronda del celular

Ocho pantallas de esta app nunca se han tocado en un teléfono, y todo lo
del 8 de septiembre —tres arreglos y la Fase 8 entera— solo se pudo
verificar hasta donde llega un computador.

**Esto no es opcional y no es un extra.** Los dos huecos más grandes de
este proyecto —el invitado sin salida y el entrenador sin códigos— no los
encontraron 250 pruebas ni seis sesiones de código. Los encontró Kev
usando la app veinte minutos como si fuera un cliente. Y el bug de los
dos perfiles apareció por abrir la misma cuenta en dos aparatos.

**El orden de las rondas importa.** La E depende de que la A haya
creado una cuenta, y dentro de la E el orden es el punto entero de la
prueba.

---

> **También existe como página con casillas**, para marcarla desde el
> teléfono en vez de leer este archivo. El enlace está en
> `CONTEXTO-LOCAL.md`, que git ignora: es privado de la cuenta de
> claude.ai. **Este archivo es la fuente**; si la lista cambia, cambia
> aquí primero.

## Antes de empezar

- [ ] **Perfil, abajo del todo, tiene que decir `v0.5.8`.** Si dice otra
      cosa, Vercel no ha terminado de publicar o el celular tiene una
      versión vieja en caché: cierra la app del todo y vuelve a abrirla.
- [ ] Un **Android**, que es el dispositivo de referencia (83% del
      público en Colombia), y un **iPhone** si lo hay: hay cosas que solo
      el iPhone puede decir.
- [ ] Un **código de invitación sin usar**. Se crean desde
      Perfil → Tu biblioteca → *Códigos para tus clientes*.
- [ ] Un **correo nuevo** para la cuenta de prueba. No uno real de nadie.
- [ ] Papel o notas a mano. Lo que falle hay que anotarlo mientras pasa,
      no reconstruirlo después.

**Con datos inventados, siempre.** Nada de probar con la información de
un cliente de verdad (regla 3 de PARAR en `CLAUDE.md`).

---

## Ronda A — el camino de un cliente nuevo

Es el único camino por el que entra todo el mundo, y donde vive el
arreglo del 8/09 que **solo el iPhone puede confirmar**.

- [ ] Crear cuenta con el correo nuevo.
- [ ] En la pantalla **"Ya casi"**, antes de escribir nada:
  - [ ] **El campo de fecha no se sale por la derecha.** Tiene que
        medir exactamente lo mismo que "Tu nombre" y terminar en el
        mismo sitio.
  - [ ] La fecha empieza **por la izquierda**, no centrada.
  - [ ] Las tres autorizaciones están separadas por **una raya** y se
        leen como tres decisiones, no como un texto largo con tres
        casillas.
  - [ ] Nada se ve amontonado. Era la queja del 8/09.
- [ ] Poner una fecha de **menor de 18** → tiene que aparecer el aviso de
      bloqueo con el botón de borrar la cuenta, y no dejar seguir.
- [ ] Volver a una fecha de mayor, dejar el **código vacío** y entrar →
      queda como **invitado**: ve ejercicios y recetas, no ve plan.
- [ ] Perfil → **"Tengo un código"** → canjear → pasa a **cliente** y
      aparece su plan en Hoy.

> Si el paso del código falla, para todo: es lo único que el commit del
> retiro de los retos pudo haber roto. En el SQL Editor,
> `select proname, pronargs from pg_proc where proname = 'vincular_con_codigo';`
> tiene que dar **una** fila con **2**.

---

## Ronda B — Tu registro (nuevo el 8/09)

- [ ] Perfil → Mis datos. Arriba del todo sale **"Tu registro"** con tu
      correo a la vista.
- [ ] Cambiar el **nombre** → Guardar → el saludo de Hoy cambia sin
      cerrar sesión.
- [ ] Tocar Guardar **sin cambiar nada** → dice "No cambiaste nada" y no
      manda ningún correo.
- [ ] Cambiar el **correo** y leer lo que responde la app:
  - Si habla de un enlace → **ábrelo desde el correo NUEVO**, y hasta
    entonces sigues entrando con el viejo.
  - Si dice "listo" → cierra sesión y entra con el nuevo.
  - **Los dos son correctos.** Depende de cómo esté configurado
    Supabase; lo que se está probando es que la app diga el que es.
- [ ] **Contraseña**: "Cambiar mi contraseña", escribir dos **distintas**
      → tiene que negarse. Luego dos iguales → cambia, y hay que poder
      entrar con la nueva.
- [ ] **Descargar mis datos** → abrir el archivo → tiene que traer una
      línea `"correo"`. Hasta el 8/09 no la traía.
- [ ] El rol y "en la app desde" están a la vista y **no se pueden
      editar**. Es correcto: el rol lo da el código, no la persona.

---

## Ronda C — los logros

- [ ] Perfil, con la cuenta que ya tenga logros: **salen todos con la
      insignia "nuevo" a la vez.** Es una puesta al día de una sola vez,
      no un fallo: hasta ayer nadie los marcaba.
- [ ] Quedarse **más de dos segundos** en Perfil, salir a otra pestaña y
      volver → ya no dicen "nuevo".
- [ ] **Pasar de largo**: entrar a Perfil y tocar enseguida "Tu
      biblioteca" o "Mis datos" (menos de dos segundos). Al volver, la
      insignia **sigue puesta**. Ese es el motivo de los dos segundos.
- [ ] La de verdad: terminar un entrenamiento que dé un logro nuevo y
      verlo aparecer marcado.

---

## Ronda D — un entrenamiento entero, CON señal

- [ ] Hoy → **Empezar entrenamiento**.
- [ ] Anotar **cuatro series**, con peso y repeticiones.
- [ ] **Salir de la app a la mitad** y volver → lo anotado sigue ahí.
- [ ] **Corregir** una serie ya anotada → se queda el valor nuevo.
- [ ] Terminar → sale el XP con su número y la racha sube.

---

## Ronda E — sin señal. La nueva, la más larga y la que importa

**El orden es la prueba.** Saltarse un paso la invalida.

- [ ] 1. **Con señal**, abrir Hoy y esperar a que cargue del todo. Esto
      es lo que guarda el paquete en el teléfono.
- [ ] 2. **Modo avión.**
- [ ] 3. **Cerrar la app del todo** y volver a abrirla.
- [ ] 4. Sale tu rutina, con un aviso gris arriba: *"Sin conexión. Esto
      es tu rutina guardado hoy…"*.
      - **Si dice "tu entrenador todavía no te asignó un plan", el
        arreglo del paso 1 no funcionó.** Era exactamente el bug.
- [ ] 5. **Empezar entrenamiento**, sin señal.
- [ ] 6. Anotar **tres series**.
- [ ] 7. **Cerrar la app del todo, TODAVÍA en avión, y volver a
      abrirla.** ← este es el caso que casi se queda fuera del diseño.
- [ ] 8. Tiene que ofrecer **"Seguir entrenamiento"** y las tres series
      siguen anotadas.
      - Si dice "Empezar" otra vez, para: darle crearía un **segundo**
        entrenamiento del mismo día.
- [ ] 9. Anotar una serie más y **corregir** una de las anteriores.
- [ ] 10. **Terminar.** Tiene que decir *"guardado en este teléfono. Se
      sube solo, y el XP entra, en cuanto haya señal"* — **sin ningún
      número de XP.** Si dice un número, se lo inventó.
- [ ] 11. En Hoy sale *"Te falta subir 1 entrenamiento y 4 series."*
- [ ] 12. **Quitar el modo avión y no tocar nada más.** En unos segundos
      el aviso desaparece solo y sale *"Ya subimos lo que hiciste sin
      señal"*. El XP aparece ahí.
- [ ] 13. En el SQL Editor, comprobar lo único que no se ve en pantalla:

```sql
select id, plan_dia_id, iniciada_en, terminada_en, completada
  from sesiones order by id desc limit 3;
```

  - [ ] **`iniciada_en` es la hora en que entrenaste, no la de cuando
        subió.** Si fuera la de la subida, un entrenamiento de la noche
        aparecería al día siguiente y movería la racha de esa semana.
  - [ ] Hay **una sola** sesión de ese día del plan, no dos.
  - [ ] Las cuatro series están, y la corregida con su valor nuevo.

---

## Ronda F — perder la señal a mitad (la más fina)

Es el caso más común de todos: el gimnasio tiene cobertura en la entrada
y no en el sótano de las pesas.

- [ ] Empezar **con señal** y anotar una serie.
- [ ] **Modo avión**, anotar dos más.
- [ ] **Terminar** en avión.
- [ ] Quitar el avión → sube todo, y **no queda una sesión duplicada**.

---

## Ronda G — dos personas, un celular

Vale poco tiempo y cubre lo que sostiene la privacidad del caché.

- [ ] Con la cuenta de prueba cargada y su rutina a la vista, **cerrar
      sesión**.
- [ ] **Modo avión** y abrir la app.
- [ ] No puede aparecer ni un rastro de la rutina anterior. Si aparece,
      el borrado al cerrar sesión no corrió.

---

## Ronda H — lo que solo el iPhone puede decir

- [ ] **La barra de abajo no se sube** al hacer scroll hacia arriba y
      hacia abajo. Es el cambio de estructura del 4/09 y **nunca se ha
      verificado en iOS**.
- [ ] El campo de fecha de la ronda A.
- [ ] **Los avisos solo funcionan con la app agregada a la pantalla de
      inicio.** Desde Safari no llegan, y la app tiene que decirlo así,
      con el cómo, no con un "no disponible".

---

## Ronda I — las notificaciones

Es lo único de la Fase 7 que nunca se ha probado de punta a punta.

- [ ] Perfil → **Avisos** → activar. Aceptar el permiso del sistema.
- [ ] Elegir una **franja** (mañana, tarde o noche).
- [ ] Disparar la Edge Function a mano y **ver llegar la notificación**
      al teléfono.
- [ ] Tocarla → abre la app, y **no** abre una segunda copia si ya
      estaba abierta.

---

## Las ocho pantallas que nunca se han tocado en un teléfono

Al pasar por ellas, mirar solo tres cosas: que nada se salga por la
derecha, que ningún campo haga zoom al tocarlo (regla 4), y que se pueda
llegar a los botones con el pulgar.

- [ ] Carga masiva (Tu biblioteca → pegar una hoja)
- [ ] Portada de Ejercicios por grupo muscular
- [ ] Rutinas (el constructor)
- [ ] Plantillas (la rejilla de semanas × días)
- [ ] Asignar plan
- [ ] Invitaciones (crear códigos)
- [ ] Cómo van tus clientes
- [ ] Créditos

---

## Si algo falla

Anotarlo mientras pasa, con estas cuatro cosas. Sin ellas cuesta el
doble encontrarlo:

1. **Qué aparato y qué versión** (la de Perfil).
2. **Qué pantalla** y qué estabas haciendo.
3. **Qué esperabas** y qué salió.
4. **Si había señal o no**, y si la app se había cerrado en medio.

Lo que salga de aquí va a `BITACORA.md` el mismo día, con su porqué. Es
lo que ha hecho que los bugs de este proyecto se arreglen una sola vez.
