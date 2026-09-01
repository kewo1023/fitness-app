# Fase 2 — Crear la base de datos

Tiempo: unos 20 minutos. Es la única parte de la fase que no puedo hacer yo:
necesita tu cuenta.

**Qué vamos a hacer:** crear el proyecto en Supabase, correr los archivos SQL
que crean las tablas y los permisos, y dejar las credenciales donde la app
las pueda leer.

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
6. **Plan:** Free. Con 6 a 15 clientes sobra de lejos.
7. **Create new project.** Tarda un par de minutos en quedar listo.

---

## Paso 2 — Correr los archivos SQL

En el menú de la izquierda, **SQL Editor**.

Vas a pegar cuatro archivos, **uno por uno y en orden**. Cada uno se puede
repetir sin romper nada, así que si algo falla a la mitad se corre otra vez
completo.

| Orden | Archivo | Qué hace |
|---|---|---|
| 1 | `supabase/01-esquema.sql` | Crea las 16 tablas |
| 2 | `supabase/02-politicas.sql` | Los permisos. **Sin esto la base está abierta** |
| 3 | `supabase/03-funciones.sql` | Invitaciones y copiar plantillas |
| 4 | `supabase/04-ejemplo.sql` | Datos de prueba con nombres inventados |

Para cada uno: abre el archivo, copia todo, pégalo en el editor, **Run**.

**Si sale el aviso `creates a table without enabling RLS`:** el revisor de
Supabase se confunde con algunas consultas y lo reporta sin razón. Ahí va
**Run and enable RLS**. Nunca *Run without RLS*.

Los archivos 2, 3 y 4 los estoy escribiendo mientras tú haces el paso 1.
Cuando termines el proyecto, avísame y te digo si ya están.

---

## Paso 3 — Las credenciales

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

## Paso 4 — Guardar las credenciales

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

## Paso 5 — Las mismas variables en Vercel

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

## Paso 6 — Crear las dos cuentas

Las cuentas se crean a mano desde el dashboard. **No vamos a montar registro
abierto dentro de la app**: el correo que trae Supabase manda 2 mensajes por
hora, así que un registro real sería inservible. Los clientes van a entrar
por código de invitación.

En **Authentication → Users → Add user → Create new user**:

1. Tu cuenta, con tu correo
2. La del entrenador, con el suyo

Marca **Auto Confirm User** en las dos, para que no tengan que confirmar por
correo.

Después corre esto en el SQL Editor para volverlas administradores:

```sql
update perfiles set rol = 'admin'
where id in (select id from auth.users where email in (
  'TU-CORREO@ejemplo.com',
  'CORREO-DEL-ENTRENADOR@ejemplo.com'
));
```

---

## Cuando termines

Avísame y sigo yo con el código: la pantalla de acceso, el manejo de la
sesión, la autorización de datos de la Ley 1581 y la pantalla "Mis datos".

La prueba que cierra la fase: el entrenador entra y ve el panel; un cliente
de prueba entra y **no ve absolutamente nada** de otro cliente. Eso se
verifica contra la base, no se supone.
