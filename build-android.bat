@echo off
echo Cleaning Android build artifacts...
cd android
rmdir /s /q .gradle 2>nul
rmdir /s /q app\build 2>nul
rmdir /s /q app\.cxx 2>nul
rmdir /s /q build 2>nul

echo Starting clean build...
call gradlew clean
call gradlew assembleDebug

echo Build complete
pause