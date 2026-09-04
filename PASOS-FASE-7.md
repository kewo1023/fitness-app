# Fase 7 — Las notificaciones

**Estado: el código está completo. Falta la infraestructura, y esta vez
es más que correr un SQL.**

Son cinco pasos y **ninguno lo pude hacer yo**: necesitan tu cuenta de
Supabase y llaves que no deben existir en este repositorio. Léelos
seguidos antes de empezar; el orden importa.

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

## Paso 1 — Generar las llaves VAPID

Son el par de llaves con el que el servidor firma cada envío. La pública
va dentro de la app; **la privada no puede salir de tus secretos**:
quien la tenga puede mandarles notificaciones a tus clientes haciéndose
pasar por la app.

Necesitas Deno. Si no lo tienes:

```bash
brew install deno
```

Y luego:

```bash
deno run https://raw.githubusercontent.com/negrel/webpush/master/cmd/generate-vapid-keys.ts
```

Imprime dos cosas:

- Un **JSON** con las dos llaves. Ese bloque completo es `VAPID_KEYS`.
- Una línea que empieza con *"your application server key is:"*. Ese
  texto es la **llave pública**, la que va en la app.

Guárdalas donde guardas tus contraseñas. **Si las pierdes y generas
otras, todas las suscripciones existentes dejan de funcionar** y cada
cliente tiene que volver a activar los avisos.

---

## Paso 2 — Correr el SQL

Pega `supabase/10-notificaciones.sql` en el SQL Editor y dale Run. Crea
la tabla de suscripciones, la de envíos, la columna de franja y las dos
funciones que deciden a quién se le manda.

---

## Paso 3 — Los secretos y la Edge Function

Con la CLI de Supabase, desde la carpeta del proyecto:

```bash
supabase secrets set VAPID_KEYS='{"publicKey":{...},"privateKey":{...}}'
```

```bash
supabase secrets set CONTACTO_PUSH='mailto:tu-correo@ejemplo.com'
```

El `CONTACTO_PUSH` lo exige el estándar: es para que Google o Mozilla
puedan avisarte si tu servidor está haciendo algo mal. Usa un correo que
revises.

Y un secreto más, que te inventas tú — una cadena larga y aleatoria:

```bash
supabase secrets set CRON_SECRETO='pon-aqui-algo-largo-y-aleatorio'
```

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

En el SQL Editor. Reemplaza las tres cosas entre `<>` por lo tuyo:

```sql
select cron.schedule(
  'recordatorios-cada-hora',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://<tu-ref>.supabase.co/functions/v1/enviar-recordatorios',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', '<tu-llave-publicable>',
      'x-cron-secreto', '<el-CRON_SECRETO-del-paso-3>'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

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
  url := 'https://<tu-ref>.supabase.co/functions/v1/enviar-recordatorios',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'apikey', '<tu-llave-publicable>',
    'x-cron-secreto', '<tu-CRON_SECRETO>'
  ),
  body := '{}'::jsonb
);
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
