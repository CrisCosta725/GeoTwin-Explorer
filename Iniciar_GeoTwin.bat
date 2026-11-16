@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if not errorlevel 1 (
    node -e "process.exit(Number(process.versions.node.split('.')[0]) < 18 ? 1 : 0)" >nul 2>nul
    if not errorlevel 1 (
        node "%~dp0iniciar_geotwin.mjs" %*
        goto :fin
    )
)
where py >nul 2>nul
if not errorlevel 1 (
    py -3 -c "import sys; sys.exit(sys.version_info < (3, 10))" >nul 2>nul
    if not errorlevel 1 (
        py -3 "%~dp0iniciar_geotwin.py" %*
        goto :fin
    )
)
where python >nul 2>nul
if not errorlevel 1 (
    python -c "import sys; sys.exit(sys.version_info < (3, 10))" >nul 2>nul
    if not errorlevel 1 (
        python "%~dp0iniciar_geotwin.py" %*
        goto :fin
    )
)
echo GeoTwin requiere Node.js 18+ o Python 3.10+ en la ruta del sistema.
echo Si usas ArcGIS Pro, abre su Python Command Prompt y ejecuta:
echo python "%~dp0iniciar_geotwin.py"
pause
exit /b 1

:fin
set "geotwin_exit=%errorlevel%"
if not "%geotwin_exit%"=="0" pause
exit /b %geotwin_exit%
