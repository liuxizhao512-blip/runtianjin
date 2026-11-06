# -*- coding: utf-8 -*-
"""
生成 Run Tianjin 分享海报 / 社交卡片。

设计目标
--------
1. 信息极简：只保留品牌名 + 一句话 + 一个行动点。
2. 强适配：所有内容都收在画布正中的 1200x630 安全区内，
   四周留出巨大留白，这样无论被裁成 1:1、4:5、16:9、2:1
   还是被平台加圆角/加边框，主体都不会被切掉。

画布尺寸
--------
CANVAS = 1920 x 1080（16:9）
SAFE   = 1200 x 630，居中放置
        -> 左右各留 360px，上下各留 225px

输出
----
run-tianjin-share-card.jpg        1920x1080，用于 og:image / twitter:image
run-tianjin-poster-1200x630.png   1200x630，纯内容区（无留白），用于站内展示

用法
----
    python tools/make_poster.py
"""

import os

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# --- 画布与安全区 ---------------------------------------------------------
CANVAS_W, CANVAS_H = 1920, 1080
SAFE_W, SAFE_H = 1200, 630
SAFE_X = (CANVAS_W - SAFE_W) // 2   # 360
SAFE_Y = (CANVAS_H - SAFE_H) // 2   # 225

# --- 主题色（与 styles.css 一致）-----------------------------------------
BG = (245, 242, 238)          # 纯米色背景，全图统一，无渐变
INK = (16, 43, 82)
ORANGE = (216, 107, 57)
MUTED = (93, 101, 112)
WHITE = (255, 255, 255)

FONT_DIR = "C:/Windows/Fonts"
BOLD = "arialbd.ttf"
REG = "arial.ttf"


def font(name, size):
    return ImageFont.truetype(os.path.join(FONT_DIR, name), size)


def rounded_photo(path, size, radius=26, centering=(0.5, 0.5)):
    """载入照片，cover 裁切到指定尺寸，并做圆角。"""
    img = Image.open(path).convert("RGB")
    img = ImageOps.fit(img, size, method=Image.Resampling.LANCZOS, centering=centering)
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, size[0] - 1, size[1] - 1), radius=radius, fill=255
    )
    out = Image.new("RGBA", size, (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    return out


def drop_shadow(layer, blur=22, offset=(0, 12), opacity=70):
    """给 RGBA 图层生成柔和投影。"""
    alpha = layer.split()[-1]
    shadow = Image.new("RGBA", layer.size, (16, 43, 82, opacity))
    shadow.putalpha(alpha)
    canvas = Image.new(
        "RGBA", (layer.size[0] + blur * 4, layer.size[1] + blur * 4), (0, 0, 0, 0)
    )
    canvas.paste(shadow, (blur * 2 + offset[0], blur * 2 + offset[1]), shadow)
    return canvas.filter(ImageFilter.GaussianBlur(blur))


# -------------------------------------------------------------------------
# 内容区绘制：所有坐标都相对 (0,0)-(SAFE_W,SAFE_H)
# -------------------------------------------------------------------------
def draw_safe_area():
    """绘制 1200x630 的内容区，返回 RGBA 图。"""
    w, h = SAFE_W, SAFE_H
    # 纯米色底，不加任何暖光/渐变
    card = Image.new("RGBA", (w, h), BG + (255,))

    # --- 右侧照片面板 ---
    photo_w, photo_h = 470, 470
    photo_x = w - photo_w - 48
    photo_y = (h - photo_h) // 2
    photo = rounded_photo(
        os.path.join(ROOT, "images", "landmarks", "tianjin-eye.png"),
        (photo_w, photo_h),
        radius=28,
        centering=(0.5, 0.45),
    )
    shadow = drop_shadow(photo, blur=24, offset=(0, 14), opacity=75)
    card.alpha_composite(shadow, (photo_x - 48, photo_y - 48))
    card.alpha_composite(photo, (photo_x, photo_y))

    draw = ImageDraw.Draw(card)

    # --- 左栏：只留三行信息 ---
    # 文字块总高约 300px（170..470），中心 320，与照片面板中心 315 对齐
    x = 72

    # 1) 品牌名
    draw.text((x, 170), "Run Tianjin", font=font(BOLD, 104), fill=INK)

    # 2) 一句话
    draw.text(
        (x, 312),
        "Four routes. One city.",
        font=font(REG, 40),
        fill=MUTED,
    )

    # 3) 橙色短横线 + 行动点
    draw.rounded_rectangle((x, 396, x + 104, 403), radius=3, fill=ORANGE)
    draw.text(
        (x, 440),
        "liuxizhao512-blip.github.io/runtianjin",
        font=font(REG, 24),
        fill=ORANGE,
    )

    return card


def main():
    # --- 1. 大画布：纯米色，四周保持绝对干净 ---
    # 刻意不加任何光晕/投影，保证被任意比例裁切时边缘都是同一纯色。
    canvas = Image.new("RGBA", (CANVAS_W, CANVAS_H), BG + (255,))

    # 内容区
    card = draw_safe_area()

    # 安全区内加一圈极淡描边，让内容区有边界感但不外溢
    edge = Image.new("RGBA", (SAFE_W, SAFE_H), (0, 0, 0, 0))
    ImageDraw.Draw(edge).rounded_rectangle(
        (0, 0, SAFE_W - 1, SAFE_H - 1), radius=18, outline=(29, 63, 109, 26), width=2
    )
    card = Image.alpha_composite(card, edge)

    canvas.alpha_composite(card, (SAFE_X, SAFE_Y))

    # --- 2. 输出 ---
    out_share = os.path.join(ROOT, "run-tianjin-share-card.jpg")
    canvas.convert("RGB").save(out_share, "JPEG", quality=92, optimize=True)
    print("saved", os.path.relpath(out_share, ROOT), canvas.size)

    # 纯内容区版本（无留白），用于站内展示
    out_poster = os.path.join(ROOT, "run-tianjin-poster-1200x630.png")
    card.convert("RGB").save(out_poster, "PNG", optimize=True)
    print("saved", os.path.relpath(out_poster, ROOT), card.size)


if __name__ == "__main__":
    main()
