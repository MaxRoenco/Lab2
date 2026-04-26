@echo off
set SCRIPT_DIR=%~dp0
py -3 "%SCRIPT_DIR%go2web.py" %*
