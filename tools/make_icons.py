# -*- coding: utf-8 -*-
"""Build square app icons from the portrait brand mark.

The source mark is 1290x1576 (portrait). Browsers scale favicons into a square
box, which leaves the mark small and letterboxed. This script trims the
transparent margin, then centres the mark on a square canvas so it fills the
tab icon properly, and exports the sizes browsers and installers ask for.
"""
import os

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "run-tianjin-brand-mark.png")

# Sizes: favicon, apple touch icon, PWA icons.
SIZES = [32, 180, 192, 512]

# Padding around the mark inside the square canvas, as a fraction of the side.
PADDING = 0.06


def main():
    src = Image.open(SRC).convert("RGBA")

    # Trim fully transparent borders so the mark itself defines the bounds.
    bbox = src.getbbox()
    if bbox:
        src = src.crop(bbox)

    width, height = src.size
    side = max(width, height)
    pad = int(round(side * PADDING))
    canvas_side = side + pad * 2

    canvas = Image.new("RGBA", (canvas_side, canvas_side), (0, 0, 0, 0))
    canvas.paste(src, ((canvas_side - width) // 2, (canvas_side - height) // 2), src)

    written = []
    for size in SIZES:
        icon = canvas.resize((size, size), Image.LANCZOS)
        name = "favicon-%dx%d.png" % (size, size)
        icon.save(os.path.join(ROOT, name), "PNG", optimize=True)
        written.append("%s (%d bytes)" % (name, os.path.getsize(os.path.join(ROOT, name))))

    # Also refresh the square master at 512 for the manifest.
    canvas.resize((512, 512), Image.LANCZOS).save(
        os.path.join(ROOT, "run-tianjin-brand-mark-square.png"), "PNG", optimize=True
    )
    written.append("run-tianjin-brand-mark-square.png")

    with open(os.path.join(ROOT, "_icons.txt"), "w", encoding="utf-8") as fh:
        fh.write("source: %dx%d -> trimmed %dx%d\n" % (Image.open(SRC).size + (width, height)))
        fh.write("\n".join(written))


if __name__ == "__main__":
    main()
