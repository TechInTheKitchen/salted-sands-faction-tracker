@echo off
setlocal
title Faction Tracker
cd /d "%~dp0.."
if errorlevel 1 goto folder_error

where node.exe >nul 2>nul
if not errorlevel 1 goto node_path
if exist "%ProgramFiles%\nodejs\node.exe" goto node_programfiles
if exist "%ProgramFiles(x86)%\nodejs\node.exe" goto node_x86

echo Node.js could not be found. Install Node.js and try again.
goto failed

:node_path
node.exe "%~dp0local-server.cjs" %*
goto finished

:node_programfiles
"%ProgramFiles%\nodejs\node.exe" "%~dp0local-server.cjs" %*
goto finished

:node_x86
"%ProgramFiles(x86)%\nodejs\node.exe" "%~dp0local-server.cjs" %*
goto finished

:folder_error
echo The app folder could not be opened.
goto failed

:finished
if not errorlevel 1 exit /b 0
echo.
echo The local site stopped because of the error shown above.

:failed
echo.
pause
exit /b 1

