# Fase 5 — Progreso y analítica

**Estado: la fase está completa. Falta correr el segundo archivo SQL.**

`08-analitica.sql` ya lo corriste. Falta `09-series.sql`, que es el que
trae el registro de peso y repeticiones y la cuarta métrica.

Sin él: la pantalla del entrenamiento no puede prellenar el peso de la
última vez, y la sección "Lo que se saltan" no aparece en tu panel. El
resto sigue funcionando.

---

## LO ÚNICO QUE TIENES QUE HACER TÚ

1. Abre el **SQL Editor** de tu proyecto en Supabase.
2. Pega el contenido de `supabase/09-series.sql` completo.
3. Dale a *Run*.

Es repetible: si lo corres dos veces no pasa nada. Y si algo falla, no
deja la base a medias en lo que importa — las vistas se borran y se
vuelven a crear en el mismo bloque.

**Requiere PostgreSQL 15 o superior.** Si tu proyecto fuera anterior, el
archivo falla con un error explícito en la línea del `security_invoker`.
Falla cerrado, que es como tiene que fallar: mejor que no corra a que
corra dejando las vistas abiertas.

---

## Qué se construyó

### Para el cliente — la pestaña `Progreso`

Era la última pantalla de la app que inventaba sus datos. Ahora muestra:

- **Tres cifras**: entrenamientos completados, tiempo total entrenando y
  nivel.
- **Las últimas 8 semanas** en barras, con las cumplidas en verde. Una
  lista de sesiones dice qué hizo; esto dice si viene sosteniendo el
  ritmo.
- **El historial** de sus últimos 30 entrenamientos, con la duración
  real de cada uno.

Y **los logros ya son de verdad.** Son seis y los otorga la base sola
cuando una sesión pasa a completada, igual que el XP: la primera sesión,
una semana cumplida, diez sesiones, madrugador, cuatro semanas seguidas
y un plan terminado.

### Para ti — Perfil → **Cómo van tus clientes**

Es la respuesta a lo que dijiste en el cuestionario: que no te enteras de
si tus clientes entrenan y que preguntas dos o tres veces por semana.

- **La lista de tus clientes**, ordenada por quien lleva más tiempo sin
  aparecer. El orden de la lista es el orden en que te conviene
  llamarlos. Cada uno con su porcentaje de cumplimiento **contra su
  propia meta**: quien entrena dos días a la semana y los cumple está al
  100%, igual que quien entrena cinco.
- **Cuánta gente viene por semana**, las últimas ocho. Es lo que dice si
  la app está sirviendo o si la gente la abre dos semanas y desaparece.
- **A qué hora entrenan**, en cuatro franjas, sin nombres.
- **Lo que se saltan**: de lo que programaste, qué es lo que no hacen.

### `mock.js` desapareció

El archivo de datos falsos se borró. Ya no queda una sola pantalla de la
app mostrando algo inventado.

---

## Las comprobaciones

Son el ritual de siempre (paso 8 de `PASOS-FASE-2.md`). Estas cuatro son
las de `08-analitica.sql`, que ya corriste; están escritas al final del
propio archivo con el SQL listo para copiar.

**1. Que las vistas no se salten los permisos.** Es la importante.
Suplantando a un cliente en el SQL Editor:

```sql
select count(*), count(distinct cliente_id) from v_sesiones_cliente;
```

`count(distinct cliente_id)` tiene que dar **1**. Si da 2 o más, un
cliente está viendo las sesiones de otras personas.

**2. Que un cliente no pueda abrir tu panel.** Con la misma suplantación,
`select * from adherencia_clientes(4);` tiene que fallar con "Solo un
administrador…".

**3. Que los logros se otorguen solos.** Completa una sesión y revisa que
aparezca la fila en `logros_obtenidos`. Repetir la operación no puede
duplicar nada.

**4. Entrar a la app con cada cuenta.** Contar filas dice que las
políticas están bien; **no dice que el código sepa usarlas**. Es la
lección del 2/09, cuando las políticas estaban perfectas y había cuatro
bugs que solo se veían entrando como entrenador.

Concretamente: entra con tu cuenta y con una de cliente, y mira que
`Progreso` te muestre **lo tuyo** y no el historial de otro.

### Y las cuatro de `09-series.sql`

Están escritas al final de ese archivo. Las dos que no se pueden saltar:

- **Que el prellenado traiga la última y no cualquiera.** Registra el
  mismo ejercicio dos veces con pesos distintos: la próxima vez tiene
  que llegar el segundo.
- **Que una sesión sin registros no cuente como saltada.** Completa un
  entrenamiento sin anotar ninguna serie y comprueba que "Lo que se
  saltan" no suma nada por él. Es el punto donde esa métrica se vuelve
  mentira si alguien "simplifica" la condición.

---

## El registro de series, que cierra la fase

Al empezar el entrenamiento desde `Hoy` se abre una pantalla nueva con
los ejercicios y sus series. Cada serie es una ficha:

- **Un toque la abre con el peso ya escrito**, sacado de la última vez
  que hizo ese ejercicio (o de la sugerencia del plan, si es la
  primera). Quien levanta lo mismo que la semana pasada solo confirma.
- **Las repeticiones llegan vacías cuando el plan pide un rango**
  ("8-10"). Elegir el 8 o el 10 por él metería un número que nadie hizo
  en la tabla que existe para ser real. Con un objetivo exacto ("12") sí
  se prellenan: eso no es una suposición, es lo que le pediste.
- **Guardar una serie salta sola a la siguiente.**
- **Se guarda serie por serie**, no al final: si se cae la señal a la
  mitad, lo anotado ya está.
- **Anotar es opcional.** Se puede terminar el entrenamiento sin
  escribir nada.

Y con eso entró **la cuarta métrica** en tu panel: *Lo que se saltan*.
Compara lo que programaste contra lo que de verdad hicieron.

**La trampa que tiene resuelta, y que conviene que sepas:** solo cuenta
los entrenamientos en los que la persona anotó algo. Si contara todos,
el ejercicio "más saltado" sería siempre el de los clientes que no usan
la función de registro, y la métrica mediría quién anota en vez de qué
se salta.
