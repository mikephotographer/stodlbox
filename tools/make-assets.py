"""Erzeugt App-Icons und das Open-Graph-Bild (einmalig lokal, nicht Teil der App).

Aufruf:  python3 tools/make-assets.py <pfad/zu/Anton-Regular.ttf> <pfad/zu/JetBrainsMono.ttf>
Braucht Pillow (pip install pillow). Schriften: Google Fonts (OFL).
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

BG = (14, 15, 16)
TEXT = (236, 238, 240)
ACCENT = (245, 196, 0)
MUTED = (154, 161, 168)
ROOT = Path(__file__).resolve().parent.parent
ANTON, MONO = sys.argv[1], sys.argv[2]


def stripes(draw, x0, y0, x1, y1, band):
    """Warnstreifen -45° im Rechteck."""
    w, h = x1 - x0, y1 - y0
    for k in range(-h, w + h, band * 2):
        draw.polygon([(x0 + k, y1), (x0 + k + band, y1), (x0 + k + band + h, y0), (x0 + k + h, y0)], fill=ACCENT)


def text_size(draw, s, font):
    l, t, r, b = draw.textbbox((0, 0), s, font=font)
    return r - l, b - t, l, t


def icon(size, plate_ratio, path, scale=4):
    S = size * scale
    img = Image.new('RGB', (S, S), BG)
    d = ImageDraw.Draw(img)
    stripes(d, 0, 0, S, S, S // 8)
    p = int(S * plate_ratio)
    o = (S - p) // 2
    d.rectangle([o, o, o + p, o + p], fill=BG)
    font = ImageFont.truetype(ANTON, int(p * 0.78))
    ws, hs, ls, ts = text_size(d, 'S', font)
    wb, hb, lb, tb = text_size(d, 'B', font)
    gap = int(p * 0.02)
    total = ws + gap + wb
    x = (S - total) // 2
    y = (S - max(hs, hb)) // 2
    d.text((x - ls, y - ts), 'S', font=font, fill=TEXT)
    d.text((x + ws + gap - lb, y - tb), 'B', font=font, fill=ACCENT)
    img.resize((size, size), Image.LANCZOS).save(path, optimize=True)
    print('ok', path)


def og(path):
    W, H, sc = 1200, 630, 2
    img = Image.new('RGB', (W * sc, H * sc), BG)
    d = ImageDraw.Draw(img)
    band = 28 * sc
    stripes(d, 0, 0, W * sc, band, 28 * sc)
    stripes(d, 0, H * sc - band, W * sc, H * sc, 28 * sc)
    big = ImageFont.truetype(ANTON, 230 * sc)
    mono = ImageFont.truetype(MONO, 34 * sc)
    mono.set_variation_by_name('Bold')
    w1, h1, l1, t1 = text_size(d, 'STODL', big)
    w2, h2, l2, t2 = text_size(d, 'BOX', big)
    x = 80 * sc
    y = 150 * sc
    d.text((x - l1, y - t1), 'STODL', font=big, fill=TEXT)
    d.text((x + w1 + 6 * sc - l2, y - t2), 'BOX', font=big, fill=ACCENT)
    d.text((x, y + h1 + 60 * sc), '// TRAINING IM STADL – TERMINE & ZUSAGEN', font=mono, fill=MUTED)
    img.resize((W, H), Image.LANCZOS).save(path, optimize=True)
    print('ok', path)


icons = ROOT / 'assets' / 'icons'
icons.mkdir(parents=True, exist_ok=True)
icon(192, 0.70, icons / 'icon-192.png')
icon(512, 0.70, icons / 'icon-512.png')
icon(512, 0.56, icons / 'maskable-512.png')   # Safe Zone für runde/abgerundete Masken
icon(180, 0.70, icons / 'apple-touch-icon.png')
icon(48, 0.74, icons / 'favicon-48.png')
og(ROOT / 'assets' / 'og.png')
