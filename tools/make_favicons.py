# -*- coding: utf-8 -*-
"""
用 图标.png 生成整套 favicon（浏览器标签页 / 书签 / 主屏图标）。

源图是白底 RGBA（alpha 全不透明），所以：
  1. 按亮度找内容边界，裁掉白边
  2. 补成正方形（居中，白底）
  3. 输出各尺寸 PNG + 一个 SVG（内嵌位图，保证与 PNG 完全一致）

输出：
  favicon-16x16.png
  favicon-32x32.png
  favicon-180x180.png   (apple-touch-icon)
  favicon-192x192.png
  favicon-512x512.png
  favicon-maskable-512x512.png  (安全区内缩 78%)
  favicon.svg
"""

import base64
import io
import os

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "图标.png")

WHITE_THRESHOLD = 235   # 低于此亮度视为"有内容"
PAD_RATIO = 0.08        # 正方形内留白比例
MASKABLE_INNER = 0.78   # maskable 安全区比例

# 手机主屏图标：用站点主题深蓝做底，白底图标在手机桌面上辨识度太低
APP_BG = (29, 63, 109)      # #1d3f6d，与 styles.css 的 --navy 一致
APP_INNER = 0.72            # 内容占画布比例（四周留白）


def content_bbox(img):
    """按亮度找内容边界（源图 alpha 全不透明，不能用 alpha）。"""
    gray = img.convert("L")
    w, h = gray.size
    px = gray.load()

    left, top, right, bottom = w, h, -1, -1
    for y in range(h):
        for x in range(w):
            if px[x, y] < WHITE_THRESHOLD:
                if x < left:
                    left = x
                if x > right:
                    right = x
                if y < top:
                    top = y
                if y > bottom:
                    bottom = y
    if right < 0:
        return (0, 0, w, h)
    return (left, top, right + 1, bottom + 1)


def build_square():
    """裁边 + 补正方形，返回高分辨率母版（RGB，白底）。"""
    img = Image.open(SRC).convert("RGB")
    print("source", img.size)

    box = content_bbox(img)
    print("content bbox", box, "->", (box[2] - box[0], box[3] - box[1]))
    img = img.crop(box)

    cw, ch = img.size
    side = max(cw, ch)
    pad = int(side * PAD_RATIO)
    canvas_side = side + pad * 2

    square = Image.new("RGB", (canvas_side, canvas_side), (255, 255, 255))
    square.paste(img, ((canvas_side - cw) // 2, (canvas_side - ch) // 2))
    print("square master", square.size)
    return square


def render(master, size, maskable=False):
    """缩放到指定尺寸；maskable 时把内容缩进安全区。"""
    if maskable:
        inner = int(size * MASKABLE_INNER)
        small = master.resize((inner, inner), Image.Resampling.LANCZOS)
        out = Image.new("RGB", (size, size), (255, 255, 255))
        off = (size - inner) // 2
        out.paste(small, (off, off))
        return out
    return master.resize((size, size), Image.Resampling.LANCZOS)


def render_app(master, size, inner_ratio=APP_INNER):
    """手机主屏图标：主题深蓝底 + 居中内容。

    先把白底抠掉（白→透明），再贴到深蓝底上，避免出现白色方块。
    """
    inner = int(size * inner_ratio)
    small = master.resize((inner, inner), Image.Resampling.LANCZOS)

    # 白底转透明：亮度越高越透明
    gray = small.convert("L")
    alpha = gray.point(lambda v: 0 if v > 240 else 255)
    small_rgba = small.convert("RGBA")
    small_rgba.putalpha(alpha)

    out = Image.new("RGB", (size, size), APP_BG)
    off = (size - inner) // 2
    out.paste(small_rgba, (off, off), small_rgba)
    return out


def write_svg(master, path, size=512):
    """生成内嵌 PNG 的 SVG，保证与位图完全一致。"""
    buf = io.BytesIO()
    master.resize((size, size), Image.Resampling.LANCZOS).save(
        buf, "PNG", optimize=True
    )
    b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" '
        f'xmlns:xlink="http://www.w3.org/1999/xlink" '
        f'viewBox="0 0 {size} {size}" width="{size}" height="{size}">\n'
        f'  <image width="{size}" height="{size}" '
        f'xlink:href="data:image/png;base64,{b64}" />\n'
        f"</svg>\n"
    )
    with open(path, "w", encoding="utf-8") as f:
        f.write(svg)
    print("saved", os.path.relpath(path, ROOT), f"{len(svg)} bytes")


def main():
    master = build_square()

    # --- 浏览器标签页 / 书签：白底，保持原图观感 ---
    targets = [
        ("favicon-16x16.png", 16, False),
        ("favicon-32x32.png", 32, False),
        ("favicon-192x192.png", 192, False),
        ("favicon-512x512.png", 512, False),
    ]
    for name, size, maskable in targets:
        out = render(master, size, maskable)
        p = os.path.join(ROOT, name)
        out.save(p, "PNG", optimize=True)
        print("saved", name, out.size)

    # --- 手机主屏 / PWA：主题深蓝底，桌面辨识度更高 ---
    app_targets = [
        ("apple-touch-icon.png", 180),          # iOS 主屏（不读 manifest）
        ("app-icon-192x192.png", 192),          # Android 主屏
        ("app-icon-512x512.png", 512),          # Android 主屏 / 启动画面
        ("app-icon-maskable-512x512.png", 512), # Android 自适应图标
    ]
    for name, size in app_targets:
        out = render_app(master, size)
        p = os.path.join(ROOT, name)
        out.save(p, "PNG", optimize=True)
        print("saved", name, out.size)

    write_svg(master, os.path.join(ROOT, "favicon.svg"))


if __name__ == "__main__":
    main()
