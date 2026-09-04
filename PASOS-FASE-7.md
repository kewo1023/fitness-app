# Fase 7 — Las notificaciones

**Estado (4/09): la infraestructura quedó montada.** Los seis pasos
están hechos: llaves generadas, SQL corrido, secretos guardados, función
desplegada y el cron programado cada hora en punto. Verificado con un
disparo manual que devolvió 200.

**Lo único que falta es probarlo con un teléfono**, que es lo que no se
puede hacer desde un computador. Está al final, en "Lo que solo se
comprueba con un teléfono".

Los seis pasos (del 0 al 5) se dejan escritos porque hay que repetirlos
el día que se monte otro entorno, y porque cada uno explica por qué está
ahí. **Ninguno lo pude hacer yo**: necesitan la cuenta de Supabase y
llaves que no deben existir en este repositorio.

---

## Antes de nada: qué se construyó

Cuando esto esté andando, un cliente con plan activo recibe **un aviso
el día que le toca entrenar**, y solo si todavía no lo ha hecho. Los
domingos, si le falta para su meta de la semana, recibe uno distinto.

**A qué hora.** Lo elige él, en Perfil → Avisos: mañana (6 a.m.), tarde
(12 m.) o noche (5 p.m.), en hora de Bogotá. El recordatorio va **antes**
de su franja, no dentro — un aviso que llega cuando ya entrenaste es
ruido, y el ruido es lo que hace que alguien apague las notificaciones
para siempre. Quien no elija franja recibe a las 7 a.m.

**Nunca dos veces el mismo día**, aunque el cron se dispare de más.

---

## Paso 0 — La CLI de Supabase, enlazada al proyecto

**Esto faltaba en la primera versión de este documento** y es lo primero
con lo que uno se choca: `supabase: command not found`.

La CLI **no se instala con npm** —no está soportado— y en macOS va por
Homebrew:

```bash
brew install supabase/tap/supabase
```

Después hay que decirle con qué proyecto trabaja. **Todos los comandos
de aquí en adelante se corren desde la carpeta del proyecto**, no desde
la carpeta que la contiene: la CLI busca su configuración en `supabase/`
y desde afuera no la encuentra.

```bash
supabase login
```

```bash
supabase init
```

Si responde que ya está inicializado, sáltalo. Va a preguntar si quiere
generar ajustes de VS Code o IntelliJ para Deno: puedes decir que no.

```bash
supabase link --project-ref TU-REF
```

**Dónde sale `TU-REF`:** es el subdominio de tu `VITE_SUPABASE_URL` en
`.env.local`. Si dice `https://abcdefgh.supabase.co`, tu ref es
`abcdefgh`. También está en la dirección del panel de Supabase, después
de `/project/`.

---

## Paso 1 — Generar las llaves VAPID

Son el par de llaves con el que el servidor firma cada envío. La pública
va dentro de la app; **la privada no puede salir de tus secretos**:
quien la tenga puede mandarles notificaciones a tus clientes haciéndose
pasar por la app.

Necesitas Deno. Si no lo tienes:

```bash
brew install deno
```

Y luego, **desde la carpeta del proyecto**:

```bash
deno run https://raw.githubusercontent.com/negrel/webpush/master/cmd/generate-vapid-keys.ts > vapid.json
```

El `> vapid.json` no es un adorno: el generador manda el JSON a la
salida normal y la llave pública a la de errores, así que el archivo
queda **solo con el JSON** y la línea *"your application server key
is:"* igual se ve en pantalla. Esa línea es la **llave pública**, la que
va en la app en el paso 4.

**`vapid.json` está en `.gitignore` desde antes de que exista**, y esa
es la única forma de que sirva: la llave privada en un commit de un repo
público no se puede sacar del historial después. Si algún día la mueves,
que sea a donde guardas tus contraseñas — nunca dentro del repositorio
sin ignorar.

**Si pierdes las llaves y generas otras, todas las suscripciones
existentes dejan de funcionar** y cada cliente tiene que volver a
activar los avisos.

---

## Paso 2 — Correr el SQL

Pega `supabase/10-notificaciones.sql` en el SQL Editor y dale Run. Crea
la tabla de suscripciones, la de envíos, la columna de franja y las dos
funciones que deciden a quién se le manda.

---

## Paso 3 — Los secretos y la Edge Function

Desde la carpeta del proyecto, ya enlazado (paso 0).

El JSON de las llaves **no se pega a mano**: son varias líneas y el
riesgo de que se corte una es alto. Se lee del archivo y se compacta de
una:

```bash
supabase secrets set VAPID_KEYS="$(python3 -c 'import json,sys;print(json.dumps(json.load(sys.stdin)))' < vapid.json)"
```

```bash
supabase secrets set CONTACTO_PUSH='mailto:tu-correo@ejemplo.com'
```

El `CONTACTO_PUSH` lo exige el estándar: es para que Google o Mozilla
puedan avisarte si tu servidor está haciendo algo mal. Usa un correo que
revises.

Y un secreto más. **No lo inventes de cabeza: genéralo**, porque es lo
único que separa a la función de que cualquiera la dispare (ver
`verify_jwt` más abajo).

```bash
supabase secrets set CRON_SECRETO="$(openssl rand -base64 32)"
```

Ese comando no te lo muestra, así que para poder pegarlo en el paso 5
genéralo antes y guárdalo a la vista:

```bash
openssl rand -base64 32
```

y usa esa misma cadena en los dos sitios.

**Para qué es ese tercero, que parece de más y no lo es.** Una Edge
Function se invoca con la llave publicable, y esa llave vive dentro del
navegador de todo el mundo: está en el JavaScript de la app y cualquiera
la puede leer. Sin este secreto, cualquiera que abra la app puede
disparar la función las veces que quiera. No mandaría avisos repetidos
—de eso se encarga la base— pero sí gastaría tu cupo.

Luego despliegas la función:

```bash
supabase functions deploy enviar-recordatorios
```

**Sobre `verify_jwt`, que ya está resuelto pero conviene entenderlo.**
Antes de que corra nuestro código, Supabase comprueba por su cuenta que
la petición traiga una cabecera `Authorization` con un JWT válido. Quien
llama a esta función es el cron, no una persona: no hay sesión de nadie,
así que no hay JWT que mandar. Y las llaves nuevas (`sb_publishable_…`)
**no son JWT**, así que ponerlas ahí tampoco funciona — devuelve 401
`UNAUTHORIZED_NO_AUTH_HEADER` sin llegar nunca a la función.

Por eso `supabase/config.toml` trae:

```toml
[functions.enviar-recordatorios]
verify_jwt = false
```

Lo que protege la función es su propia puerta, el `CRON_SECRETO`. Es la
forma que la documentación de Supabase recomienda para un cron. **La
consecuencia: la dirección queda alcanzable por cualquiera, así que ese
secreto tiene que ser largo y aleatorio de verdad.**

---

## Paso 4 — La llave pública, en la app

En `.env.local` (que git ignora), agrega la línea con la llave pública
del paso 1:

```bash
VITE_VAPID_PUBLICA=BEl62iUYgUivxIkv69yViEuiBIa...
```

Y **la misma variable hay que ponerla en Vercel**, en Settings →
Environment Variables, o en producción los avisos no se van a poder
activar. Después de agregarla hay que volver a desplegar: las variables
se leen al construir, no al abrir la app.

Esta llave sí puede ser pública — es la mitad del par que está diseñada
para viajar. La que nunca sale de los secretos es la privada.

---

## Paso 5 — Programar el envío

### 5.1 Encender las dos extensiones

**Esto faltaba en la primera versión de este documento.** Sin ellas el
paso siguiente falla con `schema "cron" does not exist`. En el SQL
Editor:

```sql
create extension if not exists pg_net;
create extension if not exists pg_cron;
```

`pg_cron` es el reloj —crea el esquema `cron`— y `pg_net` es lo que
deja a la base hacer una llamada HTTP, que es como dispara la función.
Vienen preinstaladas en todos los proyectos, solo hay que encenderlas.
También se pueden encender desde Database → Extensions.

### 5.2 Programar el trabajo

**LEE ESTO ANTES DE PEGAR NADA.** Hay tres valores que tienes que
cambiar, y están escritos como `PON_AQUI_...`. Se reemplaza **la
palabra entera**, sin dejar nada alrededor:

| Qué | De dónde sale |
|---|---|
| `PON_AQUI_TU_REF` | El subdominio de tu `VITE_SUPABASE_URL` |
| `PON_AQUI_TU_CRON_SECRETO` | **Exactamente** lo que pusiste en `supabase secrets set CRON_SECRETO=…` |

**No va ninguna `apikey`.** Con `verify_jwt = false` la plataforma no la
mira, así que mandarla sería dejar una llave escrita en la definición
del cron sin que sirva para nada.

⚠️ **El tercero es el que falla en silencio.** La función compara esa
cabecera contra el secreto que guardaste en el paso 3. Si no son la
misma cadena, carácter por carácter, responde 401 y **no manda nada
nunca** — sin error visible en ningún lado, porque desde afuera parece
que el cron corrió bien.

Si no te acuerdas de qué pusiste, no lo adivines: los secretos se
sobrescriben. Vuelve a fijarlo con un valor que sí tengas a la mano y
usa ese mismo aquí.

```sql
select cron.schedule(
  'recordatorios-cada-hora',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://PON_AQUI_TU_REF.supabase.co/functions/v1/enviar-recordatorios',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secreto', 'PON_AQUI_TU_CRON_SECRETO'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

Si te equivocaste y quieres rehacerlo, primero quita el trabajo viejo —
si no, quedan dos programados y se pisan:

```sql
select cron.unschedule(jobname) from cron.job
 where jobname = 'recordatorios-cada-hora';
```

Escrito así y no como `cron.unschedule('recordatorios-cada-hora')` a
propósito: la forma corta lanza un error si el trabajo no existe, y esta
simplemente no hace nada. Se puede correr sin miedo antes de programar.

**Corre cada hora en punto y eso es a propósito.** La función pregunta
qué hora es en Bogotá y le manda solo a quien le toca en esa hora. Así
las tres franjas salen de un único trabajo programado, y cambiar una
hora es cambiar una función SQL, sin tocar el cron ni desplegar nada.

Para ver si está funcionando:

```sql
select * from cron.job_run_details order by start_time desc limit 10;
```

---

## Cómo comprobar que quedó bien

### Lo que se comprueba en el SQL Editor

**1. Que un cliente no pueda pedir la lista de destinatarios.** Es la
importante de esta fase: esa función devuelve las direcciones de los
teléfonos de todos. Suplantando a un cliente, `select * from
destinatarios_push(7);` tiene que fallar con *permission denied*.

**2. Que nadie vea las suscripciones de otro, tampoco tú.**
`suscripciones_push` es la primera tabla del proyecto donde el admin
**no** entra, y es a propósito: tú no mandas avisos a mano, los manda el
servidor. Suplantándote a ti mismo, `select count(*) from
suscripciones_push;` tiene que devolver solo las tuyas.

**3. Que apagar los avisos de verdad los apague.** Con un cliente que sí
saldría en la lista, insertar un consentimiento en `false` y volver a
llamar `destinatarios_push`: esa persona tiene que desaparecer.

El SQL exacto de las tres está al final de `10-notificaciones.sql`.

### Lo que solo se comprueba con un teléfono

Y esto **no lo puede hacer nadie desde un computador**:

1. Instala la app en un Android y entra con una cuenta de cliente que
   tenga plan.
2. Perfil → Avisos → Activar. Acepta el permiso del sistema.
3. Comprueba que apareció la fila: `select count(*) from
   suscripciones_push;` con esa cuenta tiene que dar 1.
4. Dispara la función a mano con la hora que sea, para no esperar:

```sql
select net.http_post(
  url := 'https://PON_AQUI_TU_REF.supabase.co/functions/v1/enviar-recordatorios',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'x-cron-secreto', 'PON_AQUI_TU_CRON_SECRETO'
  ),
  body := '{}'::jsonb
);
```

**Cómo saber si respondió 401** (o sea, si el secreto no coincide):

```sql
select status_code, content from net._http_response order by created desc limit 5;
```

Ojo: solo va a mandar algo si es **la hora de esa persona** y si hoy le
toca entrenar. Para probar sin esperar, cámbiale la franja o mira qué
hora es en Bogotá y ajusta.

5. La notificación tiene que llegar con el nombre de su rutina, y al
   tocarla tiene que abrir la app — no una pestaña nueva encima de la
   que ya estaba.

---

## Lo del iPhone, que hay que saber antes de prometerle nada a nadie

**En iPhone los avisos solo funcionan si la app está agregada a la
pantalla de inicio.** Abierta en una pestaña de Safari no llegan, y no
van a llegar: es una restricción de Apple, no algo que se pueda
programar mejor. Necesita iOS 16.4 o superior, que a estas alturas tiene
casi todo el mundo.

Y no hay ningún aviso que se lo diga a la persona: hay que ir a
Compartir → Agregar a inicio, a mano, sabiendo que existe.

La app ya lo maneja: a un iPhone sin instalar **no le dice "no
disponible"** —que sería cerrarle una puerta abierta— sino que le
muestra los tres pasos para instalarla. Pero eso sube de golpe la
importancia del `PASOS-FASE-8.md` de instalación, que ya era la única
puerta de entrada desde que se decidió no ir a las tiendas.

En Android no hace falta instalar nada: funciona desde el navegador.

---

## Lo que queda pendiente de esta fase

**La pantalla de configuración inicial.** Hoy la franja se elige desde
Perfil → Avisos. La idea es preguntarla también justo después de canjear
el código, cuando la persona entra por primera vez.

El código ya está listo para eso: el cuerpo de esa pantalla es un
componente aparte (`Ajustes`, dentro de `Notificaciones.jsx`) que la
configuración inicial va a reusar tal cual, y la columna de la base ya
existe. **No hace falta ninguna migración.**

Y una advertencia para cuando se construya: cada pregunta que se meta
entre alguien que acaba de entrar y la app pierde gente. Tiene que ser
corta y saltable de verdad — que además es lo que la Ley 1581 exige para
lo que es opcional.
