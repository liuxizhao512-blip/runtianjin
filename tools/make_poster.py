# -*- coding: utf-8 -*-
"""Build a 1200x630 share poster that matches the Run Tianjin site style.

Design notes (mirrors styles.css):
  - warm paper background  #f5f2ee
  - deep navy ink          #102b52
  - orange accent          #d86b39
  - muted grey             #5d6570
  - tight negative letter-spacing on the big headline
  - a photo panel on the right, rounded corners, soft shadow
"""
import os

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "run-tianjin-poster-1200x630.png")

W, H = 1200, 630

BG = (245, 242, 238)
INK = (16, 43, 82)
ORANGE = (216, 107, 57)
MUTED = (93, 101, 112)
LINE = (31, 36, 41, 36)
WHITE = (255, 255, 255)

FONT_DIR = "C:/Windows/Fonts"


def font(name, size):
    return ImageFont.truetype(os.path.join(FONT_DIR, name), size)


BOLD = "arialbd.ttf"
REG = "arial.ttf"


def rounded_photo(path, size, radius=26, centering=(0.5, 0.5)):
    """Load a photo, cover-crop it to size, and round the corners."""
    img = Image.open(path).convert("RGB")
    img = ImageOps.fit(img, size, method=Image.Resampling.LANCZOS, centering=centering)
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=radius, fill=255)
    out = Image.new("RGBA", size, (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    return out


def drop_shadow(layer, blur=22, offset=(0, 12), opacity=70):
    """Return a soft shadow image for a given RGBA layer."""
    alpha = layer.split()[-1]
    shadow = Image.new("RGBA", layer.size, (16, 43, 82, opacity))
    shadow.putalpha(alpha)
    canvas = Image.new("RGBA", (layer.size[0] + blur * 4, layer.size[1] + blur * 4), (0, 0, 0, 0))
    canvas.paste(shadow, (blur * 2 + offset[0], blur * 2 + offset[1]), shadow)
    return canvas.filter(ImageFilter.GaussianBlur(blur))


def main():
    canvas = Image.new("RGBA", (W, H), BG + (255,))

    # --- subtle warm wash in the top-left, like the site's paper feel ---
    wash = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    wd = ImageDraw.Draw(wash)
    wd.ellipse((-260, -320, 620, 420), fill=(255, 255, 255, 120))
    canvas = Image.alpha_composite(canvas, wash.filter(ImageFilter.GaussianBlur(90)))

    # --- photo panel on the right ---
    photo_w, photo_h = 470, 470
    photo_x, photo_y = W - photo_w - 62, (H - photo_h) // 2
    photo = rounded_photo(
        os.path.join(ROOT, "images", "landmarks", "tianjin-eye.png"),
        (photo_w, photo_h),
        radius=28,
        centering=(0.5, 0.45),
    )
    shadow = drop_shadow(photo, blur=26, offset=(0, 16), opacity=80)
    canvas.alpha_composite(shadow, (photo_x - 52, photo_y - 52))
    canvas.alpha_composite(photo, (photo_x, photo_y))

    draw = ImageDraw.Draw(canvas)

    # --- left column ---
    x = 72

    # eyebrow
    draw.text((x, 96), "TIANJIN RUNNING GUIDE", font=font(BOLD, 19), fill=ORANGE)

    # headline
    draw.text((x, 132), "Run", font=font(BOLD, 104), fill=INK)
    draw.text((x, 232), "Tianjin.", font=font(BOLD, 104), fill=INK)

    # accent rule
    draw.rounded_rectangle((x, 356, x + 96, 362), radius=3, fill=ORANGE)

    # supporting line
    draw.text(
        (x, 386),
        "Riverside paths, park loops and coastal runs —",
        font=font(REG, 25),
        fill=MUTED,
    )
    draw.text(
        (x, 420),
        "four routes built for everyday movement.",
        font=font(REG, 25),
        fill=MUTED,
    )

    # --- stat row ---
    stats = [("4", "route zones"), ("3–8 km", "route length"), ("Daily", "easy access")]
    sx = x
    sy = 486
    for value, label in stats:
        vf = font(BOLD, 34)
        lf = font(REG, 17)
        draw.text((sx, sy), value, font=vf, fill=INK)
        vw = draw.textlength(value, font=vf)
        draw.text((sx, sy + 42), label, font=lf, fill=MUTED)
        sx += max(vw, draw.textlength(label, font=lf)) + 46

    # --- footer ---
    draw.line((x, H - 62, W - 62, H - 62), fill=(31, 36, 41, 30), width=1)
    draw.text((x, H - 46), "Run Tianjin", font=font(BOLD, 17), fill=INK)
    draw.text((W - 62 - 168, H - 46), "Best routes in Tianjin", font=font(REG, 17), fill=MUTED)

    canvas.convert("RGB").save(OUT, "PNG", optimize=True)
    print("saved", OUT, canvas.size)


if __name__ == "__main__":
    main()
