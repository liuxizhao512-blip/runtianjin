#!/usr/bin/env python3
"""Resample the Run Tianjin GPX tracks.

Steps applied to every track, in order:

  A. Uniform resampling at a fixed 15 m interval (removes 300 m jumps and
     collapses meaningless dense clusters).
  B. Break the mirror: the return leg of an out-and-back is offset sideways
     so the two directions are visually distinguishable on the map.
  C. Clean spurs: short out-and-back tails are removed.
  D. Fill in metadata: <ele> and <time> on every point, with <time> derived
     from a constant pace so it stays consistent with the pace shown on the
     site.

The script is idempotent in spirit but not in effect: it reads the current
files and rewrites them. Keep a copy of the originals if you want to re-run
with different parameters.
"""

from __future__ import annotations

import math
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

GPX_DIR = Path(__file__).resolve().parent.parent / "gpx"

EARTH_RADIUS_M = 6371008.8
# Target spacing between points. 40 m is fine enough that the polyline looks
# smooth at any zoom the map offers, and coarse enough that the files stay
# small. The resampler never produces more points than the source had.
SAMPLE_INTERVAL_M = 40.0

# Per-route settings.
#   pace_s_per_km : used to synthesise <time> stamps (D)
#   start_time    : local clock time of the first point (D)
#   base_ele      : elevation of the first point in metres (D)
#   ele_amplitude : how much the terrain rolls, in metres (D)
#   spur_max_m    : out-and-back tails shorter than this are deleted (C)
#   mirror_offset : sideways offset applied to the return leg, in metres (B)
ROUTES = {
    "haihe-riverside.gpx": {
        "pace_s_per_km": 330,          # 5:30 / km
        "start_time": "2026-05-16T18:40:00+08:00",
        "base_ele": 4.0,
        "ele_amplitude": 1.5,
        "spur_max_m": 400.0,
        "mirror_offset": 12.0,
    },
    "binhai-teda-coastal.gpx": {
        "pace_s_per_km": 300,          # 5:00 / km
        "start_time": "2026-05-17T07:10:00+08:00",
        "base_ele": 3.0,
        "ele_amplitude": 2.0,
        "spur_max_m": 400.0,
        "mirror_offset": 12.0,
    },
    "south-cuiping-park.gpx": {
        "pace_s_per_km": 390,          # 6:30 / km
        "start_time": "2026-05-18T06:30:00+08:00",
        "base_ele": 6.0,
        "ele_amplitude": 3.0,
        "spur_max_m": 250.0,
        "mirror_offset": 10.0,
    },
    "water-park-lakeside.gpx": {
        "pace_s_per_km": 360,          # 6:00 / km
        "start_time": "2026-05-19T06:50:00+08:00",
        "base_ele": 5.0,
        "ele_amplitude": 2.5,
        "spur_max_m": 300.0,
        "mirror_offset": 10.0,
    },
}

# Matches both <trkpt .../> and <trkpt ...>...</trkpt>. The body group is
# optional so self-closing points are captured too.
TRKPT_RE = re.compile(
    r'<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)"\s*(?:/>|>(.*?)</trkpt>)', re.S
)
NAME_RE = re.compile(r"<name>(.*?)</name>", re.S)


# --------------------------------------------------------------------------
# geometry helpers
# --------------------------------------------------------------------------
def haversine_m(a, b):
    lat1, lon1 = math.radians(a[0]), math.radians(a[1])
    lat2, lon2 = math.radians(b[0]), math.radians(b[1])
    dlat, dlon = lat2 - lat1, lon2 - lon1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * EARTH_RADIUS_M * math.asin(math.sqrt(h))


def path_length_m(pts):
    return sum(haversine_m(pts[i - 1], pts[i]) for i in range(1, len(pts)))


def cumulative(pts):
    out = [0.0]
    for i in range(1, len(pts)):
        out.append(out[-1] + haversine_m(pts[i - 1], pts[i]))
    return out


def interpolate(pts, cum, target_m):
    """Point at `target_m` along the polyline."""
    if target_m <= 0:
        return pts[0]
    if target_m >= cum[-1]:
        return pts[-1]
    lo, hi = 0, len(cum) - 1
    while lo + 1 < hi:
        mid = (lo + hi) // 2
        if cum[mid] <= target_m:
            lo = mid
        else:
            hi = mid
    seg = cum[hi] - cum[lo]
    t = 0.0 if seg == 0 else (target_m - cum[lo]) / seg
    return (
        pts[lo][0] + (pts[hi][0] - pts[lo][0]) * t,
        pts[lo][1] + (pts[hi][1] - pts[lo][1]) * t,
    )


def resample(pts, interval_m):
    """A. Uniform resampling at a fixed interval.

    The interval is a *target*, not a hard rule. Two things matter:

      * no gap should be much larger than the target (that is what makes the
        line look angular when you zoom in), and
      * no cluster of points should be much denser than the target (those
        points carry no extra information).

    So we resample at the target interval, but never produce more points than
    the source had -- the source is the ground truth for how much detail
    actually exists. The result is a track with even spacing that is no
    heavier than the original.
    """
    if len(pts) < 2:
        return list(pts)
    cum = cumulative(pts)
    total = cum[-1]
    if total <= 0:
        return [pts[0]]

    # Target count from the interval, capped by the source point count.
    target_count = max(1, int(round(total / interval_m)))
    count = min(len(pts) - 1, target_count)
    step = total / count
    out = [pts[0]]
    for i in range(1, count):
        out.append(interpolate(pts, cum, i * step))
    out.append(pts[-1])
    return out


def remove_spurs(pts, max_spur_m):
    """C. Drop short out-and-back tails at the turnaround.

    A spur is a short excursion that leaves the main line, reaches a dead end
    and comes straight back along the same coordinates. On an out-and-back
    track the whole return leg retraces the outbound leg, so a naive
    "retraced segment" test matches everywhere. The distinguishing feature of
    a real spur is that it sits at the *far end* of the route, right where the
    runner turns around.

    So we only look near the turnaround point (the point furthest from the
    start) and delete a retraced excursion that leaves from there.
    """
    if len(pts) < 6:
        return list(pts)

    start = pts[0]
    # index of the point furthest from the start = the turnaround
    turn = max(range(len(pts)), key=lambda k: haversine_m(start, pts[k]))

    # Search a window around the turnaround for a retraced excursion.
    lo = max(1, turn - 40)
    hi = min(len(pts) - 2, turn + 40)

    best = None  # (excursion_length, i, j)
    for i in range(lo, hi):
        for j in range(i + 3, min(len(pts), i + 60)):
            if haversine_m(pts[i], pts[j]) > 15.0:
                continue
            excursion = path_length_m(pts[i:j + 1])
            if excursion < 30.0 or excursion > max_spur_m:
                continue

            span = max(haversine_m(pts[i], p) for p in pts[i:j + 1])
            if span < 25.0:
                continue

            # The excursion must be retraced: outbound and return halves
            # overlap almost exactly.
            mid = (i + j) // 2
            first = pts[i:mid + 1]
            second = pts[mid:j + 1][::-1]
            pairs = min(len(first), len(second))
            if pairs < 2:
                continue
            overlap = sum(
                haversine_m(first[k], second[k]) for k in range(pairs)
            ) / pairs
            if overlap > 12.0:
                continue

            if best is None or excursion < best[0]:
                best = (excursion, i, j)

    if best is None:
        return list(pts)
    _, i, j = best
    return pts[:i + 1] + pts[j:]


def is_closed(pts, tol_m=60.0):
    return len(pts) > 2 and haversine_m(pts[0], pts[-1]) <= tol_m


def offset_return_leg(pts, offset_m):
    """B. Offset the return half of an out-and-back sideways.

    Only applies to tracks that start and end at the same place but are not a
    loop (i.e. the second half retraces the first). The return half is pushed
    perpendicular to the local direction of travel so the two legs become two
    parallel lines instead of one.

    The offset is applied to the *original* geometry, before resampling, so
    the resampler can then even out the spacing along the shifted line.
    """
    if not is_closed(pts):
        return pts, False

    n = len(pts)
    half = n // 2

    # Confirm the second half really retraces the first: sample a handful of
    # pairs and require most of them to be close together.
    samples = list(range(0, half, max(1, half // 20)))
    if not samples:
        return pts, False
    close = sum(1 for k in samples if haversine_m(pts[k], pts[n - 1 - k]) < 30.0)
    if close < len(samples) * 0.8:
        return pts, False

    out = list(pts)
    # Smooth the direction over a window so a sharp corner does not make the
    # offset swing wildly. Without this the offset can drift 100 m off the
    # line at a bend.
    window = max(2, n // 40)
    for i in range(half, n):
        a = max(half, i - window)
        b = min(n - 1, i + window)
        dlat = out[b][0] - out[a][0]
        dlon = out[b][1] - out[a][1]
        norm = math.hypot(dlat, dlon)
        if norm == 0:
            continue
        perp_lat = -dlon / norm
        perp_lon = dlat / norm
        m_per_deg_lat = 111320.0
        m_per_deg_lon = 111320.0 * math.cos(math.radians(out[i][0]))
        # taper the offset in and out so the join at the turnaround is smooth
        t = (i - half) / max(1, n - 1 - half)
        taper = math.sin(math.pi * t)
        out[i] = (
            out[i][0] + perp_lat * offset_m * taper / m_per_deg_lat,
            out[i][1] + perp_lon * offset_m * taper / m_per_deg_lon,
        )
    return out, True


def elevation_profile(pts, base_ele, amplitude):
    """D. A gentle, deterministic elevation profile."""
    cum = cumulative(pts)
    total = cum[-1] or 1.0
    eles = []
    for i, d in enumerate(cum):
        t = d / total
        # two out-of-phase waves so it does not look like a sine wave
        e = base_ele + amplitude * (
            0.6 * math.sin(2 * math.pi * t * 1.7)
            + 0.4 * math.sin(2 * math.pi * t * 4.3 + 1.1)
        )
        eles.append(round(e, 1))
    return eles


# --------------------------------------------------------------------------
# GPX reading / writing
# --------------------------------------------------------------------------
def read_track(path):
    text = path.read_text(encoding="utf-8")
    pts = [(float(m.group(1)), float(m.group(2))) for m in TRKPT_RE.finditer(text)]
    return text, pts


def read_labels(text):
    """Keep the human-readable <name> labels that sit inside trkpt elements."""
    labels = {}
    for m in TRKPT_RE.finditer(text):
        lat, lon = float(m.group(1)), float(m.group(2))
        body = m.group(3) or ""
        nm = NAME_RE.search(body)
        if nm:
            labels[(round(lat, 5), round(lon, 5))] = nm.group(1).strip()
    return labels


def nearest_label(labels, pt, tol_m=40.0):
    best = None
    best_d = tol_m
    for (lat, lon), name in labels.items():
        d = haversine_m(pt, (lat, lon))
        if d <= best_d:
            best_d = d
            best = name
    return best


def write_gpx(path, name, desc, pts, eles, times, labels):
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<gpx version="1.1" creator="Run Tianjin" xmlns="http://www.topografix.com/GPX/1/1">',
        "  <metadata>",
        f"    <name>{name}</name>",
        f"    <desc>{desc}</desc>",
        "  </metadata>",
        "  <trk>",
        f"    <name>{name}</name>",
        "    <trkseg>",
    ]
    for i, (lat, lon) in enumerate(pts):
        label = nearest_label(labels, (lat, lon))
        inner = f"<ele>{eles[i]:.1f}</ele><time>{times[i]}</time>"
        if label:
            inner += f"<name>{label}</name>"
        lines.append(
            f'      <trkpt lat="{lat:.6f}" lon="{lon:.6f}">{inner}</trkpt>'
        )
    lines += ["    </trkseg>", "  </trk>", "</gpx>", ""]
    path.write_text("\n".join(lines), encoding="utf-8")


def main():
    if not GPX_DIR.is_dir():
        sys.exit(f"gpx folder not found: {GPX_DIR}")

    dry_run = "--dry-run" in sys.argv

    for filename, cfg in ROUTES.items():
        path = GPX_DIR / filename
        if not path.exists():
            print(f"skip (missing): {filename}")
            continue

        text, pts = read_track(path)
        if len(pts) < 10:
            print(f"ABORT {filename}: only {len(pts)} points parsed, refusing to overwrite")
            continue
        labels = read_labels(text)
        name_m = re.search(r"<metadata>\s*<name>(.*?)</name>", text, re.S)
        desc_m = re.search(r"<desc>(.*?)</desc>", text, re.S)
        name = name_m.group(1).strip() if name_m else filename
        desc = desc_m.group(1).strip() if desc_m else ""

        before_pts = len(pts)
        before_len = path_length_m(pts)

        # C first: remove spurs before anything else so the resampler does not
        # waste points on a tail that is about to disappear.
        pts = remove_spurs(pts, cfg["spur_max_m"])
        after_spur_pts = len(pts)

        # B: break the mirror on out-and-back tracks. Done on the original
        # geometry so the offset follows the real path shape.
        pts, mirrored = offset_return_leg(pts, cfg["mirror_offset"])

        # A: uniform resampling.
        pts = resample(pts, SAMPLE_INTERVAL_M)

        # D: metadata.
        eles = elevation_profile(pts, cfg["base_ele"], cfg["ele_amplitude"])
        start = datetime.fromisoformat(cfg["start_time"])
        cum = cumulative(pts)
        times = []
        for d in cum:
            t = start + timedelta(seconds=d / 1000.0 * cfg["pace_s_per_km"])
            times.append(t.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"))

        if not dry_run:
            write_gpx(path, name, desc, pts, eles, times, labels)

        after_len = path_length_m(pts)
        print(
            f"{filename:<26} pts {before_pts:>4} -> {after_spur_pts:>4} (spur) -> {len(pts):>4} (resampled)"
            f"  len {before_len/1000:.2f} -> {after_len/1000:.2f} km"
            f"  mirror_offset={'yes' if mirrored else 'no'}"
        )


if __name__ == "__main__":
    main()
