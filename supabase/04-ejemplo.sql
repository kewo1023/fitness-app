-- =====================================================================
-- 04-ejemplo.sql — datos de prueba.
-- =====================================================================
--
-- NOMBRES INVENTADOS, SIEMPRE. Ni un cliente real, ni un ejercicio con
-- el nombre de alguien, ni una nota copiada de un PDF de verdad. Este
-- archivo vive en un repositorio PÚBLICO y el historial de git no se
-- limpia después: lo que entra hoy queda, aunque mañana se borre el
-- archivo. Ver CLAUDE.md, sección PARAR, punto 3.
--
-- Qué siembra: la BIBLIOTECA del entrenador (ejercicios, rutinas,
-- plantillas, recetas). Nada que cuelgue de un cliente.
--
-- Por qué no siembra clientes: un perfil no puede existir sin una
-- cuenta de acceso, y esas se crean desde el panel de Supabase (paso 6
-- de PASOS-FASE-2.md). Al final de este archivo está el bloque para
-- asignarle un plan al cliente de prueba cuando ya exista.
--
-- Se puede correr las veces que sea: todo va con "on conflict do
-- nothing" apoyado en los índices únicos del archivo 01.
--
-- SE CORRE COMO ADMIN, desde el SQL Editor. Ahí las consultas van con
-- el rol postgres, que se salta las políticas del archivo 02 — por eso
-- funciona aunque las políticas digan "solo admin escribe".
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. EJERCICIOS
-- ---------------------------------------------------------------------
--
-- Los dos ejes de agrupación son a propósito: "grupo" es el músculo,
-- "movimiento" es el patrón. Él piensa en los dos a la vez y por eso no
-- se colapsaron en una sola columna.
--
-- Todos entran SIN video (video_id nulo) e incluso sin imagen, que es
-- exactamente como va a arrancar de verdad. Si la app se ve mal con
-- estos datos, se va a ver mal el primer día.

insert into ejercicios (nombre, grupo, movimiento, equipo, nivel, indicaciones) values
  ('Flexiones de pecho',            'pecho',   'empuje',    'ninguno',    'principiante', 'Codos a 45 grados, no abiertos. El cuerpo va en una sola línea.'),
  ('Press de banca con barra',      'pecho',   'empuje',    'barra',      'intermedio',   'Omóplatos apretados contra el banco. Los pies no se mueven.'),
  ('Press inclinado con mancuernas','pecho',   'empuje',    'mancuernas', 'intermedio',   'Baja hasta sentir el pecho, no más. No choques las mancuernas arriba.'),
  ('Aperturas en banco',            'pecho',   'empuje',    'mancuernas', 'intermedio',   'Codos ligeramente doblados y fijos. El movimiento es del hombro.'),
  ('Fondos entre bancos',           'pecho',   'empuje',    'banco',      'principiante', 'Hombros abajo y atrás. Si molesta el hombro, se para.'),

  ('Remo con mancuerna a una mano', 'espalda', 'jalon',     'mancuernas', 'principiante', 'Tira con el codo, no con la mano. La espalda queda plana.'),
  ('Jalón al pecho en polea',       'espalda', 'jalon',     'polea',      'principiante', 'Lleva la barra al pecho, no a la nuca. Sin balancear el torso.'),
  ('Dominadas asistidas',           'espalda', 'jalon',     'maquina',    'intermedio',   'Sube hasta pasar la barbilla. Baja controlado, sin soltarte.'),
  ('Remo con barra',                'espalda', 'jalon',     'barra',      'avanzado',     'Torso a 45 grados y quieto. Si se mueve, hay demasiado peso.'),
  ('Face pull con banda',           'espalda', 'jalon',     'banda',      'principiante', 'A la altura de la cara. Termina con los codos atrás.'),

  ('Sentadilla libre',              'pierna',  'sentadilla','ninguno',    'principiante', 'Rodillas hacia afuera. Baja hasta donde la espalda siga recta.'),
  ('Sentadilla con barra',          'pierna',  'sentadilla','barra',      'avanzado',     'Aire adentro antes de bajar. La barra va sobre el medio del pie.'),
  ('Sentadilla goblet',             'pierna',  'sentadilla','kettlebell', 'principiante', 'La pesa pegada al pecho. Codos por dentro de las rodillas.'),
  ('Prensa de piernas',             'pierna',  'sentadilla','maquina',    'principiante', 'No estires del todo la rodilla arriba.'),
  ('Peso muerto rumano',            'pierna',  'bisagra',   'mancuernas', 'intermedio',   'Cadera atrás, no sentadilla. Se siente atrás del muslo.'),
  ('Puente de glúteo',              'pierna',  'bisagra',   'ninguno',    'principiante', 'Aprieta arriba dos segundos. Las costillas no se abren.'),
  ('Zancadas caminando',            'pierna',  'zancada',   'mancuernas', 'intermedio',   'Paso largo. La rodilla de atrás baja, no toca el suelo de golpe.'),
  ('Zancada búlgara',               'pierna',  'zancada',   'banco',      'avanzado',     'El pie de atrás solo hace equilibrio. El peso va adelante.'),
  ('Elevación de talones',          'pierna',  'empuje',    'ninguno',    'principiante', 'Sube lento y baja más lento todavía.'),

  ('Press militar con mancuernas',  'hombro',  'empuje',    'mancuernas', 'intermedio',   'Costillas abajo. Si la espalda se arquea, baja el peso.'),
  ('Elevaciones laterales',         'hombro',  'empuje',    'mancuernas', 'principiante', 'Hasta la altura del hombro, no más. Poco peso, esto no es fuerza.'),
  ('Pájaros con banda',             'hombro',  'jalon',     'banda',      'principiante', 'Torso inclinado. Abre con los codos, no con las manos.'),

  ('Curl de bíceps con mancuernas', 'brazo',   'jalon',     'mancuernas', 'principiante', 'Codos pegados al cuerpo. Sin impulso de espalda.'),
  ('Extensión de tríceps en polea', 'brazo',   'empuje',    'polea',      'principiante', 'Solo se mueve el antebrazo. El codo queda fijo.'),

  ('Plancha frontal',               'core',    'core',      'ninguno',    'principiante', 'Glúteos apretados. Si la cadera cae, se termina la serie.'),
  ('Plancha lateral',               'core',    'core',      'ninguno',    'intermedio',   'Cadera arriba. El hombro justo encima del codo.'),
  ('Dead bug',                      'core',    'core',      'ninguno',    'principiante', 'La espalda baja no se despega del piso. Ese es el ejercicio.'),
  ('Elevación de piernas colgado',  'core',    'core',      'barra',      'avanzado',     'Sin balancearse. Baja controlado.'),

  ('Caminata inclinada',            'cardio',  'cardio',    'maquina',    'principiante', 'Sin agarrarse de las barras: eso quita la mitad del trabajo.'),
  ('Saltos de cuerda',              'cardio',  'cardio',    'ninguno',    'intermedio',   'Saltos bajos. El movimiento sale de la muñeca.')
on conflict (nombre) do nothing;


-- ---------------------------------------------------------------------
-- 2. RUTINAS
-- ---------------------------------------------------------------------
--
-- Una rutina es UNA sesión, y es reutilizable: la misma "Empuje A"
-- puede estar en el plan de ocho clientes distintos. Lo que NO se
-- comparte es el plan.

-- La última va marcada como PÚBLICA: es la muestra gratis que ve un
-- visitante. Se eligió a propósito la de casa y sin equipo — es la que
-- alguien que no conoce al entrenador puede hacer hoy mismo sin gastar
-- nada. Si la muestra fuera "Pierna A" con barra, el visitante no la
-- puede ni intentar y no sirve de gancho.
insert into rutinas (nombre, nivel, duracion_min, notas, publica) values
  ('Empuje A',              'principiante', 45, 'Pecho, hombro y tríceps. Descansos cortos.', false),
  ('Jalón A',               'principiante', 45, 'Espalda y bíceps. Prioridad a la técnica sobre el peso.', false),
  ('Pierna A',              'principiante', 50, 'La sesión más pesada de la semana. Calentar bien.', false),
  ('Cuerpo completo casa',  'principiante', 30, 'Sin equipo. Para cuando no se puede ir al gimnasio.', true)
on conflict (nombre) do nothing;


-- Los ejercicios de cada rutina.
--
-- Fíjate cómo se enlaza: por NOMBRE, no por número de id. Los id los
-- genera la base sola y cambian según el orden en que se corran las
-- cosas, así que escribirlos a mano aquí rompería el archivo la segunda
-- vez que se corre. Buscar por nombre es el BUSCARV de toda la vida.
insert into rutina_ejercicios
  (rutina_id, ejercicio_id, orden, series, reps, descanso_seg, nota)
select r.id, e.id, v.orden, v.series, v.reps, v.descanso, v.nota
from (values
  -- EMPUJE A
  ('Empuje A', 'Press de banca con barra',       1, 4, '8-10', 90, null),
  ('Empuje A', 'Press inclinado con mancuernas', 2, 3, '10-12', 75, null),
  ('Empuje A', 'Press militar con mancuernas',   3, 3, '10',    75, null),
  ('Empuje A', 'Elevaciones laterales',          4, 3, '12-15', 45, 'Peso bajo, sin trampa.'),
  ('Empuje A', 'Extensión de tríceps en polea',  5, 3, '12',    45, null),
  ('Empuje A', 'Plancha frontal',                6, 3, '30 s',  45, null),

  -- JALÓN A
  ('Jalón A',  'Jalón al pecho en polea',        1, 4, '10',    90, null),
  ('Jalón A',  'Remo con mancuerna a una mano',  2, 3, '10-12', 75, 'Por lado.'),
  ('Jalón A',  'Face pull con banda',            3, 3, '15',    45, null),
  ('Jalón A',  'Curl de bíceps con mancuernas',  4, 3, '12',    45, null),
  ('Jalón A',  'Dead bug',                       5, 3, '8',     45, 'Por lado, lento.'),

  -- PIERNA A
  ('Pierna A', 'Sentadilla goblet',              1, 4, '10',    90, 'Calentar con una serie sin peso.'),
  ('Pierna A', 'Peso muerto rumano',             2, 4, '10-12', 90, null),
  ('Pierna A', 'Zancadas caminando',             3, 3, '10',    75, 'Por pierna.'),
  ('Pierna A', 'Puente de glúteo',               4, 3, '15',    45, null),
  ('Pierna A', 'Elevación de talones',           5, 3, '15-20', 45, null),

  -- CUERPO COMPLETO EN CASA
  ('Cuerpo completo casa', 'Flexiones de pecho', 1, 3, '10-12', 60, 'De rodillas si hace falta.'),
  ('Cuerpo completo casa', 'Sentadilla libre',   2, 3, '15',    60, null),
  ('Cuerpo completo casa', 'Puente de glúteo',   3, 3, '15',    45, null),
  ('Cuerpo completo casa', 'Plancha frontal',    4, 3, '30 s',  45, null),
  ('Cuerpo completo casa', 'Saltos de cuerda',   5, 3, '60 s',  60, 'Si no hay cuerda, trote en el sitio.')
) as v(rutina, ejercicio, orden, series, reps, descanso, nota)
join rutinas    r on r.nombre = v.rutina
join ejercicios e on e.nombre = v.ejercicio
on conflict (rutina_id, orden) do nothing;


-- ---------------------------------------------------------------------
-- 3. UNA PLANTILLA — el molde
-- ---------------------------------------------------------------------
--
-- El cliente nunca ve esto. Es la hoja modelo que él duplica.

insert into plantillas (nombre, semanas, nivel, dias_semana, notas) values
  ('Fuerza básica 3 días', 4, 'principiante', 3,
   'Lunes, miércoles y viernes. Sirve para casi todo el que arranca.')
on conflict (nombre) do nothing;


-- Los 12 días de la plantilla: 4 semanas x 3 días.
--
-- Se generan con un cruce en vez de escribir 12 líneas iguales.
-- generate_series(1,4) es "arrastrar hacia abajo" cuatro veces, y el
-- cross join es la tabla dinámica que combina cada semana con cada día.
insert into plantilla_dias (plantilla_id, semana, dia, rutina_id)
select p.id, s.semana, d.dia, r.id
from plantillas p
cross join generate_series(1, 4) as s(semana)
cross join (values (1, 'Empuje A'), (3, 'Jalón A'), (5, 'Pierna A'))
        as d(dia, rutina)
join rutinas r on r.nombre = d.rutina
where p.nombre = 'Fuerza básica 3 días'
on conflict (plantilla_id, semana, dia) do nothing;
-- Los días 2, 4, 6 y 7 no existen aquí, y eso significa descanso. No se
-- guardan filas vacías para representar "no hay nada".


-- ---------------------------------------------------------------------
-- 4. RECETAS — genéricas, iguales para todos
-- ---------------------------------------------------------------------
--
-- OJO: ninguna de estas filas se conecta con ningún cliente, y no se
-- puede conectar aunque uno quiera: el esquema no tiene por dónde. Es
-- lo que mantiene esto del lado legal en Colombia. Si alguna vez
-- aparece aquí un "para clientes con objetivo X", se cruzó la línea de
-- la Ley 73 de 1979. Ver CLAUDE.md, sección PARAR, punto 1.
--
-- Los ingredientes van en jsonb —una lista dentro de una sola celda—
-- porque no hay nada que consultar por ingrediente. El día que haya que
-- buscar "recetas sin lactosa", esto pasa a ser su propia tabla.

-- Dos van marcadas como públicas (la última columna): las ve cualquiera
-- que abra la app sin código. El resto es de clientes.
insert into recetas (nombre, momento, porciones, ingredientes, pasos, publica) values
  ('Avena con banano y canela', 'desayuno', 1,
   '["1 taza de avena en hojuelas","1 banano","1 taza de leche o agua","Canela al gusto"]',
   'Cocina la avena con la leche a fuego bajo, revolviendo, unos 5 minutos. Agrega el banano en rodajas y la canela.',
   true),

  ('Huevos revueltos con espinaca', 'desayuno', 1,
   '["3 huevos","1 puñado de espinaca","1 cucharadita de aceite","Sal y pimienta"]',
   'Saltea la espinaca 1 minuto. Agrega los huevos batidos y revuelve a fuego bajo hasta que cuajen.',
   false),

  ('Arroz con pollo y ensalada', 'almuerzo', 2,
   '["2 pechugas de pollo","2 tazas de arroz cocido","Lechuga, tomate y cebolla","Limón y aceite"]',
   'Sella el pollo por ambos lados y termínalo tapado 8 minutos. Sirve con el arroz y la ensalada aliñada con limón y aceite.',
   true),

  ('Bandeja de lentejas', 'almuerzo', 4,
   '["2 tazas de lentejas","1 zanahoria","1 cebolla","2 dientes de ajo","Arroz para acompañar"]',
   'Cocina las lentejas con la zanahoria y la cebolla picadas hasta que estén blandas. Acompaña con arroz.',
   false),

  ('Pollo al horno con verduras', 'cena', 2,
   '["2 presas de pollo","1 calabacín","1 pimentón","1 cebolla","Aceite, sal y hierbas"]',
   'Corta las verduras en trozos grandes, mézclalas con aceite y hierbas, y hornea todo junto 35 minutos a 200 grados.',
   false),

  ('Batido de fruta y avena', 'snack', 1,
   '["1 taza de fruta","2 cucharadas de avena","1 taza de leche o bebida vegetal"]',
   'Licúa todo hasta que quede suave. Si queda muy espeso, agrega agua.',
   false)
on conflict (nombre) do nothing;


insert into planes_comida (nombre, objetivo, publicado) values
  ('Semana equilibrada',       'mantenimiento', true),
  ('Semana alta en proteína',  'fuerza',        true)
on conflict do nothing;


-- ---------------------------------------------------------------------
-- 5. UN RETO
-- ---------------------------------------------------------------------
--
-- Existir no mete a nadie: aparecer en la tabla de posiciones son dos
-- decisiones separadas del cliente (entrar al reto, y hacerse visible).
-- Ver la política de reto_participantes en el archivo 02.

insert into retos (nombre, descripcion, inicio, fin, meta_sesiones) values
  ('Reto de enero',
   'Doce entrenamientos completados durante el mes. Participar es opcional.',
   date '2027-01-01', date '2027-01-31', 12)
on conflict do nothing;


-- =====================================================================
-- 6. EL CLIENTE DE PRUEBA — se corre APARTE, cuando ya exista la cuenta
-- =====================================================================
--
-- No se puede sembrar un cliente desde aquí: un perfil necesita una
-- cuenta de acceso, y esas se crean en el panel (Authentication ->
-- Users). El paso 6 de PASOS-FASE-2.md lo explica.
--
-- Cuando ya tengas creada la cuenta del cliente de prueba y su perfil,
-- quita los guiones de estas líneas, cambia el correo, y córrelas. Le
-- arma un plan de 4 semanas a partir de la plantilla:
--
--   select clonar_plantilla(
--     (select id from plantillas where nombre = 'Fuerza básica 3 días'),
--     (select id from perfiles
--       where id = (select id from auth.users
--                    where email = 'prueba@ejemplo.com')),
--     current_date,   -- arranca hoy
--     3               -- meta: 3 entrenamientos por semana
--   );
--
-- Y con eso ya se puede correr la prueba que cierra la Fase 2 (está al
-- final del archivo 02): hacerte pasar por ese cliente y comprobar que
-- ve su plan y NO ve nada de nadie más.
-- =====================================================================
