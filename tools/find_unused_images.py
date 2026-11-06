# -*- coding: utf-8 -*-
"""扫描站点中未被引用的图片文件。"""
import io
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

IMG_EXT = (".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".ico")

# 收集所有文本源文件内容（HTML/CSS/JS/JSON/XML/TXT/MD/PY）
text_ext = (".html", ".css", ".js", ".json", ".webmanifest", ".xml", ".txt", ".md", ".py")
corpus = []
for dirpath, dirnames, filenames in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d not in ("vendor", ".git", "_image-backup")]
    for fn in filenames:
        if fn.lower().endswith(text_ext):
            p = os.path.join(dirpath, fn)
            try:
                corpus.append(io.open(p, encoding="utf-8", errors="ignore").read())
            except Exception:
                pass
blob = "\n".join(corpus)

# 收集所有图片
images = []
for dirpath, dirnames, filenames in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d not in ("vendor", ".git")]
    for fn in filenames:
        if fn.lower().endswith(IMG_EXT):
            p = os.path.join(dirpath, fn)
            images.append(os.path.relpath(p, ROOT).replace("\\", "/"))

# 代码里动态生成的变体：xxx-480.webp / xxx-960.webp 由 xxx.jpg|png 派生
DERIVED = re.compile(r"^(.+)-(480|960)\.webp$", re.I)


def is_used(rel):
    base = os.path.basename(rel)
    if base in blob:
        return True
    m = DERIVED.match(base)
    if m:
        stem = m.group(1)
        # 只要代码里引用了 stem.jpg / stem.png，就认为变体在用
        for ext in (".jpg", ".jpeg", ".png"):
            if (stem + ext) in blob:
                return True
    return False


used, unused = [], []
for rel in sorted(images):
    (used if is_used(rel) else unused).append(rel)

print("=== 未被引用的图片 (%d) ===" % len(unused))
total = 0
for rel in unused:
    size = os.path.getsize(os.path.join(ROOT, rel))
    total += size
    print("  %9d  %s" % (size, rel))
print("  合计 %.2f MB" % (total / 1024.0 / 1024.0))

print()
print("=== 在用图片 (%d) ===" % len(used))
for rel in used:
    print("  " + rel)
