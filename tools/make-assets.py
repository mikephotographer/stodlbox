"""Erzeugt App-Icons und das Open-Graph-Bild (einmalig lokal, nicht Teil der App).

Aufruf:  python3 tools/make-assets.py <BarlowCondensed-SemiBold.ttf> <RobotoMono[wght].ttf>
Braucht Pillow (pip install pillow). Schriften: Google Fonts (OFL).

Stil „Box“: ruhiges Schwarz, „SB“ in Barlow Condensed (S weiß, B gelb), keine Streifen.
Admin-Variante: zusätzlich ein schmaler gelber Balken mit „ADMIN“, damit man die zwei Apps
am Home-Bildschirm unterscheidet.
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

BG = (26, 26, 26)
TEXT = (255, 255, 255)
ACCENT = (245, 196, 0)
MUTED = (166, 166, 171)
ROOT = Path(__file__).resolve().parent.parent
DISPLAY, MONO = sys.argv[1], sys.argv[2]


def text_size(draw, s, font):
    l, t, r, b = draw.textbbox((0, 0), s, font=font)
    return r - l, b - t, l, t


def mono(size, weight='Medium'):
    f = ImageFont.truetype(MONO, size)
    try:
        f.set_variation_by_name(weight)
    except Exception:
        pass
    return f


def icon(size, safe, path, admin=False, scale=4):
    """safe: Anteil der Kantenlänge, in dem die Schrift sitzen darf (kleiner bei maskable)."""
    S = size * scale
    img = Image.new('RGB', (S, S), BG)
    d = ImageDraw.Draw(img)
    area = S * safe
    font = ImageFont.truetype(DISPLAY, int(area * (0.80 if not admin else 0.66)))
    ws, hs, ls, ts = text_size(d, 'S', font)
    wb, hb, lb, tb = text_size(d, 'B', font)
    gap = int(area * 0.015)
    total = ws + gap + wb
    h = max(hs, hb)
    x = (S - total) // 2
    if admin:
        bar_h = int(area * 0.17)
        space = int(area * 0.07)
        block = h + space + bar_h
        y = (S - block) // 2
    else:
        y = (S - h) // 2
    d.text((x - ls, y - ts), 'S', font=font, fill=TEXT)
    d.text((x + ws + gap - lb, y - tb), 'B', font=font, fill=ACCENT)
    if admin:
        by = y + h + space
        bx0, bx1 = x, x + total
        d.rectangle([bx0, by, bx1, by + bar_h], fill=ACCENT)
        f = mono(int(bar_h * 0.62), 'Bold')
        wa, ha, la, ta = text_size(d, 'ADMIN', f)
        d.text(((bx0 + bx1 - wa) // 2 - la, by + (bar_h - ha) // 2 - ta), 'ADMIN', font=f, fill=BG)
    img.resize((size, size), Image.LANCZOS).save(path, optimize=True)
    print('ok', path)


def og(path):
    W, H, sc = 1200, 630, 2
    img = Image.new('RGB', (W * sc, H * sc), BG)
    d = ImageDraw.Draw(img)
    big = ImageFont.truetype(DISPLAY, 250 * sc)
    small = mono(30 * sc)
    w1, h1, l1, t1 = text_size(d, 'STODL', big)
    w2, h2, l2, t2 = text_size(d, 'BOX', big)
    x = 80 * sc
    y = 170 * sc
    d.text((x - l1, y - t1), 'STODL', font=big, fill=TEXT)
    d.text((x + w1 + 4 * sc - l2, y - t2), 'BOX', font=big, fill=ACCENT)
    d.text((x, y + h1 + 56 * sc), 'TRAINING IM STADL · TERMINE UND ZUSAGEN', font=small, fill=MUTED)
    img.resize((W, H), Image.LANCZOS).save(path, optimize=True)
    print('ok', path)


icons = ROOT / 'assets' / 'icons'
icons.mkdir(parents=True, exist_ok=True)
for admin, pre in ((False, ''), (True, 'admin-')):
    icon(192, 0.70, icons / f'{pre}icon-192.png', admin)
    icon(512, 0.70, icons / f'{pre}icon-512.png', admin)
    icon(512, 0.56, icons / f'{pre}maskable-512.png', admin)   # Safe Zone für runde Masken
    icon(180, 0.70, icons / f'{pre}apple-touch-icon.png', admin)
icon(48, 0.86, icons / 'favicon-48.png')
og(ROOT / 'assets' / 'og.png')
