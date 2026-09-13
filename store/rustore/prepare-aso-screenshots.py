from pathlib import Path
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont


OUTPUT_DIR = Path(sys.argv[1] if len(sys.argv) > 1 else "store/rustore/generated")
WIDTH = 1080
HEIGHT = 1920
SCREENSHOT_WIDTH = 920
SCREENSHOT_Y = 250
BACKGROUND = "#f4efe5"
GRID = "#e4ddd1"
TEXT = "#2b2925"
MUTED = "#625e57"
RED = "#d94444"
BLUE = "#367bd6"
MAX_PHONE_SCREENSHOT_BYTES = 3 * 1024 * 1024

SCREENSHOTS = (
    (
        "01-game-capture.png",
        "01-game-capture.png",
        "Окружайте и захватывайте",
        "Классические «Точки» на бесконечном поле",
    ),
    (
        "02-vs-computer.png",
        "02-vs-computer.png",
        "Играйте против компьютера",
        "4 уровня сложности — от лёгкого до эксперта",
    ),
    (
        "03-start-menu.png",
        "03-help.png",
        "Играйте вдвоём",
        "Офлайн на одном устройстве — без аккаунта",
    ),
    (
        "04-help.png",
        "04-about.png",
        "Правила всегда под рукой",
        "Подсказки, масштабирование и свободное поле",
    ),
)


def load_font(name: str, size: int) -> ImageFont.FreeTypeFont:
    root = Path("/usr/share/fonts/truetype/dejavu")
    return ImageFont.truetype(str(root / name), size)


def frame_screenshot(source_name: str, output_name: str, headline: str, subtitle: str) -> None:
    source_path = OUTPUT_DIR / source_name
    output_path = OUTPUT_DIR / output_name
    source = Image.open(source_path).convert("RGB")
    if source.size != (WIDTH, HEIGHT):
        raise SystemExit(f"{source_name}: expected raw 1080x1920 screenshot, got {source.size}")

    canvas = Image.new("RGB", (WIDTH, HEIGHT), BACKGROUND)
    draw = ImageDraw.Draw(canvas)
    for x in range(0, WIDTH, 54):
        draw.line((x, 0, x, HEIGHT), fill=GRID, width=1)
    for y in range(0, HEIGHT, 54):
        draw.line((0, y, WIDTH, y), fill=GRID, width=1)

    scaled_height = round(source.height * SCREENSHOT_WIDTH / source.width)
    scaled = source.resize((SCREENSHOT_WIDTH, scaled_height), Image.Resampling.LANCZOS)

    shadow = Image.new("RGBA", (SCREENSHOT_WIDTH + 40, scaled_height + 40), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle(
        (20, 20, SCREENSHOT_WIDTH + 20, scaled_height + 20),
        radius=28,
        fill=(0, 0, 0, 55),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(14))
    canvas.paste(shadow, (60, SCREENSHOT_Y - 10), shadow)

    mask = Image.new("L", (SCREENSHOT_WIDTH, scaled_height), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle((0, 0, SCREENSHOT_WIDTH, scaled_height), radius=24, fill=255)
    canvas.paste(scaled, (80, SCREENSHOT_Y), mask)

    title_font = load_font("DejaVuSans-Bold.ttf", 50)
    subtitle_font = load_font("DejaVuSans.ttf", 28)
    draw = ImageDraw.Draw(canvas)
    draw.text((80, 55), headline, font=title_font, fill=TEXT)
    draw.text((80, 128), subtitle, font=subtitle_font, fill=MUTED)
    draw.ellipse((945, 60, 975, 90), fill=RED)
    draw.ellipse((980, 95, 1010, 125), fill=BLUE)

    canvas.save(output_path, optimize=True)
    if output_path.stat().st_size > MAX_PHONE_SCREENSHOT_BYTES:
        raise SystemExit(f"{output_name}: exceeds RuStore phone screenshot size limit")

    if source_path != output_path:
        source_path.unlink()


for source_name, output_name, headline, subtitle in SCREENSHOTS:
    frame_screenshot(source_name, output_name, headline, subtitle)
