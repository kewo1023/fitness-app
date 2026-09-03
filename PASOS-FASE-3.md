# Fase 3 — La biblioteca de ejercicios

Lo que tienes que hacer tú, porque depende de tu cuenta o del entrenador.
Son dos cosas, y la segunda no la puedes hacer solo.

**Qué vamos a lograr en esta fase:** que el entrenador cargue sus 80 a 150
ejercicios con sus imágenes, él mismo, sin pedirle nada a nadie. Hoy la app
tiene 30 ejercicios de ejemplo que me inventé yo.

---

## Paso 1 — Crear el sitio donde van las imágenes (~10 min)

Las imágenes no van dentro de la base de datos. Van en **Storage**, que es
la parte de Supabase para archivos.

**Por qué no van en la base:** una base de datos guarda datos que se
consultan y se cruzan. Una foto no se cruza con nada — se pide entera y se
muestra. Meterla en una tabla haría cada consulta más lenta para todos, aun
cuando nadie esté mirando fotos.

En Excel sería la diferencia entre una columna con el nombre del archivo y
pegar la imagen dentro de la celda: lo segundo hincha el libro entero y lo
vuelve lento hasta para sumar.

1. En Supabase, menú de la izquierda → **Storage**
2. **New bucket**
3. **Name:** `ejercicios`
4. **Public bucket: ENCENDIDO**

   Sí, público, y no es un descuido. Estas imágenes son ejercicios: una
   persona haciendo una sentadilla. No hay nada privado, y el catálogo lo
   ve hasta un visitante — es el gancho de la app.

   Que sea público también evita un problema real: si fuera privado, cada
   imagen necesitaría una dirección firmada que caduca, y la app tendría
   que pedir 150 direcciones nuevas cada vez que alguien abre el catálogo.
   Lento, y sin proteger nada que valga la pena proteger.

   **Lo que SÍ sería privado, si algún día existe: las fotos de progreso
   de los clientes.** Esas van en otro bucket, privado, y hoy no van a
   existir — están descartadas para la v1 justamente por eso.

5. **Additional configuration → Restrict file size:** `2 MB`
6. **Allowed MIME types:** `image/jpeg, image/png, image/webp`

   Los dos límites de arriba son la red de seguridad, no el control
   principal. La app va a comprimir cada foto a ~150 KB **antes** de
   subirla — una foto de celular pesa 3 a 5 MB y tu público abre esto con
   datos móviles en Colombia. El límite del bucket existe por si algo se
   me escapa.

7. **Create bucket**

**Avísame cuando esté.** Las políticas de quién puede subir y borrar las
escribo yo en `supabase/05-storage.sql`: solo el admin escribe, todo el
mundo lee.

---

## Paso 2 — La hoja de cálculo del entrenador

Esta es la que de verdad importa, y necesita que hables con él.

Pídele **una hoja de cálculo con sus ejercicios**, una fila por ejercicio,
con estas columnas. Los nombres exactos no importan; el orden y el
contenido sí:

| Columna | Obligatoria | Qué va | Valores posibles |
|---|---|---|---|
| `nombre` | **sí** | Como él lo llama | texto libre, sin repetir |
| `grupo` | **sí** | El músculo | pecho, espalda, pierna, hombro, brazo, core, cardio |
| `movimiento` | no | El patrón | empuje, jalon, sentadilla, bisagra, zancada, core, cardio |
| `equipo` | no | Qué hace falta | ninguno, mancuernas, banda, barra, maquina, polea, kettlebell, banco |
| `nivel` | no | Para quién | principiante, intermedio, avanzado |
| `indicaciones` | no | Las 2 o 3 correcciones que él repite siempre | texto libre |

**Dos cosas que vale la pena decirle a él, no a la hoja:**

**Los dos ejes son a propósito.** `grupo` es el músculo y `movimiento` es
el patrón, y son columnas separadas porque él los piensa a la vez. Si te
dice "eso es lo mismo", no lo es: un press de banca y unas flexiones son
los dos *empuje* de *pecho*, pero una sentadilla es *sentadilla* de
*pierna* y un peso muerto es *bisagra* de *pierna*. Sirve para responder
"¿qué puede hacer este cliente con lo que tiene en la casa?".

**Las indicaciones son lo que hace la app distinta de YouTube.** Un
catálogo de ejercicios lo tiene cualquiera. Lo que no tiene nadie es lo que
él le corrige a la gente. Si esa columna llega vacía, la app queda igual a
todas.

### Y las imágenes

- Una por ejercicio, **con el nombre del ejercicio como nombre del
  archivo** (`sentadilla-goblet.jpg`). Así se emparejan solas con la hoja
  y no toca hacerlo a mano 150 veces.
- Que no falte ninguna no es requisito. **La app se tiene que ver bien sin
  imagen**, y hoy los 30 ejercicios de ejemplo no tienen ninguna — ese es
  el caso real del primer día.
- Puede mandarlas como salgan del celular. La app las comprime antes de
  subirlas.

**Y lo más importante de decirle, que no es técnico:**

> Las fotos tienen que ser **de él mismo, de alguien que le haya dado
> permiso, o ilustraciones. Nunca la foto de un cliente.**

El bucket es público: cualquiera con la dirección ve la imagen, sin
cuenta, y la dirección se arma con el nombre del archivo, así que se
adivina. La imagen de una persona identificable es un dato personal bajo
la Ley 1581, y publicarla sin autorización escrita lo pone a él en un
problema que no se arregla borrando el archivo después.

No basta con que salga de espaldas o cortada: la ley no pide que no se
le vea la cara, pide que no sea identificable. Si tiene dudas con alguna
foto, esa foto no va.

Esto conviene decírselo **antes** de que empiece a recopilar, no cuando
ya tenga 150 fotos tomadas en sus sesiones.

---

## Lo que hago yo mientras tanto

Nada de esto depende de ti:

1. `supabase/05-storage.sql` — las políticas del bucket
2. El panel del entrenador (solo visible con rol `admin`): crear, editar y
   archivar ejercicios
3. La carga masiva: pegas la hoja, ves una vista previa, y solo entonces se
   guarda
4. La compresión de imágenes en el navegador antes de subir

---

## La prueba que cierra la Fase 3

La misma de siempre, y se repite entera:

1. El entrenador entra con su cuenta, pega su hoja y sus ejercicios quedan
   en la app con sus imágenes.
2. Un cliente los ve. Un visitante también — el catálogo es el gancho.
3. **Ninguno de los dos puede editarlos ni borrarlos**, ni desde la app ni
   consultando la base directo.
4. Se corre otra vez la carga completa y **no se duplica nada**.

El punto 3 se verifica suplantando los tres roles en el SQL Editor, igual
que en el paso 8 de `PASOS-FASE-2.md`. No se supone.

---

## Antes de darle la URL a gente que no conoces

No bloquea esta fase, pero que no se te olvide: **falta la puerta de edad.**

El artículo 7 de la Ley 1581 prohíbe tratar datos de menores salvo
excepciones, y con registro abierto van a entrar. Falta preguntarlo en el
registro y decidir qué pasa con un menor. El artículo 12 del Decreto 1377,
que regula cómo se hace bien, quedó **sin verificar** — la fuente oficial
no abrió.

Mientras la app la usen el entrenador y sus clientes, que él conoce uno por
uno, esto no aprieta. El día que la URL circule, sí.
