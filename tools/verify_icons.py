# -*- coding: utf-8 -*-
"""校验生成的图标：四角颜色 + 中心区域是否含蓝色内容。"""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
names = [
    "favicon-32x32.png", "favicon-192x192.png", "favicon-512x512.png",
    "apple-touch-icon.png", "app-icon-192x192.png", "app-icon-512x512.png",
    "app-icon-maskable-512x512.png",
]
for n in names:
    p = os.path.join(ROOT, n)
    im = Image.open(p).convert("RGB")
    w, h = im.size
    corners = [im.getpixel((0, 0)), im.getpixel((w - 1, 0)),
               im.getpixel((0, h - 1)), im.getpixel((w - 1, h - 1))]
    # 统计非白像素比例
    px = im.load()
    nonwhite = 0
    for y in range(0, h, max(1, h // 64)):
        for x in range(0, w, max(1, w // 64)):
            r, g, b = px[x, y]
            if not (r > 247 and g > 247 and b > 247):
                nonwhite += 1
    total = len(range(0, h, max(1, h // 64))) * len(range(0, w, max(1, w // 64)))
    print("%-32s %3dx%-3d corners=%s  ink=%.1f%%" %
          (n, w, h, corners, 100.0 * nonwhite / total))
