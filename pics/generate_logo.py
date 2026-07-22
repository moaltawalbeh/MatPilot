from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

W, H = 3840, 2160
img = Image.new("RGB", (W, H), "#111114")
draw = ImageDraw.Draw(img)

# --- Background radial glow ---
glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
glow_draw = ImageDraw.Draw(glow)
cx, cy = W // 2, H // 2
for r in range(600, 0, -2):
    alpha = int(40 * (r / 600))
    glow_draw.ellipse(
        [cx - r, cy - r, cx + r, cy + r],
        fill=(249, 115, 22, alpha),
    )
img.paste(Image.alpha_composite(img.convert("RGBA"), glow).convert("RGB"))

draw = ImageDraw.Draw(img)

# --- Logo square (centered) ---
logo_size = 640
logo_x = (W - logo_size) // 2
logo_y = (H - logo_size) // 2 - 40
radius = 100

# Draw rounded rectangle with gradient
logo = Image.new("RGBA", (logo_size, logo_size), (0, 0, 0, 0))
logo_draw = ImageDraw.Draw(logo)

# Gradient from top-left to bottom-right
for y in range(logo_size):
    for x in range(logo_size):
        t = (x + y) / (2 * logo_size)
        r = int(249 + (251 - 249) * t)
        g = int(115 + (147 - 115) * t)
        b = int(22 + (60 - 22) * t)
        logo_draw.point((x, y), fill=(r, g, b, 255))

# Apply rounded rectangle mask
mask = Image.new("L", (logo_size, logo_size), 0)
mask_draw = ImageDraw.Draw(mask)
mask_draw.rounded_rectangle([0, 0, logo_size - 1, logo_size - 1], radius=radius, fill=255)
logo.putalpha(mask)

# Shadow
shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
shadow_draw = ImageDraw.Draw(shadow)
sx, sy = logo_x, logo_y + 8
shadow_draw.rounded_rectangle([sx, sy, sx + logo_size, sy + logo_size], radius=radius, fill=(0, 0, 0, 80))
shadow = shadow.filter(ImageFilter.GaussianBlur(20))
img = Image.alpha_composite(img.convert("RGBA"), shadow).convert("RGB")

# Paste logo
img.paste(logo, (logo_x, logo_y), logo)
draw = ImageDraw.Draw(img)

# --- Letter "M" ---
# Try to use a large bold font
font = None
font_size = 360
font_paths = [
    "C:/Windows/Fonts/arialbd.ttf",
    "C:/Windows/Fonts/arial.ttf",
    "C:/Windows/Fonts/segoeui.ttf",
    "C:/Windows/Fonts/calibrib.ttf",
]
for fp in font_paths:
    if os.path.exists(fp):
        try:
            font = ImageFont.truetype(fp, font_size)
            break
        except Exception:
            continue

if font is None:
    font = ImageFont.load_default()

# Draw "M" centered in the logo square
bbox = draw.textbbox((0, 0), "M", font=font)
tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
mx = logo_x + (logo_size - tw) // 2
my = logo_y + (logo_size - th) // 2 - bbox[1]
draw.text((mx, my), "M", fill="white", font=font)

# --- Text below logo ---
text_font = None
for fp in font_paths:
    if os.path.exists(fp):
        try:
            text_font = ImageFont.truetype(fp, 72)
            break
        except Exception:
            continue

if text_font is None:
    text_font = ImageFont.load_default()

text_bbox = draw.textbbox((0, 0), "MatPilot", font=text_font)
text_w = text_bbox[2] - text_bbox[0]
text_x = (W - text_w) // 2
text_y = logo_y + logo_size + 60

# Subtle glow behind text
for offset in range(12, 0, -1):
    alpha = int(15 * (offset / 12))
    draw.text((text_x, text_y), "MatPilot", fill=(249, 115, 22, alpha) if hasattr(draw, '_image') else "#f97316", font=text_font)

draw.text((text_x, text_y), "MatPilot", fill="#f0f0f4", font=text_font)

# --- Subtitle ---
sub_font = None
for fp in font_paths:
    if os.path.exists(fp):
        try:
            sub_font = ImageFont.truetype(fp, 32)
            break
        except Exception:
            continue

if sub_font is None:
    sub_font = ImageFont.load_default()

sub_text = "Materials Characterization Platform"
sub_bbox = draw.textbbox((0, 0), sub_text, font=sub_font)
sub_w = sub_bbox[2] - sub_bbox[0]
sub_x = (W - sub_w) // 2
sub_y = text_y + 100
draw.text((sub_x, sub_y), sub_text, fill="#50506a", font=sub_font)

# --- Save ---
output = "C:/Users/Mohammad/Desktop/MatPilot v1.0/pics/matpilot-logo-4k.jpg"
img.save(output, "JPEG", quality=95, subsampling=0)
print(f"Saved: {output} ({os.path.getsize(output)} bytes)")
