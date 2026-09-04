# =====================================================================
# generar-laminas-grupos.py — las 7 laminas de grupo muscular
# =====================================================================
#
# Dibuja public/ilustraciones/grupos/*.svg: una silueta humana con la
# zona del grupo resaltada. Se usan en la portada de la pestana
# Ejercicios, la que muestra las categorias antes de los ejercicios.
#
# POR QUE SE DIBUJAN AQUI Y NO SE BUSCAN.
#
# Las 30 laminas de ejercicios son de terceros (Everkinetic, CC BY-SA
# 4.0) y por eso existe la pantalla de Creditos. Meter 7 dibujos mas de
# otra fuente significaria revisar otra licencia, sumar otra atribucion
# y arriesgarse a mezclar dos estilos. Estas figuras son formas
# geometricas simples —ovalos y rectangulos redondeados— asi que sale
# mas barato dibujarlas que buscarlas, y no le deben nada a nadie.
#
# EL TRUCO DE LA TRANSPARENCIA, que es lo unico no obvio de este
# archivo. Estos SVG no se muestran como imagen: se usan de PLANTILLA
# (mask-image) y el color lo pone --lamina desde theme.css (regla 15 de
# CLAUDE.md). Una plantilla no tiene colores, solo tiene "por aqui se
# pinta" y "por aqui no" — pero SI admite grados intermedios.
#
# Eso es lo que hace posible la figura completa en gris palido con una
# sola zona a color, usando un unico color: el cuerpo va dibujado al
# 26% de opacidad y la zona resaltada al 100%. En la lamina eso se
# traduce en "pinta el cuerpo flojito y la zona fuerte". Es el mismo
# efecto de un mapa donde un pais esta resaltado y los demas se ven
# tenues, pero sin necesitar dos colores.
#
# Como se corre:
#
#     python3 herramientas/generar-laminas-grupos.py
#
# =====================================================================

import os

DESTINO = 'public/ilustraciones/grupos'

# Cuanto se ve el cuerpo que NO es el grupo resaltado. Si sube mucho, la
# zona resaltada deja de distinguirse; si baja mucho, la figura
# desaparece y el dibujo no se lee como un cuerpo.
FANTASMA = '.24'

# --- Las piezas del cuerpo, compartidas por las 7 laminas ------------
# Cada pieza tiene nombre porque las laminas la reutilizan al 100% de
# opacidad cuando esa pieza ES el grupo resaltado: el brazo resaltado no
# es un dibujo nuevo, es el mismo brazo pintado fuerte. Asi la zona
# encaja exacta con la silueta y no queda un borde desalineado.
PIEZAS = {
    'cabeza':   '<circle cx="256" cy="92" r="36"/>',
    'cuello':   '<path d="M238 124h36v26h-36z"/>',
    'hombros':  '<rect x="174" y="146" width="164" height="56" rx="28"/>',
    'torso':    '<path d="M186 188H326L302 338H210Z"/>',
    'cadera':   '<rect x="206" y="320" width="100" height="54" rx="22"/>',
    'brazo_i':  '<rect x="146" y="166" width="40" height="168" rx="20" '
                'transform="rotate(-6 166 166)"/>',
    'brazo_d':  '<rect x="326" y="166" width="40" height="168" rx="20" '
                'transform="rotate(6 346 166)"/>',
    'pierna_i': '<rect x="204" y="356" width="46" height="136" rx="22"/>',
    'pierna_d': '<rect x="262" y="356" width="46" height="136" rx="22"/>',
}

TODAS = list(PIEZAS)

# --- Que resalta cada grupo -------------------------------------------
# Dos formas de resaltar, y la eleccion no es de estilo:
#
#   'piezas'  — el grupo ES una parte entera del cuerpo (brazo, pierna).
#               Se repinta la misma pieza al 100%.
#   'extra'   — el grupo es un musculo DENTRO de una pieza (el pecho
#               esta dentro del torso). Se dibuja una forma encima.
#
GRUPOS = {
    'pecho': {
        # Dos losas inclinadas, no dos ovalos. Los ovalos, con la
        # cabeza justo encima, se leian como un par de ojos y la lamina
        # entera parecia una cara. El borde inferior en diagonal hacia
        # el esternon es lo que la vuelve un pecho.
        'extra': '<path d="M192 206H250V240L196 254Z"/>'
                 '<path d="M320 206H262V240L316 254Z"/>'
    },
    'espalda': {
        # Los dorsales, vistos desde el frente como las dos "alas" que
        # ensanchan el torso. Un dibujo de espaldas obligaria a una
        # segunda silueta completa para una sola lamina.
        'extra': '<path d="M190 200 216 216 208 316 194 300Z"/>'
                 '<path d="M322 200 296 216 304 316 318 300Z"/>'
    },
    'pierna': {'piezas': ['pierna_i', 'pierna_d'],
               'extra': '<rect x="206" y="320" width="100" height="54" rx="22"/>'},
    'hombro': {'extra': '<circle cx="192" cy="174" r="29"/>'
                        '<circle cx="320" cy="174" r="29"/>'},
    'brazo':  {'piezas': ['brazo_i', 'brazo_d']},
    'core':   {'extra': '<path d="M214 262H298L292 336H220Z"/>'},
    'cardio': {
        # Cardio no es un musculo, asi que no hay zona que pintar. Un
        # corazon sobre el pecho se lee de una y mantiene la lamina
        # dentro del mismo juego que las otras seis.
        'extra': '<path d="M256 292c-46-30-62-56-62-80 0-22 17-36 36-36 '
                 '12 0 21 6 26 15 5-9 14-15 26-15 19 0 36 14 36 36 '
                 '0 24-16 50-62 80z"/>'
    },
}


def lamina(clave):
    resalta = GRUPOS[clave]
    fuertes = resalta.get('piezas', [])
    tenues = [p for p in TODAS if p not in fuertes]

    partes = [
        # EL viewBox VA RECORTADO A LA FIGURA, no al lienzo de 512.
        # La silueta es alta y angosta (220 de ancho por 436 de alto) y
        # dentro de un cuadrado quedaba flotando en el medio con aire a
        # los lados; como la tarjeta es 4:3 y la lamina se ajusta por
        # 'contain', ese aire se sumaba al de la tarjeta y la figura se
        # veia diminuta. Recortando el viewBox, el dibujo llena el alto.
        '<svg xmlns="http://www.w3.org/2000/svg" '
        'viewBox="138 48 236 456">',
        # El cuerpo, flojito.
        f'<g fill="#fff" fill-opacity="{FANTASMA}">',
        *[PIEZAS[p] for p in tenues],
        '</g>',
        # La zona del grupo, a fondo.
        '<g fill="#fff">',
        *[PIEZAS[p] for p in fuertes],
        resalta.get('extra', ''),
        '</g>',
        '</svg>',
    ]
    return ''.join(partes)


if __name__ == '__main__':
    os.makedirs(DESTINO, exist_ok=True)
    for clave in GRUPOS:
        ruta = f'{DESTINO}/{clave}.svg'
        with open(ruta, 'w', encoding='utf-8') as f:
            f.write(lamina(clave))
        print(f'  {ruta}  {os.path.getsize(ruta)} B')
