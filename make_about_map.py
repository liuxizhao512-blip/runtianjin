"""Build a real Tianjin map image for the About page.

Downloads OpenStreetMap tiles covering the four route areas (Haihe, South
Cuiping Park, Water Park, Binhai TEDA) and stitches them into one PNG.

Requires Pillow:  pip install pillow
Run:  python make_about_map.py
"""

import io
import math
import os
import urllib.request

from PIL import Image

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tianjin-routes-map.png")
TILE = "https://tile.openstreetmap.de/{z}/{x}/{y}.png"
UA = {"User-Agent": "RunTianjin/1.0 (static site asset build)"}

# Bounding box that contains all four routes.
WEST, EAST = 117.10, 117.78
SOUTH, NORTH = 38.98, 39.20
ZOOM = 11


def lon_to_x(lon, z):
    return int((lon + 180.0) / 360.0 * (2 ** z))


def lat_to_y(lat, z):
    r = math.radians(lat)
    return int((1.0 - math.log(math.tan(r) + 1.0 / math.cos(r)) / math.pi) / 2.0 * (2 ** z))


def fetch_tile(z, x, y):
    req = urllib.request.Request(TILE.format(z=z, x=x, y=y), headers=UA)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return Image.open(io.BytesIO(resp.read())).convert("RGB")


def main():
    x_min, x_max = lon_to_x(WEST, ZOOM), lon_to_x(EAST, ZOOM)
    y_min, y_max = lat_to_y(NORTH, ZOOM), lat_to_y(SOUTH, ZOOM)
    cols, rows = x_max - x_min + 1, y_max - y_min + 1
    print(f"zoom {ZOOM}: {cols}x{rows} tiles = {cols * 256}x{rows * 256} px")

    canvas = Image.new("RGB", (cols * 256, rows * 256))
    for y in range(y_min, y_max + 1):
        for x in range(x_min, x_max + 1):
            tile = fetch_tile(ZOOM, x, y)
            canvas.paste(tile, ((x - x_min) * 256, (y - y_min) * 256))
            print(f"  tile {x},{y}")

    # Crop to the exact bounding box so the image is centred on the routes.
    left = int((WEST + 180.0) / 360.0 * (2 ** ZOOM) * 256) - x_min * 256
    right = int((EAST + 180.0) / 360.0 * (2 ** ZOOM) * 256) - x_min * 256
    top = int((1.0 - math.log(math.tan(math.radians(NORTH)) + 1.0 / math.cos(math.radians(NORTH))) / math.pi) / 2.0 * (2 ** ZOOM) * 256) - y_min * 256
    bottom = int((1.0 - math.log(math.tan(math.radians(SOUTH)) + 1.0 / math.cos(math.radians(SOUTH))) / math.pi) / 2.0 * (2 ** ZOOM) * 256) - y_min * 256
    canvas = canvas.crop((left, top, right, bottom))

    # Downscale to a web-friendly width.
    target_w = 1200
    if canvas.width > target_w:
        h = round(canvas.height * target_w / canvas.width)
        canvas = canvas.resize((target_w, h), Image.LANCZOS)

    canvas.save(OUT, "PNG", optimize=True)
    print(f"wrote {os.path.basename(OUT)}  {canvas.width}x{canvas.height}  {os.path.getsize(OUT) // 1024} KB")


if __name__ == "__main__":
    main()
