# App de entrenamiento

Un entrenador con una decena de clientes les manda las rutinas en PDF. No
tiene forma de saber quién entrenó: pregunta dos o tres veces por semana. Y
cada cliente lleva su propia rutina, así que armar el ciclo de cada uno es
trabajo manual que se repite cada cuatro semanas.

Esto es la app que reemplaza ese PDF.

**En producción:** https://fitness-app-ivory-mu.vercel.app

## Qué hace

- **Programas por cliente.** Cada persona tiene su plan de 4 semanas. El
  entrenador arma plantillas y las copia por cliente; la copia queda
  independiente, así que cambiar el molde no le mueve la rutina a nadie.
- **Modo entrenamiento.** Un ejercicio a la vez, con su demostración,
  temporizador de descanso y registro de peso y repeticiones por serie.
- **Progreso.** Historial del cliente, y para el entrenador la respuesta a la
  pregunta que hoy no tiene: quién entrenó esta semana y quién no.
- **Recetas.** Contenido general, no planes individuales — ver la nota legal
  abajo.
- **Gamificación.** Racha semanal (no diaria: una racha diaria castiga el
  descanso, que es lo contrario de lo que un entrenador quiere), XP por
  sesión completada, logros y retos.

## Stack

React 18 + Vite 5 + CSS plano con variables + Supabase (Postgres con RLS).
PWA instalable desde el navegador, publicada en Vercel. Sin TypeScript, sin
Tailwind, sin dependencias de UI.

```bash
npm install
npm run dev     # localhost:5173
npm run test    # Vitest
npm run build
```

## Tres decisiones que explican el resto del código

**Todo lo de "qué día es" pasa por `src/data/fechas.js`.** Los usuarios están
en Colombia (UTC−5, sin horario de verano). A las 7 de la noche en Bogotá, en
UTC ya es el día siguiente: preguntar `new Date().toISOString()` a esa hora
registra el entrenamiento del martes como del miércoles y rompe una racha que
la persona sí cumplió. Nunca se pregunta la fecha a secas; siempre en la zona
de Bogotá. Hay 14 pruebas cubriendo justo ese cruce.

**La analítica vive en SQL, no en JavaScript.** Adherencia, retención y rachas
se calculan con consultas en Postgres. La racha en particular no se guarda: se
calcula. Guardarla obligaría a recalcularla cada noche con un trabajo
programado, y el día que ese trabajo falle el número queda mal para siempre.

**Un solo código con tres niveles de decoración.** El público es Android de
gama media y baja, donde `backdrop-filter` es caro. `src/lib/dispositivo.js`
mira RAM y núcleos al arrancar y ajusta desenfoque, duración de las
transiciones y sombras. El nivel cambia **solo cómo se ve la app** — nunca
qué se puede hacer.

## Privacidad

La app guarda datos de salud de terceros y opera bajo la Ley 1581 de 2012
(Colombia), que los clasifica como sensibles:

- Autorización explícita con finalidades separadas, y los campos de salud son
  opcionales de verdad — la ley obliga a informar que responderlos es
  facultativo.
- Pantalla "Mis datos": descargar, corregir y eliminar. Es el canal de habeas
  data, implementado como función y no como un PDF.
- RLS activo en todas las tablas. Un cliente nunca ve datos de otro.
- Las tablas de posiciones son opcionales y con alias: mostrar la actividad
  física de una persona a las demás sin autorización es dato sensible
  circulando sin permiso.
- La sección de comida es contenido general. El plan alimentario individual
  es función reservada al nutricionista-dietista con tarjeta (Ley 73 de 1979).

Este repositorio es público y no contiene datos reales de ningún cliente.

## Estado

Fase 1 de 9 terminada: esqueleto, sistema visual y navegación, con datos de
ejemplo. La base de datos es lo siguiente. El registro completo de decisiones
está en `BITACORA.md`.
