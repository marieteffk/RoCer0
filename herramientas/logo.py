# Crea el logo de RoCer0 (icons/logo.png) y los iconos de la extensión (icons/icon-16.png a icon-128.png)
# a partir del logo original de Cero: el cero claro sobre fondo negro. Si la imagen trae debajo una franja
# transparente con texto, no cuenta: solo se usa el cuadrado opaco de arriba. Necesita Pillow y NumPy.
# Uso: python3 logo.py <logo-original.png> <carpeta de iconos>
import sys, os
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
im = Image.open(src).convert('RGBA')
a = np.asarray(im)
# El cuadrado del logo: filas totalmente opacas desde arriba.
opaque = np.where(a[..., 3].min(axis=1) == 255)[0]
h = int(opaque.max()) + 1
gray = im.crop((0, 0, im.width, h)).convert('L')
L = np.asarray(gray)
ys, xs = np.where(L > 25)
cx, cy = (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2
glyph_h = ys.max() - ys.min() + 1

def crop(side, work):
    # Recorte cuadrado centrado en el cero, a la resolución de trabajo.
    half = side / 2
    box = (int(round(cx - half)), int(round(cy - half)), int(round(cx + half)), int(round(cy + half)))
    return gray.crop(box).resize((work, work), Image.LANCZOS)

def hint(img, lift, grow):
    # Para tamaños pequeños: aclara el trazo (sin tocar el brillo de alrededor) y lo engorda un poco.
    m = np.asarray(img).astype(float)
    stroke = m > 60
    m[stroke] = np.maximum(m[stroke], lift)
    img = Image.fromarray(m.clip(0, 255).astype('uint8'))
    return img.filter(ImageFilter.MaxFilter(grow)) if grow > 1 else img

def rounded(g, size, radius_ratio=0.22):
    g = g.resize((size, size), Image.LANCZOS)
    rgba = Image.merge('RGBA', (g, g, g, Image.new('L', (size, size), 255)))
    mask = Image.new('L', (size * 4, size * 4), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size * 4 - 1, size * 4 - 1), round(size * 4 * radius_ratio), fill=255)
    rgba.putalpha(mask.resize((size, size), Image.LANCZOS))
    return rgba

# tamaño: (lado del recorte respecto al alto del cero, aclarado mínimo del trazo, engorde a 8 veces el tamaño)
plan = {16: (1.12, 175, 11), 32: (1.18, 150, 9), 48: (1.25, 130, 7), 96: (1.33, 0, 1), 128: (1.33, 0, 1)}
for size, (k, lift, grow) in plan.items():
    work = crop(glyph_h * k, size * 8)
    if lift: work = hint(work, lift, grow)
    rounded(work, size).save(os.path.join(out, f'icon-{size}.png'), optimize=True)
# Logo grande para la extensión y el README.
rounded(crop(glyph_h * 1.33, 1024), 256).save(os.path.join(out, 'logo.png'), optimize=True)
print('cero de', int(glyph_h), 'px, centro', (round(cx), round(cy)), '->', out)
