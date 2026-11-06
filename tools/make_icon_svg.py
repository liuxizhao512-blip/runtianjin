# -*- coding: utf-8 -*-
"""
统一站点图标系统（Run Tianjin）。

设计：圆角方形底 + 跑步者剪影。
跑步者用纯手绘 SVG path 绘制，保证在任何尺寸下都清晰、可识别。

输出：
  favicon.svg              深蓝渐变底 + 橙色跑步者（主图标）
  favicon-light.svg        橙色渐变底 + 白色跑步者
  favicon-mono.svg         透明底 + 深蓝跑步者（浅色 UI / 单色场景）
  favicon-16x16.png
  favicon-32x32.png
  favicon-180x180.png
  favicon-192x192.png
  favicon-512x512.png
  favicon-maskable-512x512.png

用法：
    python tools/make_icon_svg.py
"""

import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 站点主题色
NAVY_LIGHT = "#1d3f6d"
NAVY_DARK = "#102b52"
ORANGE = "#d66d3a"
ORANGE_DARK = "#b85d39"
WHITE = "#ffffff"

# --------------------------------------------------------------------------
# 跑步者剪影（512x512 坐标系，人物居中，脚在 y≈436，头顶在 y≈74）
# 由头、躯干、双臂、双腿几个形状组合而成，视觉上是一个向前奔跑的人。
# --------------------------------------------------------------------------
RUNNER_SHAPES = [
    # 头
    ("circle", 262, 96, 36),
    # 躯干（前倾，肩宽腰窄）
    ("poly", [(238, 132), (292, 132), (300, 250), (250, 250)]),
    # 前臂（向前上方摆）
    ("poly", [(286, 146), (310, 158), (392, 196), (378, 222)]),
    # 后臂（向后下方摆）
    ("poly", [(240, 146), (218, 160), (150, 232), (172, 252)]),
    # 前大腿（向前抬起）
    ("poly", [(268, 244), (302, 244), (368, 316), (340, 340)]),
    # 前小腿（向前下方伸出）
    ("poly", [(340, 316), (368, 316), (424, 386), (396, 404)]),
    # 后大腿（向后蹬）
    ("poly", [(240, 244), (274, 244), (222, 330), (192, 314)]),
    # 后小腿（向后上方收起）
    ("poly", [(192, 314), (222, 330), (176, 400), (148, 382)]),
]


def runner_svg_path():
    """把形状列表转成 SVG path 字符串。"""
    parts = []
    for shape in RUNNER_SHAPES:
        if shape[0] == "circle":
            _, cx, cy, r = shape
            parts.append(
                "M%.1f,%.1fa%.1f,%.1f 0 1,0 %.1f,0a%.1f,%.1f 0 1,0 -%.1f,0Z"
                % (cx - r, cy, r, r, 2 * r, r, r, 2 * r)
            )
        else:
            _, pts = shape
            d = "M%.1f,%.1f" % pts[0]
            for p in pts[1:]:
                d += " L%.1f,%.1f" % p
            d += " Z"
            parts.append(d)
    return " ".join(parts)


def write_svg(path, bg_from, bg_to, fg, rounded=True, transparent=False):
    d = runner_svg_path()
    rx = 96 if rounded else 0
    if transparent:
        bg = ""
    else:
        bg = (
            '  <defs>\n'
            '    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">\n'
            '      <stop offset="0" stop-color="%s"/>\n'
            '      <stop offset="1" stop-color="%s"/>\n'
            '    </linearGradient>\n'
            '  </defs>\n'
            '  <rect width="512" height="512" rx="%d" fill="url(#g)"/>\n'
            % (bg_from, bg_to, rx)
        )
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" '
        'width="512" height="512" role="img" aria-label="Run Tianjin">\n'
        + bg
        + '  <path d="%s" fill="%s"/>\n' % (d, fg)
        + "</svg>\n"
    )
    with open(path, "w", encoding="utf-8") as f:
        f.write(svg)
    print("wrote", os.path.relpath(path, ROOT))


def render_png(size, bg_from, bg_to, fg, rounded=True, maskable=False):
    """用 PIL 复刻 SVG 绘制，导出 PNG。"""
    ss = 4
    S = size * ss
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))

    if bg_from:
        grad = Image.new("RGB", (S, S))
        gp = grad.load()
        c1 = tuple(int(bg_from[i:i + 2], 16) for i in (1, 3, 5))
        c2 = tuple(int(bg_to[i:i + 2], 16) for i in (1, 3, 5))
        for y in range(S):
            for x in range(S):
                t = (x + y) / (2.0 * (S - 1))
                gp[x, y] = tuple(int(c1[k] + (c2[k] - c1[k]) * t) for k in range(3))
        grad = grad.convert("RGBA")
        mask = Image.new("L", (S, S), 0)
        md = ImageDraw.Draw(mask)
        if maskable:
            md.rectangle([0, 0, S, S], fill=255)
        elif rounded:
            md.rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * 96 / 512), fill=255)
        else:
            md.rectangle([0, 0, S, S], fill=255)
        img.paste(grad, (0, 0), mask)

    # 人物层
    layer = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    if maskable:
        inner = int(S * 0.78)
        off = (S - inner) // 2
        k = inner / 512.0
    else:
        off = 0
        k = S / 512.0

    def T(p):
        return (off + p[0] * k, off + p[1] * k)

    for shape in RUNNER_SHAPES:
        if shape[0] == "circle":
            _, cx, cy, r = shape
            x0, y0 = T((cx - r, cy - r))
            x1, y1 = T((cx + r, cy + r))
            ld.ellipse([x0, y0, x1, y1], fill=fg)
        else:
            _, pts = shape
            ld.polygon([T(p) for p in pts], fill=fg)

    img.alpha_composite(layer)
    return img.resize((size, size), Image.LANCZOS)


def main():
    write_svg(os.path.join(ROOT, "favicon.svg"), NAVY_LIGHT, NAVY_DARK, ORANGE)
    write_svg(os.path.join(ROOT, "favicon-light.svg"), ORANGE, ORANGE_DARK, WHITE)
    write_svg(os.path.join(ROOT, "favicon-mono.svg"), None, None, NAVY_DARK, transparent=True)

    jobs = [
        ("favicon-16x16.png", 16, NAVY_LIGHT, NAVY_DARK, ORANGE, True, False),
        ("favicon-32x32.png", 32, NAVY_LIGHT, NAVY_DARK, ORANGE, True, False),
        ("favicon-180x180.png", 180, NAVY_LIGHT, NAVY_DARK, ORANGE, True, False),
        ("favicon-192x192.png", 192, NAVY_LIGHT, NAVY_DARK, ORANGE, True, False),
        ("favicon-512x512.png", 512, NAVY_LIGHT, NAVY_DARK, ORANGE, True, False),
        ("favicon-maskable-512x512.png", 512, NAVY_LIGHT, NAVY_DARK, ORANGE, False, True),
    ]
    for name, size, c1, c2, fg, rounded, maskable in jobs:
        render_png(size, c1, c2, fg, rounded, maskable).save(os.path.join(ROOT, name))
        print("wrote", name, size)


if __name__ == "__main__":
    main()
