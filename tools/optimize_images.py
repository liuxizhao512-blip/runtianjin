"""Generate responsive WebP variants for every site image.

For each source image this writes ``<name>-<width>.webp`` next to the original
for every width that is smaller than the source. The original file is kept so
``<picture>`` fallbacks and social-card references keep working.

Usage:
    python tools/optimize_images.py            # generate missing variants
    python tools/optimize_images.py --force    # regenerate everything
    python tools/optimize_images.py --report   # only print the size table
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent

# Widths used by the responsive markup. Only widths below the source width are
# generated, so a 990px hero does not get a pointless 1440px variant.
WIDTHS = (480, 960, 1440)

# Quality per format. WebP at 82 is visually lossless for photos at these sizes.
QUALITY = 82

# Directories scanned for source images (relative to the project root).
SOURCE_DIRS = ("images", "images/landmarks", ".")

# Files that must never be re-encoded: icons, share cards, and the logo are
# already small or need pixel-exact output.
SKIP_NAMES = {
    "run-tianjin-share-card.jpg",
    "run-tianjin-logo-96.png",
    "favicon-32x32.png",
    "favicon-180x180.png",
    "favicon-192x192.png",
    "favicon-512x512.png",
    "favicon-maskable-512x512.png",
}


def iter_sources() -> list[Path]:
    seen: set[Path] = set()
    out: list[Path] = []
    for rel in SOURCE_DIRS:
        folder = ROOT / rel
        if not folder.is_dir():
            continue
        for path in sorted(folder.iterdir()):
            if not path.is_file():
                continue
            if path.suffix.lower() not in {".jpg", ".jpeg", ".png"}:
                continue
            if path.name in SKIP_NAMES:
                continue
            if path in seen:
                continue
            seen.add(path)
            out.append(path)
    return out


def variant_path(src: Path, width: int) -> Path:
    return src.with_name(f"{src.stem}-{width}.webp")


def build(src: Path, force: bool) -> list[tuple[Path, int, int]]:
    """Write WebP variants for one source. Returns (path, bytes, width) rows."""
    rows: list[tuple[Path, int, int]] = []
    try:
        with Image.open(src) as im:
            im.load()
            src_w, src_h = im.size
            # Flatten transparency onto white so PNG landmarks do not turn black.
            if im.mode in {"RGBA", "LA", "P"}:
                im = im.convert("RGBA")
                canvas = Image.new("RGB", im.size, (255, 255, 255))
                canvas.paste(im, mask=im.split()[-1])
                im = canvas
            elif im.mode != "RGB":
                im = im.convert("RGB")

            for width in WIDTHS:
                if width >= src_w:
                    continue
                height = round(src_h * width / src_w)
                dest = variant_path(src, width)
                if dest.exists() and not force:
                    rows.append((dest, dest.stat().st_size, width))
                    continue
                resized = im.resize((width, height), Image.LANCZOS)
                resized.save(dest, "WEBP", quality=QUALITY, method=6)
                rows.append((dest, dest.stat().st_size, width))
    except Exception as exc:  # noqa: BLE001 - report and continue
        print(f"  ! {src.name}: {exc}", file=sys.stderr)
    return rows


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--force", action="store_true", help="regenerate existing variants")
    parser.add_argument("--report", action="store_true", help="print sizes only")
    args = parser.parse_args()

    sources = iter_sources()
    if not sources:
        print("No source images found.")
        return 1

    total_before = 0
    total_after = 0
    print(f"{'source':44s} {'orig':>8s} {'variants':>9s}  widths")
    print("-" * 88)

    for src in sources:
        orig = src.stat().st_size
        total_before += orig
        if args.report:
            rows = [
                (variant_path(src, w), variant_path(src, w).stat().st_size, w)
                for w in WIDTHS
                if variant_path(src, w).exists()
            ]
        else:
            rows = build(src, args.force)
        variant_total = sum(r[1] for r in rows)
        total_after += variant_total
        widths = ", ".join(f"{w}px={b // 1024}KB" for _, b, w in rows) or "-"
        print(f"{str(src.relative_to(ROOT)):44s} {orig // 1024:7d}K {variant_total // 1024:8d}K  {widths}")

    print("-" * 88)
    print(f"{'TOTAL':44s} {total_before // 1024:7d}K {total_after // 1024:8d}K")
    if total_before:
        saved = 100 * (1 - total_after / total_before)
        print(f"Variant payload is {saved:.0f}% smaller than the originals.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
