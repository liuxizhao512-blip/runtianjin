# -*- coding: utf-8 -*-
"""Build square app icons from the portrait brand mark.

The source mark is 1290x1576 (portrait). Browsers scale favicons into a square
box, so the mark has to be square-cropped rather than letterboxed. An earlier
version centred the portrait mark on a square canvas with extra padding, which
left a transparent margin all the way round. On a light browser tab that margin
reads as a white border and the artwork looks small and boxed in.

This version centre-crops the mark to a square of real content and writes every
icon edge-to-edge, so there is no margin at all.
"""
import os

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "run-tianjin-brand-mark.png")

# Sizes: favicon, apple touch icon, PWA icons.
SIZES = [32, 180, 192, 512]


def square_source():
    """Centre-crop the portrait mark to a square of actual artwork."""
    img = Image.open(SRC).convert("RGB")
    width, height = img.size

    # Portrait source, so the square is limited by the width.
    side = min(width, height)
    left = (width - side) // 2
    top = (height - side) // 2
    return img.crop((left, top, left + side, top + side))


def maskable(square, size, safe=0.80):
    """Wrap the artwork in a solid backdrop so a maskable crop keeps it whole.

    Android masks maskable icons down to a circle that only guarantees the
    inner 80% of the canvas, so the artwork is scaled into that safe zone and
    the surrounding ring is filled with the mark's own background colour.
    """
    backdrop = square.getpixel((0, 0))
    canvas = Image.new("RGB", (size, size), backdrop)

    inner = int(round(size * safe))
    art = square.resize((inner, inner), Image.Resampling.LANCZOS)
    offset = (size - inner) // 2
    canvas.paste(art, (offset, offset))
    return canvas


def main():
    square = square_source()

    written = []
    for size in SIZES:
        icon = square.resize((size, size), Image.Resampling.LANCZOS)
        name = "favicon-%dx%d.png" % (size, size)
        path = os.path.join(ROOT, name)
        icon.save(path, "PNG", optimize=True)
        written.append("%s (%d bytes)" % (name, os.path.getsize(path)))

    # Maskable variant for the web manifest: same artwork, safe-zone padded.
    mask_name = "favicon-maskable-512x512.png"
    mask_path = os.path.join(ROOT, mask_name)
    maskable(square, 512).save(mask_path, "PNG", optimize=True)
    written.append("%s (%d bytes)" % (mask_name, os.path.getsize(mask_path)))

    # Also refresh the square master at 512 for the manifest.
    master = square.resize((512, 512), Image.Resampling.LANCZOS)
    master_path = os.path.join(ROOT, "run-tianjin-brand-mark-square.png")
    master.save(master_path, "PNG", optimize=True)
    written.append("run-tianjin-brand-mark-square.png (%d bytes)" % os.path.getsize(master_path))

    # Legacy multi-resolution .ico for older browsers and Windows shortcuts.
    ico_path = os.path.join(ROOT, "favicon.ico")
    square.resize((256, 256), Image.Resampling.LANCZOS).save(
        ico_path, "ICO", sizes=[(16, 16), (32, 32), (48, 48), (256, 256)]
    )
    written.append("favicon.ico (%d bytes)" % os.path.getsize(ico_path))

    with open(os.path.join(ROOT, "_icons.txt"), "w", encoding="utf-8") as fh:
        fh.write("source: %dx%d -> square crop %dx%d\n" % (Image.open(SRC).size + square.size))
        fh.write("\n".join(written))


if __name__ == "__main__":
    main()
