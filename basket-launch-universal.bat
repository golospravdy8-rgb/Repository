@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul

echo.
echo ╔═══════════════════════════════════════════════════════════════╗
echo ║  🚀 BASKET-LVIV UNIVERSAL LAUNCHER v5.0                      ║
echo ║  Полная диагностика и запуск на localhost:3006                ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.

cd /d "D:\n8n\basket-lviv"

REM ════════════════════════════════════════════════════════════════
REM 1. УБИВАЕМ ВСЕ ПРОЦЕССЫ NODE.JS
REM ════════════════════════════════════════════════════════════════
echo [1/7] 🔥 Убиваю все процессы Node.js...
taskkill /FI "IMAGENAME eq node.exe" /F 2>nul
taskkill /FI "IMAGENAME eq npm.exe" /F 2>nul
timeout /t 2 /nobreak

REM ════════════════════════════════════════════════════════════════
REM 2. ОЧИЩАЕМ ПОРТЫ 3000-3010
REM ════════════════════════════════════════════════════════════════
echo [2/7] 🧹 Очищаю порты 3000-3010...
for /L %%i in (3000,1,3010) do (
    taskkill /FI "localport eq %%i" /T /F 2>nul
)

REM ════════════════════════════════════════════════════════════════
REM 3. ОЧИЩАЕМ КЕШИ
REM ════════════════════════════════════════════════════════════════
echo [3/7] 💾 Очищаю кеши...
if exist .next rmdir /s /q .next 2>nul
if exist dist rmdir /s /q dist 2>nul
if exist build rmdir /s /q build 2>nul

REM ════════════════════════════════════════════════════════════════
REM 4. ПРОВЕРЯЕМ КОНФИГУРАЦИЮ
REM ════════════════════════════════════════════════════════════════
echo [4/7] ⚙️  Проверяю конфигурацию...
if not exist package.json (
    echo ❌ ОШИБКА: package.json не найден!
    goto error
)
if not exist .env.local (
    echo ⚠️  ВНИМАНИЕ: .env.local не найден. Создаю .env...
    copy .env.example .env.local >nul
)

REM ════════════════════════════════════════════════════════════════
REM 5. УСТАНАВЛИВАЕМ ЗАВИСИМОСТИ
REM ════════════════════════════════════════════════════════════════
echo [5/7] 📦 Устанавливаю зависимости...
call npm install --prefer-offline --no-audit --legacy-peer-deps
if errorlevel 1 (
    echo ⚠️  npm install завершился с ошибкой, но пытаюсь запустить...
)

REM ════════════════════════════════════════════════════════════════
REM 6. ПРОВЕРЯЕМ ДОСТУПНЫЕ ПОРТЫ
REM ════════════════════════════════════════════════════════════════
echo [6/7] 🔍 Проверяю доступные порты...
netstat -ano | findstr :3006 >nul
if errorlevel 1 (
    echo ✅ Порт 3006 свободен
) else (
    echo ⚠️  Порт 3006 может быть занят (пытаюсь очистить)
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3006') do taskkill /PID %%a /F 2>nul
    timeout /t 1 /nobreak
)

REM ════════════════════════════════════════════════════════════════
REM 7. ЗАПУСКАЕМ СЕРВЕР
REM ════════════════════════════════════════════════════════════════
echo [7/7] 🚀 Запускаю сервер на http://localhost:3006
echo.
echo ┌─────────────────────────────────────────────────────────────┐
echo │ Консоль сервера ниже. Не закрывай это окно!               │
echo │ Открой браузер: http://localhost:3006                      │
echo │ Игра: http://localhost:3006/game                           │
echo └─────────────────────────────────────────────────────────────┘
echo.

call npm run dev:safe

if errorlevel 1 (
    echo.
    echo ❌ ОШИБКА при запуске dev:safe
    echo Пытаюсь альтернативный запуск...
    call npm run dev -- -p 3006
)

pause
exit /b 0

:error
echo.
echo ❌ КРИТИЧЕСКАЯ ОШИБКА!
pause
exit /b 1
