# -*- coding: utf-8 -*-
"""
把 favicon.png 原封不动转成 favicon.svg。

做法：把 PNG 的字节做 base64 编码，塞进 SVG 的 <image> 标签。
像素数据完全不变，所以视觉上和 favicon.png 一模一样。

注意：这不是真正的矢量图。SVG 里装的还是位图，放大依然会糊，
文件体积也基本等于 PNG 的 1.33 倍（base64 膨胀）。它的价值在于：
  - 浏览器和 <link rel="icon" type="image/svg+xml"> 能直接吃
  - 单一文件，不用再维护一堆 PNG 尺寸
  - 可以内嵌 CSS 做圆角、暗色模式切换等

用法：
    python tools/png_to_svg.py
"""

import base64
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "favicon.png")
DST = os.path.join(ROOT, "favicon.svg")


def main():
    if not os.path.exists(SRC):
        raise SystemExit("favicon.png not found at %s" % SRC)

    with open(SRC, "rb") as f:
        raw = f.read()

    b64 = base64.b64encode(raw).decode("ascii")

    # 从 PNG 头里读宽高，写进 viewBox，保证 SVG 有正确的固有尺寸。
    # PNG IHDR: 8 字节签名 + 4 字节长度 + 4 字节类型 + 4 字节宽 + 4 字节高
    width = int.from_bytes(raw[16:20], "big")
    height = int.from_bytes(raw[20:24], "big")

    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" '
        'xmlns:xlink="http://www.w3.org/1999/xlink" '
        'viewBox="0 0 %d %d" width="%d" height="%d" '
        'role="img" aria-label="Run Tianjin">\n'
        '  <image width="%d" height="%d" '
        'xlink:href="data:image/png;base64,%s"/>\n'
        "</svg>\n"
    ) % (width, height, width, height, width, height, b64)

    with open(DST, "w", encoding="utf-8") as f:
        f.write(svg)

    print("source : favicon.png  %d bytes  %dx%d" % (len(raw), width, height))
    print("output : favicon.svg  %d bytes" % os.path.getsize(DST))


if __name__ == "__main__":
    main()
