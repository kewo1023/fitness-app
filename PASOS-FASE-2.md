# Fase 2 — Crear la base de datos

Tiempo: unos 30 minutos. Es la única parte de la fase que no puedo hacer
yo: necesita tu cuenta.

**Qué vamos a hacer:** crear el proyecto en Supabase, ajustar cómo se entra
a la app, correr los cuatro archivos SQL que crean las tablas y los
permisos, y dejar las credenciales donde la app las pueda leer.

**Qué es Supabase, en una línea:** una base de datos Postgres en internet,
con manejo de cuentas incluido. La parte de "manejo de cuentas" es la que nos
ahorra semanas de trabajo.

Verificado contra la documentación oficial el 1 de septiembre de 2026.

---

## Paso 1 — Crear el proyecto

1. Entra a **supabase.com/dashboard** y crea la cuenta si no la tienes.
   Se puede entrar con GitHub.
2. **New project**.
3. **Name:** `fitness-app`
4. **Database Password:** deja que la genere y **guárdala en tu gestor de
   contraseñas**. No es la que vas a usar todos los días, pero si la pierdes
   no se recupera: toca resetearla.
5. **Region:** `East US (North Virginia)`.

   Es la decisión con más consecuencias de esta pantalla y no se puede
   cambiar después sin crear el proyecto de nuevo. Virginia es el punto con
   mejor latencia hacia Colombia — mejor que São Paulo, que en el mapa se ve
   más cerca pero en ruta de red no lo está.
6. **Plan:** Free. Con los clientes de arranque sobra de lejos, y subir de
   plan después no obliga a mover nada.
7. **Create new project.** Tarda un par de minutos en quedar listo.

---

## Paso 2 — Ajustar cómo se entra a la app

Esto va **antes** de crear cuentas, porque cambia cómo se crean.

En **Authentication → Sign In / Providers → Email**:

| Ajuste | Cómo queda | Por qué |
|---|---|---|
| **Confirm email** | **APAGADO** | El correo que trae Supabase manda 2 mensajes por hora. Con eso, pedirle a cada cliente que confirme su correo es pedirle que espere media hora. Lo que valida al cliente no es el correo, es el código de invitación. |
| **Allow new users to sign up** | **ENCENDIDO** | Parece lo contrario de lo que queremos, pero no lo es. Léelo abajo. |

### Por qué el registro queda abierto y aun así nadie entra

Esta es la parte del diseño que no es obvia, y vale entenderla porque es la
que sostiene la seguridad de toda la app.

Hay **dos cosas distintas** que solemos llamar "tener cuenta":

1. **Estar autenticado** — Supabase sabe que existes y tienes contraseña.
2. **Tener perfil** — la app sabe quién eres y qué te toca ver.

Cualquiera puede hacer lo primero. **Solo un código de invitación válido te
da lo segundo.** Y sin perfil, todas las políticas del archivo `02` te dejan
ver exactamente nada: ni un ejercicio, ni una receta, ni el nombre de otro
cliente. Estás adentro de la puerta principal y todas las demás están
cerradas.

Si en vez de eso apagáramos el registro, tendrías que crear tú, a mano, la
cuenta de cada persona que entre. Con 15 pasa; con 100 no.

⚠️ **Consecuencia de apagar la confirmación de correo:** alguien podría
registrarse con un correo que no es suyo. Aquí no importa, porque el correo
no da acceso a nada — el código sí. Pero el día que la app mande correos de
verdad (recuperar contraseña, avisos), esto hay que volver a mirarlo.

---

## Paso 3 — Correr los archivos SQL

En el menú de la izquierda, **SQL Editor**.

Vas a pegar cuatro archivos, **uno por uno y en orden**. Cada uno se puede
repetir sin romper nada, así que si algo falla a la mitad se corre otra vez
completo.

| Orden | Archivo | Qué hace |
|---|---|---|
| 1 | `supabase/01-esquema.sql` | Crea las 19 tablas |
| 2 | `supabase/02-politicas.sql` | Los permisos. **Sin esto la base está abierta** |
| 3 | `supabase/03-funciones.sql` | Invitaciones, copiar plantillas, XP y habeas data |
| 4 | `supabase/04-ejemplo.sql` | La biblioteca de prueba, con contenido inventado |

Para cada uno: abre el archivo, copia todo, pégalo en el editor, **Run**.

**Si sale el aviso `creates a table without enabling RLS`:** el revisor de
Supabase se confunde con algunas consultas y lo reporta sin razón. Ahí va
**Run and enable RLS**. Nunca *Run without RLS*.

**Cómo saber que quedó bien.** Corre esto después del archivo 2:

```sql
select tablename,
       case when rowsecurity then 'protegida' else 'ABIERTA' end as estado
  from pg_tables
 where schemaname = 'public'
 order by rowsecurity, tablename;
```

Tienen que salir **19 filas y ninguna que diga ABIERTA**. Si alguna sale
abierta, ahí se para: esa tabla es legible por cualquiera con la llave que
vive dentro del navegador.

---

## Paso 4 — Las credenciales

En el menú de la izquierda: **Settings → API Keys**.

**Ojo con esto, que cambió hace poco.** Supabase le cambió el nombre a las
llaves: ahora se llaman **publishable** y **secret**, en vez de *anon* y
*service_role*. Las viejas siguen funcionando hasta finales de 2026, así que
en el dashboard vas a ver dos pestañas:

- **API Keys** — las nuevas. Es la que queremos.
- **Legacy API Keys** — las viejas. Ignórala.

Necesitas dos datos:

1. La **Project URL** (en *Settings → Data API*): algo como
   `https://abcdefgh.supabase.co`
2. La **publishable key**: empieza por `sb_publishable_...`

### Por qué esta llave sí puede ir en un repo público

Porque no es una contraseña. La `publishable` está hecha para vivir dentro
del navegador de cualquiera: la documentación de Supabase dice explícitamente
que es segura de exponer. Lo que protege los datos **no es la llave, son las
políticas de RLS** del archivo `02`. La llave solo dice "soy esta app"; las
políticas dicen "y solo puedes ver lo tuyo".

**La `secret` es lo contrario y no la vamos a usar nunca en esta app.** Esa sí
salta todas las políticas. Si alguna vez la copias por error a un archivo del
proyecto, avísame de una: hay que rotarla, no basta con borrarla.

Aun así, la `publishable` va en `.env.local`, que git ignora. No porque sea
secreta, sino porque cada entorno tiene la suya y mezclarlas es cómo se
termina escribiendo en la base equivocada.

---

## Paso 5 — Guardar las credenciales

En la carpeta del proyecto, crea un archivo llamado **`.env.local`**
(con el punto adelante) y pega esto, reemplazando los dos valores:

```
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_TU-LLAVE
```

**El prefijo `VITE_` es obligatorio.** Vite solo le entrega al navegador las
variables que empiezan así; sin él la app arranca y falla sin decir por qué.

Confirma que git lo está ignorando:

```bash
git check-ignore -v .env.local
```

Si no imprime nada, **párate y avísame**: significa que se subiría.

---

## Paso 6 — Las mismas variables en Vercel

Tu computador ya tiene las credenciales, pero el servidor que publica la app
no. Sin esto, en local funciona y en internet sale en blanco — es el error
más común al conectar una base por primera vez.

1. En Vercel, entra al proyecto `fitness-app`
2. **Settings → Environment Variables**
3. Agrega las dos, con el mismo nombre y el mismo valor
4. Déjalas activas para Production, Preview y Development
5. **Deployments → el último → Redeploy.** Las variables no se aplican solas
   a un deploy que ya existe

---

## Paso 7 — Crear las dos cuentas de administrador

En **Authentication → Users → Add user → Create new user**:

1. Tu cuenta, con tu correo
2. La del entrenador, con el suyo

Marca **Auto Confirm User** en las dos.

### Y ahora la parte que casi se nos escapa

Crear el usuario **no crea el perfil**. Son dos tablas distintas y no se
llenan solas: `auth.users` es la puerta (correo y contraseña), `perfiles` es
quién eres para la app (nombre, rol, XP). Un usuario sin perfil está
autenticado y no ve absolutamente nada — que es justo lo que queremos para un
desconocido, y justo lo que NO queremos para ustedes dos.

A los clientes les crea el perfil la función `vincular_con_codigo` cuando
canjean su invitación. A ustedes dos hay que creárselo a mano, una sola vez.

En el **SQL Editor**, cambiando los cuatro valores:

```sql
insert into perfiles (id, rol, nombre)
select u.id, 'admin', v.nombre
from (values
  ('TU-CORREO@ejemplo.com',            'Tu nombre'),
  ('CORREO-DEL-ENTRENADOR@ejemplo.com', 'Nombre del entrenador')
) as v(correo, nombre)
join auth.users u on u.email = v.correo
on conflict (id) do update set rol = 'admin';
```

**Mira el mensaje que devuelve.** Si dice `INSERT 0 2`, quedaron los dos. Si
dice `INSERT 0 1`, uno de los dos correos está mal escrito y ese quedó por
fuera — no sigas hasta que diga 2.

Comprueba:

```sql
select nombre, rol from perfiles order by nombre;
```

---

## Paso 8 — El cliente de prueba y la prueba que cierra la fase

Sin esto no sabemos si los permisos sirven. **Y no se supone: se prueba.**

**8.1** Crea una tercera cuenta igual que las anteriores, con un correo
inventado tuyo (`prueba@ejemplo.com`), y márcale Auto Confirm. Este va a
ser el CLIENTE; más abajo creas también un visitante.

**8.2** Créale el perfil como cliente:

```sql
insert into perfiles (id, rol, nombre)
select id, 'cliente', 'Cliente de prueba'
  from auth.users where email = 'prueba@ejemplo.com'
on conflict (id) do nothing;
```

**8.3** Apunta los tres identificadores, que los vas a usar en todo lo que
sigue:

```sql
select email, id from auth.users order by email;
```

**8.4** Asígnale un plan de 4 semanas copiando la plantilla de ejemplo.

Ojo con el detalle que hace falta aquí: `clonar_plantilla` empieza
preguntando "¿quién me está llamando?", y el SQL Editor por defecto no
responde a esa pregunta — ahí las consultas van con el rol del dueño de la
base, que no es "ningún usuario", es "todos los permisos". Así que hay que
decirle explícitamente que atienda como si fueras tú, el admin:

```sql
begin;
  set local role authenticated;
  set local request.jwt.claims =
    '{"sub":"PEGA-AQUI-TU-ID-DE-ADMIN","role":"authenticated"}';

  select clonar_plantilla(
    (select id from plantillas where nombre = 'Fuerza básica 3 días'),
    'PEGA-AQUI-EL-ID-DEL-CLIENTE'::uuid,
    current_date,   -- arranca hoy
    3               -- meta: 3 entrenamientos por semana
  );
commit;
```

Aquí va `commit`, no `rollback`: esto sí queremos que quede. Y de paso ya
probaste que la función corre bien con un admin de verdad.

**8.5** Ahora lo importante: **hacerte pasar por el cliente** y comprobar qué
ve. Esto no simula nada — le dice a Postgres "atiende esta consulta como si
la hiciera él", que es exactamente lo que pasa cuando la app consulta.

Corre esto pegando el identificador del cliente:

```sql
begin;
  set local role authenticated;
  set local request.jwt.claims =
    '{"sub":"PEGA-AQUI-EL-ID","role":"authenticated"}';

  select 'perfiles'   as tabla, count(*) from perfiles
  union all select 'plantillas',   count(*) from plantillas
  union all select 'planes',       count(*) from planes
  union all select 'invitaciones', count(*) from invitaciones
  union all select 'ejercicios',   count(*) from ejercicios
  union all select 'rutinas',      count(*) from rutinas
  union all select 'recetas',      count(*) from recetas
  union all select 'retos',        count(*) from retos;
rollback;
```

Lo que **tiene** que salir, y por qué:

| tabla | cliente | por qué |
|---|---|---|
| perfiles | **1** | solo él. Si sale 3, ve a los admin |
| plantillas | **0** | los moldes del entrenador son invisibles |
| planes | **1** | el suyo |
| invitaciones | **0** | si viera esto, podría robarse códigos sin usar |
| ejercicios | **30** | el catálogo es el gancho, es para todos |
| rutinas | **4** | el repertorio completo |
| recetas | **6** | todas |
| retos | **1** | participar es cosa de clientes |

El `rollback` del final deshace la suplantación. No borra nada de lo que
hiciste antes.

**Si algún número sale más alto de lo que dice la tabla, hay un hueco y no se
sigue hasta taparlo.** Este es el criterio que cierra la Fase 2, y es el
mismo que va a repetirse cada vez que se agregue una tabla nueva.

**8.6** Ahora el tercer rol. Crea una cuarta cuenta
(`visitante@ejemplo.com`, Auto Confirm) y dale perfil de visitante:

```sql
insert into perfiles (id, rol, nombre)
select id, 'visitante', 'Visitante de prueba'
  from auth.users where email = 'visitante@ejemplo.com'
on conflict (id) do nothing;
```

Corre la MISMA consulta del paso 8.5 con su identificador. Los números
tienen que ser **más bajos**:

| tabla | visitante | por qué |
|---|---|---|
| perfiles | **1** | el suyo |
| plantillas | **0** | igual que el cliente |
| planes | **0** | no tiene plan. Esa es toda la diferencia |
| invitaciones | **0** | igual |
| ejercicios | **30** | el catálogo sí lo ve: es el gancho |
| rutinas | **1** | solo la marcada como pública |
| recetas | **2** | solo las marcadas como públicas |
| retos | **0** | un reto sin plan no significa nada |

**Este es el paso que más fácil se rompe al agregar contenido nuevo.** Si
el visitante ve lo mismo que el cliente, la app quedó gratis sin querer;
si el cliente ve menos de lo que debe, pagó por nada. Los dos errores
salen en la misma consulta.

**8.7** Y la prueba al revés, para que no sea un falso positivo: que el
cliente **no pueda** hacer cosas de admin.

```sql
begin;
  set local role authenticated;
  set local request.jwt.claims =
    '{"sub":"PEGA-AQUI-EL-ID","role":"authenticated"}';

  select * from crear_invitacion(1);   -- tiene que FALLAR
rollback;
```

Tiene que responder `Solo un administrador puede crear invitaciones.` Si
devuelve un código, se rompió algo.

---

## Cuando termines

Avísame y sigo yo con el código: `src/lib/supabase.js`, la pantalla de
acceso, el manejo de la sesión, la autorización de la Ley 1581 con
finalidades separadas, y la pantalla "Mis datos" — que va a ser la primera
pantalla de la app que hable directo con estas funciones (`mis_datos` y
`eliminar_mi_cuenta`).

Y de paso: `src/data/mock.js` se borra en esa tanda. No se queda dando
vueltas.
