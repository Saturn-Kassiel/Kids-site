@echo off
echo === Zapusk sinkhronizatsii Kids Site ===

:: 1. Dobavlyaem vse izmeneniya (media i udaleniya)
git add .

:: 2. Sozdaem vremennyy kommit
git commit -m "Auto-sync: %date% %time%"

:: 3. Poluchaem obnovleniya bazy (data.json) cherez rebase
echo Poluchaem dannye s GitHub...
git pull --rebase origin main

:: Proverka na konflikty
if %errorlevel% neq 0 (
    echo [!!!] Voznik konflikt v data.json!
    echo Pozhaluysta, otkroyte VS Code, ispravte ego i nazhmite lyubuyu klavishu.
    pause
    git add .
    git rebase --continue
)

:: 4. Otpravlyaem vse na GitHub
echo Otpravlyaem dannye v oblako...
git push origin main

echo === Gotovo! Vse sinkhronizirovano. ===
pause