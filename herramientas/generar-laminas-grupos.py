# =====================================================================
# generar-laminas-grupos.py — las 7 laminas de grupo muscular
# =====================================================================
#
# Dibuja public/ilustraciones/grupos/*.svg: la parte del cuerpo que
# trabaja cada grupo, con el musculo resaltado. Se usan en la portada de
# la pestana Ejercicios.
#
# =====================================================================
# TERCERA VERSION. QUE SE APRENDIO DE LAS DOS ANTERIORES
# =====================================================================
#
# v1 (3/09): un muneco completo con la zona pintada. Rechazado: "cero
#     profesional". El cuerpo era una suma de rectangulos y circulos.
#
# v2 (4/09): el musculo SOLO, sin cuerpo. Peor. Y el motivo es el
#     hallazgo que manda sobre esta version: un biceps y un cuadriceps
#     aislados SON LOS DOS UN HUSO. Sin un cuerpo alrededor no hay nada
#     que los distinga. Lo unico que funciono fueron `core`, `espalda` y
#     `cardio`, y no porque fueran mejor dibujo: porque la parrilla del
#     abdomen, la V de la espalda y el corazon son formas que cualquiera
#     reconoce solas.
#
# v3, esta: vuelve el cuerpo —hacia falta— pero con dos cambios.
#
#   1. SE ENCUADRA LA PARTE, no el cuerpo entero. El brazo se dibuja
#      como un brazo, las piernas como piernas. Antes todas las laminas
#      eran la misma figura de cuerpo entero con una zona distinta
#      pintada, asi que la zona salia diminuta y las siete se veian
#      iguales de lejos. Es la idea que se saco de la referencia.
#
#   2. EL CUERPO SE DIBUJA CON CURVAS, no con rectangulos. Un contorno
#      que se ensancha en el hombro y se cierra en la cintura se lee
#      como un cuerpo; una pila de cajas se lee como un muneco de
#      juguete, que es lo que se rechazo.
#
# LO QUE NO CAMBIA, Y ES UNA RESTRICCION DEL PROYECTO: una sola tinta.
# La referencia usaba gris + rojo, pero un rojo nuevo en la paleta choca
# con la regla del cobre de senal ("un solo lugar donde la app grita").
# Asi que la separacion sigue saliendo de la OPACIDAD: el cuerpo al 22%,
# el musculo al 100%. Se pintan con mask-image (regla 15), y una
# mascara admite grados de transparencia aunque no admita colores.
#
# Como se corre:
#
#     python3 herramientas/generar-laminas-grupos.py
#
# =====================================================================

import os

DESTINO = 'public/ilustraciones/grupos'

# Cuanto se ve el cuerpo que NO es el musculo resaltado. Mas bajo que en
# v1 (era .24): con el encuadre cerrado el cuerpo ocupa mucho mas de la
# lamina, y al 24% competia con el musculo en vez de servirle de marco.
FANTASMA = '.22'


# ---------------------------------------------------------------------
# LOS CUERPOS. Uno por encuadre, no uno para todas.
# ---------------------------------------------------------------------
# Cada uno trae su viewBox, porque un torso y unas piernas no tienen la
# misma proporcion y forzarlos al mismo cuadro deja aire muerto.

TORSO_FRENTE = ('20 6 200 268', '''
  <path d="M110 8h20q2 18 6 24 22 6 44 18 14 8 17 24 4 22 2 44
           -1 14-5 26-3 9-9 10-5 1-7-5-3-9-4-20-1 26 3 50 3 20 6 40
           2 12-1 22-14 5-30 6h-64q-16-1-30-6-3-10-1-22 3-20 6-40
           4-24 3-50-3 11-4 20-2 6-7 5-6-1-9-10-4-12-5-26-2-22 2-44
           3-16 17-24 22-12 44-18 4-6 6-24z"/>''')

TORSO_ESPALDA = ('20 6 200 268', '''
  <path d="M110 8h20q2 18 6 24 22 6 44 18 14 8 17 24 4 22 2 44
           -1 14-5 26-3 9-9 10-5 1-7-5-3-9-4-20-1 26 3 50 3 20 6 40
           2 12-1 22-14 5-30 6h-64q-16-1-30-6-3-10-1-22 3-20 6-40
           4-24 3-50-3 11-4 20-2 6-7 5-6-1-9-10-4-12-5-26-2-22 2-44
           3-16 17-24 22-12 44-18 4-6 6-24z"/>''')

# El brazo, flexionado: es la unica postura en la que un biceps se lee
# como un biceps. Recto seria otra vez un huso.
# El brazo FLEXIONADO, que es la unica postura donde un biceps se lee
# como un biceps; recto seria otra vez un huso. Y se dibuja con su
# esqueleto —dos capsulas y dos bolas— en vez de con un contorno: el
# intento de contorno salio un gancho.
BRAZO = ('2 8 190 196', """
  <path d="M6 16q24-4 36 12 7 9 8 20l3 30q1 22-4 40l-7 40q-2 12-13 12H6z"/>
  <ellipse cx="66" cy="54" rx="25" ry="25"/>
  <line x1="68" y1="58" x2="94" y2="138" stroke-width="46"/>
  <line x1="94" y1="138" x2="158" y2="74" stroke-width="36"/>""")

# EL BRAZO LLEVA UN TROZO DE TORSO, y esa es la correccion del 4/09
# (cuarta vuelta). Sin el, la figura eran dos capsulas en angulo y se
# leia como un CHECK: nada decia por que ese codo estaba doblado.
#
# Es la misma leccion de v2 aplicada una vez mas: lo que hace legible un
# musculo NO es dibujarlo mejor, es lo que tiene alrededor. Un biceps
# aislado es un huso; un biceps colgando de un hombro que sale de un
# pecho es un brazo. Las otras seis laminas ya tenian ese marco gratis
# porque el torso venia incluido.
#
# El torso va cortado por el borde izquierdo a proposito: se lee como
# "esto continua" y no como un cuerpo mal dibujado al que le falta el
# otro lado.
#
# Y va ESTRECHO. El primer intento le dio el ancho de un torso de
# verdad y el resultado fue una pared gris que tapaba el brazo: el
# biceps quedaba encima del pecho en vez de sobre el brazo. Aqui el
# torso no es el tema, es la pista de que hay un cuerpo; en cuanto pide
# mas espacio del necesario, estorba.

PIERNAS = ('12 4 176 264', '''
  <path d="M52 10h96q9 0 10 11l3 45q2 21-3 41l-11 60q-5 29-7 59l-3 34
           q-1 9-10 9t-10-9l-6-46q-3-25-6-50-3 25-6 50l-6 46
           q-1 9-10 9t-10-9l-3-34q-2-30-7-59l-11-60q-5-20-3-41l3-45
           q1-11 10-11z"/>''')


# ---------------------------------------------------------------------
# QUE RESALTA CADA GRUPO
# ---------------------------------------------------------------------
# La forma va DENTRO del contorno del cuerpo, no encima ni al lado. Es
# lo que hace que se lea como "este musculo de este cuerpo" y no como
# dos dibujos superpuestos.

GRUPOS = {
    # Los dos pectorales. Borde recto al centro (el esternon) y el
    # inferior en diagonal: es lo que los separa de dos ovalos, que en
    # v2 se leian como un par de ojos.
    'pecho': (TORSO_FRENTE, '''
      <path d="M116 66q-24 2-40 10-8 5-9 15-1 12 6 20 16 8 34 6 9-2 9-12z"/>
      <path d="M124 66q24 2 40 10 8 5 9 15 1 12-6 20-16 8-34 6-9-2-9-12z"/>'''),

    # Los dorsales: las dos alas que ensanchan la espalda y cierran en la
    # cintura. Es la V, que fue la unica forma que funciono en v2.
    'espalda': (TORSO_ESPALDA, '''
      <path d="M112 64q-26 4-44 16-8 5-9 16-2 24 4 46 4 16 12 30
               8 12 22 16-2-32 4-62 4-22 11-42z"/>
      <path d="M128 64q26 4 44 16 8 5 9 16 2 24-4 46-4 16-12 30
               -8 12-22 16 2-32-4-62-4-22-11-42z"/>'''),

    # El deltoides y sus tres haces. Encaja sobre el hombro del torso.
    # El deltoides. En la vuelta anterior quedaba FUERA del torso,
    # flotando a los lados como dos orejas: las coordenadas venian del
    # cuerpo de v1, que era mas ancho. Ahora se apoyan sobre el hombro
    # del contorno de v3.
    'hombro': (TORSO_FRENTE, '''
      <path d="M78 46q-16 6-24 20-7 14-6 28 1 9 9 10 8 1 12-8
               5-14 7-28 2-12 2-22z"/>
      <path d="M162 46q16 6 24 20 7 14 6 28-1 9-9 10-8 1-12-8
               -5-14-7-28-2-12-2-22z"/>'''),

    # El biceps, en el brazo flexionado. Dos cabezas arriba, un vientre.
    # El biceps, sobre el brazo. La elipse va girada 15 grados para
    # seguir la inclinacion del brazo: derecha se saldria del contorno
    # por un lado y dejaria hueco por el otro.
    # El biceps, sobre el brazo. Girada para seguir la inclinacion del
    # brazo: derecha se saldria por un lado y dejaria hueco por el otro.
    'brazo': (BRAZO,
              '<ellipse cx="80" cy="96" rx="19" ry="33" '
              'transform="rotate(18 80 96)"/>'),

    # El cuadriceps de las dos piernas, con la gota del vasto interno.
    # Los cuadriceps, uno por pierna. Antes las dos formas se
    # superponian cerca del centro y salia una sola mancha corrida a la
    # izquierda; ahora cada una vive sobre su muslo.
    'pierna': (PIERNAS, '''
      <path d="M64 46q14-6 26 0 6 3 6 12l-3 58q-2 20-7 34-3 8-8 8t-8-8
               q-5-16-6-34l-3-58q0-9 3-12z"/>
      <path d="M136 46q-14-6-26 0-6 3-6 12l3 58q2 20 7 34 3 8 8 8t8-8
               q5-16 6-34l3-58q0-9-3-12z"/>'''),

    # El recto abdominal. Ocho bloques que se angostan al bajar: la forma
    # mas reconocible de las siete, y la unica que en v2 salio bien de
    # una.
    'core': (TORSO_FRENTE, ''.join(
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="7"/>'
        for (y, h, w, x) in [
            (112, 26, 30, 88), (112, 26, 30, 122),
            (142, 26, 29, 89), (142, 26, 29, 122),
            (172, 26, 27, 91), (172, 26, 27, 122),
            (202, 30, 25, 93), (202, 30, 25, 122)])),

    # Cardio no es un musculo. El corazon sobre el pecho se lee de una y
    # mantiene la lamina dentro del mismo juego que las otras seis.
    'cardio': (TORSO_FRENTE, '''
      <path d="M120 150q-38-26-38-54 0-20 15-20 12 0 19 14 7-14 19-14
               15 0 15 20 0 28-30 54z"/>'''),
}


def lamina(cuerpo, resalte):
    viewbox, contorno = cuerpo
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{viewbox}">'
        # El cuerpo, flojito: es el marco que da la escala.
        #
        # Lleva stroke ademas de fill porque el brazo se dibuja con
        # LINEAS GRUESAS de punta redonda en vez de con un contorno. Una
        # linea con stroke-linecap="round" es una capsula perfecta, y un
        # brazo son dos capsulas y dos bolas. Intentar el mismo brazo
        # con un solo contorno de bezier salio un gancho: hay formas que
        # se describen mejor por su ESQUELETO que por su borde.
        # OJO: `opacity` en el grupo, NO `fill-opacity` en cada forma.
        #
        # No es lo mismo y costo una vuelta. Con fill-opacity, cada
        # forma se pinta translucida por separado y donde dos se
        # SUPERPONEN las transparencias se suman: en el brazo se veian
        # las costuras entre las capsulas, como un dibujo mal armado.
        # Con `opacity` en el grupo, el navegador pinta el grupo entero
        # y le aplica la transparencia UNA vez al resultado, asi que un
        # cuerpo hecho de cinco piezas se ve como una sola.
        #
        # En Excel seria la diferencia entre bajarle el color a cinco
        # celdas una por una y agruparlas para bajarselo al bloque.
        f'<g fill="#fff" stroke="#fff" opacity="{FANTASMA}" '
        f'stroke-linecap="round" stroke-linejoin="round">{contorno}</g>'
        # El musculo, a fondo.
        f'<g fill="#fff" stroke="#fff" stroke-linecap="round">{resalte}</g>'
        '</svg>'
    )


if __name__ == '__main__':
    os.makedirs(DESTINO, exist_ok=True)
    for clave, (cuerpo, resalte) in GRUPOS.items():
        ruta = f'{DESTINO}/{clave}.svg'
        with open(ruta, 'w', encoding='utf-8') as f:
            f.write(lamina(cuerpo, resalte))
        print(f'  {ruta}  {os.path.getsize(ruta)} B')
