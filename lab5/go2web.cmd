@echo off
set SCRIPT_DIR=%~dp0
python "%SCRIPT_DIR%go2web.py" %*
if not "%ERRORLEVEL%"=="9009" exit /b %ERRORLEVEL%
py -3 "%SCRIPT_DIR%go2web.py" %*
