import os
from PIL import Image, ImageOps

# Обновленные пути к твоим папкам
input_folder = r'C:\Users\Admin\Desktop\kids site\Картинки'
output_folder = r'C:\Users\Admin\Desktop\kids site\Оптимизированные картинки'

# Создаем папку для результата, если её еще нет
if not os.path.exists(output_folder):
    os.makedirs(output_folder)
    print(f"Создана папка: {output_folder}")

def optimize_images():
    # Список форматов, которые мы ищем
    valid_extensions = ('.jpg', '.jpeg', '.png', '.bmp', '.tiff')
    
    # Считаем количество файлов для удобства
    files = [f for f in os.listdir(input_folder) if f.lower().endswith(valid_extensions)]
    
    if not files:
        print(f"В папке '{input_folder}' не найдено подходящих картинок.")
        return

    for filename in files:
        try:
            # Полный путь к исходному файлу
            img_path = os.path.join(input_folder, filename)
            
            with Image.open(img_path) as img:
                # 1. Делаем квадрат 800x800 (обрезаем лишнее по центру)
                target_size = (800, 800)
                img = ImageOps.fit(img, target_size, Image.Resampling.LANCZOS)
                
                # 2. Убираем старое расширение и добавляем .webp
                name_without_ext = os.path.splitext(filename)[0]
                output_path = os.path.join(output_folder, f"{name_without_ext}.webp")
                
                # 3. Сохраняем в WebP (максимальное сжатие при качестве 80)
                img.save(output_path, 'WEBP', quality=80, method=6)
                
            print(f"✅ Успешно: {filename} -> {name_without_ext}.webp")
            
        except Exception as e:
            print(f"❌ Ошибка в файле {filename}: {e}")

if __name__ == "__main__":
    print(f"--- Запуск оптимизации ---")
    print(f"Из: {input_folder}")
    print(f"В: {output_folder}\n")
    
    optimize_images()
    
    print(f"\n--- Работа завершена! ---")