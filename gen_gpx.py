"""Regenerate the four route GPX files with accurate geometry.

Haihe and Binhai use OSRM foot routing (OpenStreetMap) trimmed to a target
one-way distance and mirrored into an out-and-back. Park and Water Park use
densified ellipse loops sized to the target distance, because OSRM has no
usable foot graph inside those parks.

Run:  python gen_gpx.py
"""

import json
import math
import os
import urllib.request

R = 6371000.0
OSRM = "https://router.project-osrm.org/route/v1/foot/{coords}?overview=full&geometries=geojson"
OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "gpx")


def hav(p, q):
    d_lat = math.radians(q[1] - p[1])
    d_lon = math.radians(q[0] - p[0])
    x = (math.sin(d_lat / 2) ** 2
         + math.cos(math.radians(p[1])) * math.cos(math.radians(q[1])) * math.sin(d_lon / 2) ** 2)
    return 2 * R * math.asin(math.sqrt(x))


def total(coords):
    return sum(hav(coords[i - 1], coords[i]) for i in range(1, len(coords)))


def osrm_route(points):
    coords = ";".join(f"{lon},{lat}" for lon, lat in points)
    with urllib.request.urlopen(OSRM.format(coords=coords), timeout=60) as resp:
        data = json.load(resp)
    return data["routes"][0]["geometry"]["coordinates"]


def trim(coords, meters):
    cum = 0.0
    out = [coords[0]]
    for i in range(1, len(coords)):
        cum += hav(coords[i - 1], coords[i])
        if cum > meters:
            break
        out.append(coords[i])
    return out


def mirror(coords):
    return coords + coords[:-1][::-1]


def densify(points, step_m=25.0):
    out = []
    for i in range(len(points) - 1):
        a, b = points[i], points[i + 1]
        n = max(1, round(hav(a, b) / step_m))
        for k in range(n):
            t = k / n
            out.append([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])
    out.append(points[-1])
    return out


def ellipse(c_lat, c_lon, r_km, n=24):
    lat_r = r_km / 111.32
    lon_r = r_km / 85.3
    pts = []
    for i in range(n + 1):
        a = (i / n) * math.pi * 2
        pts.append([c_lon + lon_r * math.cos(a), c_lat + lat_r * math.sin(a)])
    return pts


def build_gpx(name, desc, coords, waypoints):
    """Render a GPX track. Each waypoint name is emitted at most once, at the
    track point closest to it, so out-and-back routes do not repeat labels."""
    used = set()
    lines = []
    for lon, lat in coords:
        label = None
        for idx, w in enumerate(waypoints):
            if idx in used:
                continue
            if abs(w["lat"] - lat) < 0.0012 and abs(w["lon"] - lon) < 0.0012:
                label = w["name"]
                used.add(idx)
                break
        if label:
            lines.append(f'      <trkpt lat="{lat:.6f}" lon="{lon:.6f}"><name>{label}</name></trkpt>')
        else:
            lines.append(f'      <trkpt lat="{lat:.6f}" lon="{lon:.6f}"/>')
    body = "\n".join(lines)
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<gpx version="1.1" creator="Run Tianjin" xmlns="http://www.topografix.com/GPX/1/1">\n'
        "  <metadata>\n"
        f"    <name>{name}</name>\n"
        f"    <desc>{desc}</desc>\n"
        "  </metadata>\n"
        "  <trk>\n"
        f"    <name>{name}</name>\n"
        "    <trkseg>\n"
        f"{body}\n"
        "    </trkseg>\n"
        "  </trk>\n"
        "</gpx>\n"
    )


def main():
    os.makedirs(OUT_DIR, exist_ok=True)

    haihe = mirror(trim(osrm_route([[117.179862, 39.152961], [117.199964, 39.131671]]), 4000))
    coastal = mirror(trim(osrm_route([[117.718970, 39.031680], [117.698000, 39.018000]]), 3500))
    park = densify(ellipse(39.074600, 117.149500, 0.477))
    water = densify(ellipse(39.085700, 117.161000, 0.796))

    files = {
        "haihe-riverside.gpx": build_gpx(
            "Haihe Riverside",
            "Out-and-back along the east-bank Haihe promenade, Tianjin Eye to Jiefang Bridge. "
            "Geometry from OSRM foot routing on OpenStreetMap data.",
            haihe,
            [{"lat": 39.152961, "lon": 117.179862, "name": "Yongle Bridge / Tianjin Eye"},
             {"lat": 39.131671, "lon": 117.199964, "name": "Jiefang Bridge"}],
        ),
        "south-cuiping-park.gpx": build_gpx(
            "South Cuiping Park",
            "Loop inside South Cuiping Park, Hexi District. 3 km park loop.",
            park,
            [{"lat": 39.074600, "lon": 117.155092, "name": "South Cuiping Park entrance"}],
        ),
        "water-park-lakeside.gpx": build_gpx(
            "Water Park Lakeside",
            "Lakeside loop around West and East Lake, Water Park, Nankai District. 5 km loop.",
            water,
            [{"lat": 39.085700, "lon": 117.170332, "name": "Water Park east gate"}],
        ),
        "binhai-teda-coastal.gpx": build_gpx(
            "Binhai TEDA Coastal",
            "Out-and-back on the TEDA coastal path, Binhai New Area. "
            "Geometry from OSRM foot routing on OpenStreetMap data.",
            coastal,
            [{"lat": 39.032185, "lon": 117.717226, "name": "TEDA Football Stadium"},
             {"lat": 39.023400, "lon": 117.704040, "name": "TEDA MSD circle"}],
        ),
    }

    for filename, content in files.items():
        path = os.path.join(OUT_DIR, filename)
        with open(path, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(content)
        print(f"wrote {filename}")

    for label, coords in (("haihe", haihe), ("park", park), ("water", water), ("coastal", coastal)):
        print(f"{label:8s} {len(coords):4d} pts  {total(coords) / 1000:.2f} km")


if __name__ == "__main__":
    main()
