#!/usr/bin/env python3
"""
Генерация PWA-иконок из favicon.webp
Запуск: python3 generate-icons.py

Требования: pip install Pillow
Создаёт иконки в assets/favicon/:
  - icon-192.png (192x192)
  - icon-512.png (512x512)
  - icon-512-maskable.png (512x512 с отступами для safe zone)
"""

import sys
try:
    from PIL import Image, ImageDraw
except ImportError:
    print("Установите Pillow: pip install Pillow")
    sys.exit(1)

import os

FAVICON_PATH = "assets/favicon/favicon.webp"
OUTPUT_DIR   = "assets/favicon"

SIZES = [
    ("icon-192.png", 192, False),
    ("icon-512.png", 512, False),
    ("icon-512-maskable.png", 512, True),  # maskable: safe zone = 80% центра
]

def generate_icons():
    if not os.path.exists(FAVICON_PATH):
        print(f"❌ Файл {FAVICON_PATH} не найден!")
        print("   Запустите скрипт из корня проекта (где лежит index.html)")
        sys.exit(1)

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    img = Image.open(FAVICON_PATH).convert("RGBA")

    for filename, size, maskable in SIZES:
        out_path = os.path.join(OUTPUT_DIR, filename)

        if maskable:
            # Maskable: иконка занимает 80% площади, фон заполняет остальное
            # Safe zone = круг 80% от размера, поэтому масштабируем до ~72%
            icon_size = int(size * 0.72)
            resized = img.resize((icon_size, icon_size), Image.LANCZOS)

            # Создаём canvas с фоном (тёмная тема)
            canvas = Image.new("RGBA", (size, size), (10, 22, 40, 255))  # #0a1628
            offset = (size - icon_size) // 2
            canvas.paste(resized, (offset, offset), resized)
            canvas.save(out_path, "PNG")
        else:
            resized = img.resize((size, size), Image.LANCZOS)
            resized.save(out_path, "PNG")

        print(f"✅ {out_path} ({size}x{size}{'  maskable' if maskable else ''})")

    print("\n🎉 Иконки готовы! Не забудьте закоммитить их в репозиторий.")

if __name__ == "__main__":
    generate_icons()
