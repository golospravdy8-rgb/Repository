@echo off
chcp 65001 >nul
echo ========================================
echo    🚀 basket-lviv — АВТОЗАПУСК v3.1
echo ========================================

cd /d "D:\n8n\basket-lviv"

echo [1/5] Проверка...
node -v && npm -v

echo [2/5] Очистка...
rmdir /s /q .next 2>nul
npm cache clean --force >nul 2>&1

echo [3/5] Убиваем старые процессы...
npx kill-port 3006 3007 3008 3009 3010 >nul 2>&1
timeout /t 2 >nul

echo [4/5] Запуск сервера...
echo.
echo ========================================
echo     СЕРВЕР ЗАПУСКАЕТСЯ...
echo     Не закрывай это окно!
echo ========================================
echo.

npm run dev:safe

echo.
echo ========================================
echo Сервер остановился или упал.
echo Нажми любую клавишу для закрытия...
pause >nul
