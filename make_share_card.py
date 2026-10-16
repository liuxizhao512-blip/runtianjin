from PIL import Image, ImageDraw, ImageFont, ImageOps

src = 'haihe-riverside-perspective-bg.jpg.jpg'
out = 'run-tianjin-share-card.jpg'

img = Image.open(src).convert('RGBA')
img = ImageOps.fit(img, (1200, 630), method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))

overlay = Image.new('RGBA', img.size, (10, 20, 30, 170))
img = Image.alpha_composite(overlay, img)

draw = ImageDraw.Draw(img)
font_title = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 72)
font_sub = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 34)

text_color = (255, 255, 255)
sub_color = (220, 232, 255)

# Title and subtitle placement
x = 72
y = 120

draw.text((x, y), 'Run Tianjin', font=font_title, fill=text_color)
draw.text((x, 210), 'City routes for everyday movement', font=font_sub, fill=sub_color)
draw.rounded_rectangle((x, 255, x + 180, 260), radius=6, fill=(120, 170, 255))

img = img.convert('RGB')
img.save(out, quality=92)
print(f'Created {out} with size {img.size}')
