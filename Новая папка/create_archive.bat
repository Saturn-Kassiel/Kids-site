@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul

:: Настройки путей
set "projectDir=C:\Users\Admin\Desktop\kids site"
set "outputZip=%projectDir%\project_backup.zip"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$project = '%projectDir%';" ^
    "$zipPath = '%outputZip%';" ^
    "if (Test-Path $zipPath) { Remove-Item $zipPath -ErrorAction SilentlyContinue };" ^
    "Write-Host '🚀 Начинаю сбор файлов для архивации...' -ForegroundColor Cyan;" ^
    "$report = @();" ^
    "$excludePaths = @('assets', '.git');" ^
    "$filesToZip = Get-ChildItem -Path $project -Recurse | Where-Object {" ^
    "    $relative = $_.FullName.Replace($project + '\', '');" ^
    "    $isExcluded = $false;" ^
    "    foreach ($ex in $excludePaths) { if ($relative.StartsWith($ex)) { $isExcluded = $true; break } };" ^
    "    !$_.PSIsContainer -and !$isExcluded" ^
    "};" ^
    "if ($filesToZip.Count -eq 0) { Write-Host '❌ Файлы для архивации не найдены' -ForegroundColor Red; exit };" ^
    "Write-Host ('Найдено файлов: ' + $filesToZip.Count) -ForegroundColor Gray;" ^
    "try {" ^
    "    $filesToZip | Compress-Archive -DestinationPath $zipPath -Force;" ^
    "    foreach ($f in $filesToZip) {" ^
    "        $report += [PSCustomObject]@{ Файл=$f.Name; Папка=$f.DirectoryName.Replace($project, 'root') }" ^
    "    };" ^
    "    Write-Host '--------------------------------------------------' -ForegroundColor Gray;" ^
    "    Write-Host 'ОТЧЕТ ОБ АРХИВАЦИИ:' -ForegroundColor White -BackgroundColor DarkGreen;" ^
    "    $report | Format-Table -AutoSize;" ^
    "    Write-Host '✅ Архив успешно создан: ' $zipPath -ForegroundColor Green;" ^
    "} catch {" ^
    "    Write-Host '❌ Ошибка при создании архива: ' $_.Exception.Message -ForegroundColor Red;" ^
    "}" ^
    "Write-Host '--------------------------------------------------' -ForegroundColor Gray;"

pause