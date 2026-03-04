@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul

:: Настройки путей
set "downloadsDir=C:\Users\Admin\Downloads"
set "projectDir=C:\Users\Admin\Desktop\kids site"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$downloads = '%downloadsDir%';" ^
    "$project = '%projectDir%';" ^
    "$report = @();" ^
    "$latest = Get-ChildItem -Path $downloads -File | Sort-Object LastWriteTime -Descending | Select-Object -First 1;" ^
    "if ($null -eq $latest) { Write-Host '❌ Файлы в загрузках не найдены' -ForegroundColor Red; exit };" ^
    "Write-Host '--------------------------------------------------' -ForegroundColor Gray;" ^
    "Write-Host '🚀 Анализ последнего файла: ' $latest.Name -ForegroundColor Cyan;" ^
    "function Process-File($sourceFile) {" ^
    "    $cleanName = $sourceFile.Name -replace '\s*\(\d+\)\s*(?=\.[^.]+$)', '';" ^
    "    $target = Get-ChildItem -Path $project -Recurse -File | Where-Object { $_.Name -eq $cleanName } | Select-Object -First 1;" ^
    "    if ($target) {" ^
    "        try {" ^
    "            Copy-Item -Path $sourceFile.FullName -Destination $target.FullName -Force;" ^
    "            return [PSCustomObject]@{ Status='Успех'; File=$cleanName; Path=$target.DirectoryName };" ^
    "        } catch {" ^
    "            return [PSCustomObject]@{ Status='Ошибка'; File=$cleanName; Path='Доступ запрещен' };" ^
    "        }" ^
    "    } else {" ^
    "        return [PSCustomObject]@{ Status='Пропущен'; File=$cleanName; Path='Не найден в проекте' };" ^
    "    }" ^
    "};" ^
    "if ($latest.Extension -eq '.zip') {" ^
    "    $temp = Join-Path $downloads 'temp_extract_update';" ^
    "    if (Test-Path $temp) { Remove-Item $temp -Recurse -Force };" ^
    "    Expand-Archive -Path $latest.FullName -DestinationPath $temp -Force;" ^
    "    $filesInside = Get-ChildItem -Path $temp -Recurse -File;" ^
    "    foreach ($f in $filesInside) { $report += Process-File $f };" ^
    "    Remove-Item -Path $temp -Recurse -Force;" ^
    "} else {" ^
    "    $report += Process-File $latest;" ^
    "};" ^
    "Write-Host '--------------------------------------------------' -ForegroundColor Gray;" ^
    "Write-Host 'ОТЧЕТ О ЗАМЕНЕ:' -ForegroundColor White -BackgroundColor Blue;" ^
    "$report | Format-Table -AutoSize;" ^
    "$successCount = ($report | Where-Object { $_.Status -eq 'Успех' }).Count;" ^
    "Write-Host 'Всего обновлено файлов: ' $successCount -ForegroundColor Green;" ^
    "Write-Host '--------------------------------------------------' -ForegroundColor Gray;"

pause