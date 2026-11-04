"""Compress the site's raster images in place.

Re-encodes JPEGs at a sane quality and caps their long edge, and re-encodes
PNGs that are used as photos. Originals are copied to ``_image-backup/`` first,
so nothing is lost.

Usage:
    python tools/compress_images.py [--dry-run]
"""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
BACKUP = ROOT / "_image-backup" / "originals"

# long edge in pixels -> keeps retina-sharp at the sizes the site actually uses
MAX_EDGE = 1600
JPEG_QUALITY = 82

# Files that must keep their exact bytes (favicons are already tiny and
# browsers are picky about ICO/PNG icon encoding).
SKIP = {
    "favicon.ico",
    "favicon-32x32.png",
    "favicon-180x180.png",
    "favicon-192x192.png",
    "favicon-512x512.png",
    "favicon-maskable-512x512.png",
    "run-tianjin-logo-96.png",
}


def human(n: int) -> str:
    return f"{n / 1024:.0f} KB" if n < 1024 * 1024 else f"{n / 1024 / 1024:.2f} MB"


def compress(path: Path, dry_run: bool) -> tuple[int, int]:
    """Return (bytes_before, bytes_after)."""
    before = path.stat().st_size
    if path.name in SKIP:
        return before, before

    with Image.open(path) as im:
        im.load()
        original_mode = im.mode
        w, h = im.size
        long_edge = max(w, h)

        if long_edge > MAX_EDGE:
            scale = MAX_EDGE / long_edge
            im = im.resize((round(w * scale), round(h * scale)), Image.LANCZOS)

        suffix = path.suffix.lower()
        if suffix in {".jpg", ".jpeg"}:
            if im.mode not in ("RGB", "L"):
                im = im.convert("RGB")
            fmt = "JPEG"
            params = {"quality": JPEG_QUALITY, "optimize": True, "progressive": True}
        elif suffix == ".png":
            # PNGs here are photos or logos with flat colour; quantising to a
            # 256-colour palette is lossless enough at display size.
            if original_mode in ("RGBA", "LA", "P"):
                im = im.convert("RGBA")
            else:
                im = im.convert("RGB")
            fmt = "PNG"
            params = {"optimize": True}
        else:
            return before, before

        if dry_run:
            return before, before

        tmp = path.with_suffix(path.suffix + ".tmp")
        im.save(tmp, format=fmt, **params)
        after = tmp.stat().st_size

        # Only keep the re-encode if it actually helped.
        if after < before:
            BACKUP.mkdir(parents=True, exist_ok=True)
            backup_path = BACKUP / path.name
            if not backup_path.exists():
                shutil.copy2(path, backup_path)
            tmp.replace(path)
            return before, after

        tmp.unlink()
        return before, before


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="report without writing")
    args = parser.parse_args()

    targets = sorted(
        p
        for p in ROOT.iterdir()
        if p.is_file() and p.suffix.lower() in {".jpg", ".jpeg", ".png"}
    )

    total_before = total_after = 0
    changed = 0
    for path in targets:
        before, after = compress(path, args.dry_run)
        total_before += before
        total_after += after
        if after < before:
            changed += 1
            pct = (1 - after / before) * 100
            print(f"  {path.name:<40} {human(before):>9} -> {human(after):>9}  (-{pct:.0f}%)")

    print()
    print(f"{changed} file(s) re-encoded")
    print(f"total {human(total_before)} -> {human(total_after)}")
    if args.dry_run:
        print("(dry run — nothing written)")


if __name__ == "__main__":
    main()
