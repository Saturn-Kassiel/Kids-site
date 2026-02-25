import os

def manual_translit(text):
    symbols = {
        "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "yo",
        "ж": "zh", "з": "z", "и": "i", "й": "y", "к": "k", "л": "l", "м": "m",
        "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u",
        "ф": "f", "х": "kh", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "shch",
        "ъ": "", "ы": "y", "ь": "", "э": "e", "ю": "yu", "я": "ya",
        " ": "_"
    }
    res = ""
    for char in text.lower():
        res += symbols.get(char, char)
    return res

def rename_everything(root_path):
    # Используем topdown=False, чтобы корректно обрабатывать вложенность
    for root, dirs, files in os.walk(root_path, topdown=False):
        
        # 1. ПЕРЕИМЕНОВЫВАЕМ ФАЙЛЫ
        for name in files:
            # Не трогаем сами скрипты
            if name == 'rename_script.py' or name == 'optimize_photos.py':
                continue
            
            new_name = manual_translit(name)
            old_file = os.path.join(root, name)
            new_file = os.path.join(root, new_name)
            
            if old_file == new_file:
                continue
                
            if os.path.exists(new_file):
                print(f"Пропуск (уже есть): {new_name}")
            else:
                os.rename(old_file, new_file)
                print(f"Файл: {name} -> {new_name}")

        # 2. ПЕРЕИМЕНОВЫВАЕМ ПАПКИ
        for name in dirs:
            if name in ['.git', 'assets']: 
                continue
                
            new_name = manual_translit(name)
            old_dir = os.path.join(root, name)
            new_dir = os.path.join(root, new_name)
            
            if old_dir == new_dir:
                continue

            if os.path.exists(new_dir):
                print(f"Папка уже существует: {new_name}")
            else:
                os.rename(old_dir, new_dir)
                print(f"Папка: {name} -> {new_name}")

if __name__ == "__main__":
    rename_everything(os.getcwd())
    print("\n--- Готово! Все конфликты имен обработаны. ---")