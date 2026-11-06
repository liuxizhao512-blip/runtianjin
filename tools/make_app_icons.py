# -*- coding: utf-8 -*-
"""
从 图标.png 生成全部 PWA / favicon 图标。
关键点：背景必须是纯白 (255,255,255)，不能是主题蓝。
"""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "图标.png")
WHITE = (255, 255, 255)

src = Image.open(SRC).convert("RGB")
sw, sh = src.size
print("source:", sw, "x", sh)

# 1) 裁掉四周纯白边，得到内容框
px = src.load()
def is_white(p, tol=8):
    return p[0] >= 255 - tol and p[1] >= 255 - tol and p[2] >= 255 - tol

left, top, right, bottom = sw, sh, 0, 0
for y in range(sh):
    for x in range(sw):
        if not is_white(px[x, y]):
            if x < left: left = x
            if x > right: right = x
            if y < top: top = y
            if y > bottom: bottom = y
print("content box:", left, top, right, bottom)
content = src.crop((left, top, right + 1, bottom + 1))
cw, ch = content.size
print("content size:", cw, "x", ch)


def make_square(size, pad_ratio, bg=WHITE):
    """把内容等比缩放后居中放到 size x size 的纯色画布上。"""
    canvas = Image.new("RGB", (size, size), bg)
    inner = int(round(size * (1 - 2 * pad_ratio)))
    scale = min(inner / cw, inner / ch)
    nw, nh = max(1, int(round(cw * scale))), max(1, int(round(ch * scale)))
    resized = content.resize((nw, nh), Image.LANCZOS)
    canvas.paste(resized, ((size - nw) // 2, (size - nh) // 2))
    return canvas


targets = [
    # (文件名, 尺寸, 内边距比例)
    ("favicon-16x16.png", 16, 0.02),
    ("favicon-32x32.png", 32, 0.02),
    ("favicon-180x180.png", 180, 0.06),
    ("favicon-192x192.png", 192, 0.06),
    ("favicon-512x512.png", 512, 0.06),
    ("apple-touch-icon.png", 180, 0.10),
    ("app-icon-192x192.png", 192, 0.10),
    ("app-icon-512x512.png", 512, 0.10),
    # maskable 需要更大安全区（内容只占中间 80%）
    ("app-icon-maskable-512x512.png", 512, 0.14),
    ("favicon-maskable-512x512.png", 512, 0.14),
]

for name, size, pad in targets:
    img = make_square(size, pad)
    out = os.path.join(ROOT, name)
    img.save(out, "PNG", optimize=True)
    # 校验四角颜色
    corners = [img.getpixel((0, 0)), img.getpixel((size - 1, 0)),
               img.getpixel((0, size - 1)), img.getpixel((size - 1, size - 1))]
    print("%-34s %4d  corners=%s" % (name, size, corners))

print("done")
