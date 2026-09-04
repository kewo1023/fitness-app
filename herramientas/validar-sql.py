#!/usr/bin/env python3
"""Pasa los archivos de supabase/ por el parser REAL de Postgres.

    python3 herramientas/validar-sql.py supabase/*.sql

POR QUÉ EXISTE. El SQL de este proyecto no se corre desde aquí: se pega
a mano en el SQL Editor de Supabase. O sea que un paréntesis de más se
descubre después de haber pegado media base de datos, con la mitad
aplicada y la otra mitad no.

Esto lo atrapa antes. Usa `pglast`, que envuelve `libpg_query`, que es
literalmente el parser que trae Postgres: no es una aproximación con
expresiones regulares.

    pip install pglast

LO QUE ESTO **NO** DICE, y conviene tenerlo claro para no confiarse:
parsear comprueba la SINTAXIS. No dice que las tablas existan, ni que
las columnas se llamen así, ni que una política haga lo que uno cree.
Eso solo lo dice correrlo y después la prueba de suplantación del paso 8
de PASOS-FASE-2.md.

=====================================================================
EL RODEO DE LOS TRIGGERS, que es la parte no obvia de este archivo
=====================================================================

`parse_plpgsql` se ahoga con las funciones que devuelven `trigger`:
libpg_query serializa mal el JSON de los datums `new` y `old` y sale un
texto que ni siquiera es JSON válido. Falla igual con `otorgar_xp`, que
lleva corriendo en producción desde el 1/09 — o sea que es la
herramienta, no el SQL.

Como saltárselas dejaría sin revisar justo las dos funciones que se
disparan solas (el XP y los logros), el cuerpo se comprueba metiéndolo
en un andamio: la misma función escrita como función normal, con `new`,
`old` y `tg_op` declarados a mano. El cuerpo que se parsea es idéntico;
lo único que cambia es la envoltura que la herramienta no digiere.
"""

import json
import re
import sys

try:
    from pglast.parser import parse_sql, parse_plpgsql_json
except ImportError:
    sys.exit("Falta pglast. Instálalo con:  pip install pglast")


ANDAMIO = """
create or replace function %s()
returns sesiones language plpgsql as $$
declare
  new sesiones%%rowtype;
  old sesiones%%rowtype;
  tg_op text;
%s
$$;
"""


def cuerpo_de(bloque):
    """De 'as $$' hasta el '$$;' final, sin el `declare` propio.

    Se le quita porque el andamio ya abrió el suyo, y dos `declare`
    seguidos no son PL/pgSQL válido."""
    inicio = bloque.index("as $$") + len("as $$")
    dentro = bloque[inicio:bloque.rindex("$$;")]
    return re.sub(r"^\s*declare\s*$", "", dentro, count=1, flags=re.M)


def revisar(ruta):
    sql = open(ruta, encoding="utf-8").read()

    try:
        sentencias = len(parse_sql(sql))
    except Exception as e:
        print(f"FALLA sintaxis  {ruta}\n   {e}")
        return None

    cuerpos = 0
    for bloque in re.findall(r"create or replace function.*?\$\$;", sql, re.S):
        nombre = re.search(r"function (\w+)", bloque).group(1)
        prueba = (ANDAMIO % (nombre + "_prueba", cuerpo_de(bloque))
                  if "returns trigger" in bloque else bloque)
        try:
            json.loads(parse_plpgsql_json(prueba))
            cuerpos += 1
        except Exception as e:
            print(f"FALLA PL/pgSQL  {ruta} -> {nombre}\n   {e}")
            return None

    print(f"ok  {ruta}: {sentencias} sentencias, {cuerpos} cuerpos PL/pgSQL")
    return sentencias, cuerpos


def main(rutas):
    if not rutas:
        sys.exit(__doc__)

    resultados = [revisar(r) for r in rutas]
    if any(r is None for r in resultados):
        sys.exit(1)

    # La prueba negativa. Un validador que nunca ha dicho que no es
    # indistinguible de uno que siempre dice que sí, y este se corre
    # justo cuando uno quiere oír que todo está bien.
    roto = ANDAMIO % ("roto", "begin if new.completada then return new; end")
    try:
        json.loads(parse_plpgsql_json(roto))
        sys.exit("PRUEBA NEGATIVA FALLIDA: no detectó un 'if' sin cerrar.")
    except SystemExit:
        raise
    except Exception:
        pass

    print(f"\nTOTAL: {sum(r[0] for r in resultados)} sentencias, "
          f"{sum(r[1] for r in resultados)} cuerpos PL/pgSQL")
    print("La prueba negativa pasa: el validador sí detecta errores.")
    print("\nOJO: esto dice que la sintaxis está bien. No dice que las "
          "tablas existan\nni que las políticas hagan lo que crees. "
          "Eso es correrlo y suplantar los roles.")


if __name__ == "__main__":
    main(sys.argv[1:])
