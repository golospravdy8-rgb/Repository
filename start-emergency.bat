@echo off
chcp 65001 >nul
echo ========================================
echo    🚀 basket-lviv — EMERGENCY LAUNCH
echo ========================================

cd /d "D:\n8n\basket-lviv"

echo Удаляем .next и кэш...
rmdir /s /q .next 2>nul
npm cache clean --force

echo Освобождаем порты...
npx kill-port 3006 3007 3008 3010 2>nul

echo Запуск обычного dev-сервера (без safe)...
npm run dev
pause
