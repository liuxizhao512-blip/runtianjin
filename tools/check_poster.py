# -*- coding: utf-8 -*-
"""检查海报布局：四周留白是否干净、内容是否都在安全区内。"""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p = os.path.join(ROOT, "run-tianjin-share-card.jpg")
im = Image.open(p).convert("RGB")
W, H = im.size
print("size", im.size)

BG = (245, 242, 238)


def near(c, ref, tol=6):
    return all(abs(a - b) <= tol for a, b in zip(c, ref))


# 1) 四条边带是否接近纯背景色（留白干净）
bands = {
    "top    (0..224)": (0, 0, W, 225),
    "bottom (855..1079)": (0, 855, W, 1080),
    "left   (0..359)": (0, 0, 360, H),
    "right  (1560..1919)": (1560, 0, W, H),
}
for name, box in bands.items():
    crop = im.crop(box)
    px = list(crop.getdata())
    n = len(px)
    clean = sum(1 for c in px if near(c, BG, 10))
    print(f"{name:22s} bg-like {clean*100//n:3d}%")

# 2) 安全区外是否有明显非背景像素（内容溢出检测）
def overflow(box, label):
    crop = im.crop(box)
    px = list(crop.getdata())
    bad = sum(1 for c in px if not near(c, BG, 14))
    print(f"{label:22s} non-bg {bad*100//len(px):3d}%")

overflow((0, 0, W, 225), "overflow top")
overflow((0, 855, W, H), "overflow bottom")
overflow((0, 0, 360, H), "overflow left")
overflow((1560, 0, W, H), "overflow right")

# 3) 安全区内是否有内容
inner = im.crop((360, 225, 1560, 855))
px = list(inner.getdata())
nonbg = sum(1 for c in px if not near(c, BG, 14))
print(f"safe area content      {nonbg*100//len(px):3d}%")

# 4) ASCII 缩略图，粗看构图
small = im.resize((64, 36), Image.Resampling.LANCZOS).convert("L")
chars = " .:-=+*#%@"
print("\n--- ascii ---")
for y in range(36):
    row = ""
    for x in range(64):
        v = small.getpixel((x, y))
        row += chars[min(9, (255 - v) * 10 // 256)]
    print(row)
