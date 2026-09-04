# =====================================================================
# generar-iconos.py — dibuja los iconos de la app instalada
# =====================================================================
#
# POR QUE ESTE ARCHIVO EXISTE Y NO SON SOLO CUATRO PNG SUELTOS.
#
# Un PNG es un resultado, no una fuente: dentro de el no se puede leer
# de donde salio el color ni por que el dibujo tiene ese tamano. Y los
# iconos son el UNICO sitio del proyecto, aparte del theme-color de
# arranque de index.html, donde un color de la paleta queda escrito a
# mano fuera de theme.css. Eso rompe la regla 1 de CLAUDE.md, y como no
# se puede evitar —un PNG no lee variables CSS— por lo menos queda
# escrito en un archivo que se puede leer, revisar y volver a correr.
#
# Si algun dia cambia el acento en theme.css, se cambia aqui la misma
# constante y se vuelve a correr. Los cuatro archivos se rehacen igual.
#
# Como se corre (necesita Pillow, que NO es dependencia de la app:
# esto se ejecuta a mano cuando cambia el icono, no en cada build):
#
#     python3 herramientas/generar-iconos.py
#
# =====================================================================

from PIL import Image, ImageDraw

# --- Los dos colores, copiados de src/styles/theme.css ---------------
# --acento (oliva profundo) y --sobre-acento (la crema que va encima).
# Son literales a proposito y es la excepcion explicada arriba.
OLIVA = (0x5A, 0x6B, 0x45, 255)
CREMA = (0xFA, 0xF8, 0xF4, 255)

LIENZO = 1024   # se dibuja grande y se reduce: el reducir suaviza los
                # bordes solo, y sale mas limpio que dibujar a 192

DESTINO = 'public/iconos'


def dibujar_marca():
    """La pesa rusa, en crema sobre transparente.

    POR QUE UNA PESA Y NO LA LETRA "E" DE "Entrena". El nombre todavia
    no existe: "Entrena" es provisional y lo decide el entrenador. Un
    icono con una letra hay que rehacerlo el dia que cambie el nombre;
    un dibujo de lo que hace la app, no. Cuesta lo mismo hoy y es lo
    unico que sobrevive a esa decision pendiente.

    Y se dibuja con formas macizas —un ovalo y un arco grueso— porque
    en la pantalla de inicio de un Android esto se ve a 48 puntos. Una
    linea fina a ese tamano desaparece.
    """
    capa = Image.new('RGBA', (LIENZO, LIENZO), (0, 0, 0, 0))
    lapiz = ImageDraw.Draw(capa)

    # EL ASA VA PRIMERO Y VA ALTA. En el primer intento el arco tenia
    # radio 115 y el cuerpo le empezaba 60 puntos mas abajo: el ovalo
    # se comia el asa y el icono se leia como una cebolla, no como una
    # pesa. Lo que hace legible la silueta es el HUECO del asa, asi que
    # el arco tiene que sobresalir bastante y su agujero tiene que
    # quedar entero por encima del cuerpo.
    #
    # En Pillow el angulo 0 son las 3 en punto y crece en el sentido
    # del reloj, porque la Y crece hacia abajo. 180->360 seria la
    # mitad exacta de arriba; se dibuja de 168 a 372 —un poco de mas
    # por cada lado— para que las dos puntas bajen hasta donde el
    # ovalo ya es ancho y lo tapa. Cortarlo justo en 180/360 dejaba un
    # escaloncito de treinta puntos entre la punta del asa y el borde
    # del cuerpo.
    lapiz.arc((362, 350, 662, 650), start=168, end=372,
              fill=CREMA, width=56)

    # El cuerpo, encima: tapa las puntas del asa y no hay que dibujar
    # la union. Superponer dos formas en vez de recortar una.
    lapiz.ellipse((292, 470, 732, 855), fill=CREMA)

    return capa.crop(capa.getbbox())


def escribir(marca, nombre, lado, fraccion):
    """Pega la marca centrada sobre el cuadrado oliva.

    `fraccion` es cuanto del lado ocupa la marca, y es el unico valor
    que cambia entre un icono y otro:

      - Los normales ("any") la llevan grande: se ven tal cual.
      - El "maskable" la lleva mas chica porque Android le RECORTA los
        bordes para meterlo en la forma del launcher (circulo,
        cuadrado redondeado, gota...). Solo garantiza el circulo
        central del 80%, asi que todo lo que importa vive ahi dentro.
        Sin esta version, Android mete el icono completo dentro de un
        circulo blanco con marco: se ve como un parche, no como una app.
    """
    lienzo = Image.new('RGB', (LIENZO, LIENZO), OLIVA[:3])

    ancho = int(LIENZO * fraccion)
    alto = int(marca.height * ancho / marca.width)
    encogida = marca.resize((ancho, alto), Image.LANCZOS)

    lienzo.paste(encogida,
                 ((LIENZO - ancho) // 2, (LIENZO - alto) // 2),
                 encogida)

    lienzo.resize((lado, lado), Image.LANCZOS).save(
        f'{DESTINO}/{nombre}', 'PNG', optimize=True)
    print(f'  {nombre}  {lado}x{lado}')


if __name__ == '__main__':
    marca = dibujar_marca()
    print('Iconos escritos en', DESTINO)

    # Los dos tamanos que Chrome exige para poder instalar la app.
    escribir(marca, 'icono-192.png', 192, 0.62)
    escribir(marca, 'icono-512.png', 512, 0.62)

    # El que Android recorta. Ver el comentario de escribir().
    escribir(marca, 'icono-maskable-512.png', 512, 0.48)

    # iOS no lee el manifest para esto: usa su propia etiqueta y su
    # propio tamano, y le pone las esquinas redondeadas el solo.
    escribir(marca, 'apple-touch-icon.png', 180, 0.62)
