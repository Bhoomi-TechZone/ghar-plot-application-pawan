@echo off
setlocal enabledelayedexpansion

REM This script fixes the "Gharplot has not been registered" error

cls
echo.
echo ========================================================
echo.
echo   GHARPLOT REGISTRATION ERROR FIX
echo.
echo ========================================================
echo.
echo This script will:
echo   1. Clear React Native bundler cache
echo   2. Clear Android build cache
echo   3. Clean Gradle build
echo   4. Start Metro bundler with fresh cache
echo.
echo Do NOT interrupt the script once started!
echo.
pause

cd /d "%~dp0"

echo.
echo [STEP 1/4] Clearing React Native bundler cache...
echo.
if exist "%LOCALAPPDATA%\Temp\metro-cache" (
    echo    - Removing metro bundler cache...
    rmdir /s /q "%LOCALAPPDATA%\Temp\metro-cache" >nul 2>&1
)

if exist "node_modules\.cache" (
    echo    - Removing node_modules cache...
    rmdir /s /q "node_modules\.cache" >nul 2>&1
)

echo    ✓ Cache cleared
echo.

echo [STEP 2/4] Clearing Android build cache...
echo.
cd android

if exist ".gradle" (
    echo    - Removing .gradle folder...
    rmdir /s /q ".gradle" >nul 2>&1
)

if exist "app\build" (
    echo    - Removing app build folder...
    rmdir /s /q "app\build" >nul 2>&1
)

echo    ✓ Android cache cleared
echo.

echo [STEP 3/4] Cleaning Gradle build...
echo.
echo    Running: gradlew.bat clean
echo.
call .\gradlew.bat clean

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ✗ GRADLE CLEAN FAILED!
    echo   Please check for errors above
    echo.
    pause
    exit /b 1
)

echo.
echo    ✓ Gradle cleaned successfully
echo.

cd ..

echo [STEP 4/4] Starting Metro bundler...
echo.
echo    Command: npx react-native start --reset-cache
echo.
echo    Metro will start in a few seconds...
echo    If you see errors, try again or rebuild manually
echo.
echo    Use another terminal window to run:
echo       npx react-native run-android
echo.
echo ========================================================
echo.

timeout /t 3 /nobreak

npx react-native start --reset-cache

pause
