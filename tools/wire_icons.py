# -*- coding: utf-8 -*-
"""把 SVG 图标引用插入 6 个页面。"""
import io
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

OLD = (
    '    <link rel="icon" type="image/png" sizes="32x32" href="favicon-32x32.png" />\n'
    '    <link rel="icon" type="image/png" sizes="192x192" href="favicon-192x192.png" />\n'
    '    <link rel="apple-touch-icon" sizes="180x180" href="favicon-180x180.png" />'
)

NEW = (
    '    <link rel="icon" type="image/svg+xml" href="favicon.svg" />\n'
    '    <link rel="icon" type="image/png" sizes="32x32" href="favicon-32x32.png" />\n'
    '    <link rel="icon" type="image/png" sizes="192x192" href="favicon-192x192.png" />\n'
    '    <link rel="apple-touch-icon" sizes="180x180" href="favicon-180x180.png" />'
)

PAGES = ["index.html", "routes.html", "map.html", "detail.html", "tips.html", "about.html"]

for name in PAGES:
    path = os.path.join(ROOT, name)
    with io.open(path, encoding="utf-8") as f:
        s = f.read()
    if 'href="favicon.svg"' in s:
        print("already has svg:", name)
        continue
    if OLD not in s:
        print("PATTERN NOT FOUND:", name)
        continue
    s = s.replace(OLD, NEW, 1)
    with io.open(path, "w", encoding="utf-8", newline="") as f:
        f.write(s)
    print("updated:", name)
