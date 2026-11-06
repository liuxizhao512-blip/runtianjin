# -*- coding: utf-8 -*-
"""
把 图标.png 处理成导航栏用的品牌图标。

源图可能是白底 RGB，也可能是带透明通道的 RGBA，两种都支持：
  - RGBA：按 alpha 通道找内容边界，输出保留透明背景
  - RGB ：按亮度找内容边界，输出白底

处理步骤：
  1. 裁掉四周多余空白
  2. 补成正方形（居中）
  3. 缩放到 96x96（2x 供高分屏），输出 PNG

输出：run-tianjin-logo-96.png
"""

import os

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "图标.png")
OUT = os.path.join(ROOT, "run-tianjin-logo-96.png")

WHITE_THRESHOLD = 235   # RGB 模式下，低于此亮度视为"有内容"
ALPHA_THRESHOLD = 12    # RGBA 模式下，alpha 高于此值视为"有内容"
PAD_RATIO = 0.10        # 正方形内留白比例
SIZE = 96               # 输出边长


def content_bbox(img):
    """找出内容边界框。

    优先用 alpha 通道（真有透明区域时最准）；
    若 alpha 全不透明（白底图存成 RGBA 的情况），退回按亮度判断。
    """
    if img.mode == "RGBA":
        alpha = img.getchannel("A")
        if alpha.getextrema()[0] < 250:      # 存在半透明/透明像素
            mask = alpha.point(lambda v: 255 if v > ALPHA_THRESHOLD else 0)
            box = mask.getbbox()
            if box:
                return box

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


def main():
    img = Image.open(SRC)
    print("source", img.size, img.mode)

    # 统一成 RGBA，便于处理透明背景
    img = img.convert("RGBA")

    box = content_bbox(img)
    print("content bbox", box, "->", (box[2] - box[0], box[3] - box[1]))
    img = img.crop(box)

    # 补成正方形：以较长边为准，居中贴到透明底上
    cw, ch = img.size
    side = max(cw, ch)
    pad = int(side * PAD_RATIO)
    canvas_side = side + pad * 2

    square = Image.new("RGBA", (canvas_side, canvas_side), (0, 0, 0, 0))
    square.paste(img, ((canvas_side - cw) // 2, (canvas_side - ch) // 2), img)

    # 缩放到目标尺寸
    out = square.resize((SIZE, SIZE), Image.Resampling.LANCZOS)
    out.save(OUT, "PNG", optimize=True)
    print("saved", os.path.relpath(OUT, ROOT), out.size, out.mode)


if __name__ == "__main__":
    main()
