# Cerrar la Fase 1 — publicar la app

Tiempo: unos 25 minutos la primera vez. Después, actualizarla es un
`git push` y toma 20 segundos.

**Qué vamos a hacer:** poner el código en GitHub y conectarlo a Vercel, que
le da a la app una dirección `https://...` real. Esa dirección es la que se
abre en el celular y se agrega a la pantalla de inicio.

**Por qué hace falta una dirección web:** tanto Android como iPhone solo
dejan "instalar" páginas que vengan de una URL segura (https). Un archivo
suelto en el computador no sirve, y la IP local de la red tampoco:
solo funciona mientras tu Mac esté prendido y en el mismo wifi.

Verificado contra la documentación oficial de GitHub y Vercel el 1 de
septiembre de 2026.

---

## Antes de empezar: decide qué se hace público

El repo es **público**. Antes del primer commit
vale la pena mirar qué entra, porque **el historial de git no se puede
limpiar de verdad**: borrar un archivo después y hacer un commit encima no
lo saca, queda en los commits viejos y cualquiera lo lee.

Lo que ya está protegido en `.gitignore`: `.env.local`, `node_modules/`,
`dist/`, `.DS_Store`.

**Lo que yo sacaría:** `preguntas-para-el-entrenador.pdf`. No tiene datos
personales, pero es un documento interno que pregunta por la tarjeta
profesional de una persona concreta. No aporta al repo y expone algo que a un
tercero no le tienen por qué leer. Si estás de acuerdo,
antes del paso 1:

```bash
echo "preguntas-para-el-entrenador.pdf" >> .gitignore
```

Si prefieres dejarlo, no pasa nada grave. Es tu decisión, pero tómala
**ahora**, no después del push.

---

## Paso 0 — El proyecto no puede vivir en una carpeta sincronizada

Un repo dentro de iCloud Drive rompe git: aparece
`unable to map index file: Operation timed out`, sobre todo con el disco
lleno. Además `node_modules` son decenas de miles de archivos que no tiene
sentido sincronizar — se regeneran con `npm install`.

Si ya pasó:

```bash
mv .git/index /tmp/index-roto && git reset
```

La solución de fondo es mover el proyecto a una carpeta que iCloud no toque,
por ejemplo `~/Developer`. Efecto medido al hacerlo: el build pasó de 30 s a
343 ms.

---

## Paso 1 — Crear el repositorio local

Un repositorio es la carpeta del proyecto con su historial de cambios.
`git init` lo empieza; `-b main` hace que la rama principal se llame `main`
(tu git no tiene un valor por defecto configurado, así que hay que decirlo).

```bash
cd ruta/a/fitness-app && git init -b main
```

Ahora mira **exactamente** qué se va a subir. Este paso no es de relleno:
es la última oportunidad de ver la lista completa antes de que quede en el
historial para siempre.

```bash
git add . && git status --short
```

Deberías ver los archivos del proyecto y **nada** de `node_modules/`,
`dist/` ni `.env`. Si aparece alguno, párate aquí y avísame.

---

## Paso 2 — El primer commit

Un commit es una foto del proyecto en este momento, con un mensaje que
explica qué hay dentro.

```bash
git commit -m "Fase 1: esqueleto, sistema visual y navegación"
```

**Sobre el mensaje:** describe *qué cambió y por qué*, no *qué archivos*.
"Fase 1: esqueleto..." le sirve a quien lea el historial dentro de seis
meses; "cambios" o "update" no le sirven a nadie, ni a ti.

---

## Paso 3 — Subirlo a GitHub

Con `gh` instalado y la sesión iniciada, esto es **un solo comando** — no hace falta entrar a la web a crear el repo
a mano.

```bash
gh repo create fitness-app --public --source=. --remote=origin --push
```

Qué hace cada parte:

- `--public` — el repo es público, a propósito.
- `--source=.` — usa esta carpeta como origen, en vez de crear una vacía.
- `--remote=origin` — le enseña a tu carpeta dónde vive la copia en línea.
  "origin" es solo el apodo, es la convención.
- `--push` — sube lo que ya tienes commiteado.

Al terminar imprime la URL. Ábrela y confirma que están los archivos y que
**no** está `node_modules`.

> Si algún día prefieres el camino de la web: creas el repo en
> `github.com/new`, **sin marcar** README, .gitignore ni licencia (si los
> marcas, GitHub crea commits que chocan con los tuyos), y luego
> `git remote add origin <URL>` y `git push -u origin main`.

---

## Paso 4 — Conectar Vercel

Vercel toma el código de GitHub, lo compila y lo publica. Gratis para esto.

1. Entra a **vercel.com/new**
2. Si es la primera vez, conecta tu cuenta de GitHub. Vercel te va a pedir
   permiso sobre los repos: puedes darle acceso **solo a `fitness-app`**, no
   a todos. Prefiere eso.
3. En la lista de repositorios, busca `fitness-app` y dale **Import**
4. **No cambies nada** en la pantalla de configuración. Vercel reconoce Vite
   solo y ya sabe que el comando es `npm run build` y que el resultado queda
   en `dist`. Si te muestra un campo de variables de entorno, déjalo vacío:
   todavía no hay ninguna.
5. **Deploy**

Tarda un par de minutos. Al final te da una dirección tipo
`https://fitness-app-xxxx.vercel.app`.

**A partir de aquí, cada `git push` a `main` republica la app solo.** No hay
que volver a entrar a Vercel nunca.

---

## Paso 5 — Probarla en el Android

Esta es la prueba que cierra la fase. Abre la dirección de Vercel **en el
Android**, no en el Mac.

Revisa:

- [ ] Las cinco pestañas cambian al tocarlas
- [ ] Nada se sale de lado (no debe haber scroll horizontal)
- [ ] La barra de abajo no queda tapada por la barra de gestos del celular
- [ ] En el menú del navegador aparece **Instalar aplicación** o
      **Agregar a la pantalla de inicio**

Ese último punto todavía no va a funcionar bien: falta el `manifest.json` y
los iconos, que son de la Fase 8. Es normal.

Pruébala también con el wifi apagado, con datos móviles. En la Fase 8 se
agrega el caché para que el modo entrenamiento sirva sin señal.

---

## Después de esto

La Fase 1 queda cerrada. Avísame cómo se vio en el Android —sobre todo si
algo quedó tapado o corrido— y arrancamos la Fase 2: cuentas, roles y RLS.

**Para actualizar la app de aquí en adelante**, son tres comandos:

```bash
git add . && git commit -m "qué cambió" && git push
```
