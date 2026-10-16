@echo off
cd /d "%~dp0"
echo.
echo Iniciando StreamHub em http://localhost:8080/
echo Nao feche esta janela enquanto usar o app.
echo.

where py >nul 2>nul
if %errorlevel%==0 (
  start "" http://localhost:8080/
  py -3 -m http.server 8080
  goto :eof
)

where python >nul 2>nul
if %errorlevel%==0 (
  start "" http://localhost:8080/
  python -m http.server 8080
  goto :eof
)

where python3 >nul 2>nul
if %errorlevel%==0 (
  start "" http://localhost:8080/
  python3 -m http.server 8080
  goto :eof
)

echo Python nao encontrado neste PC.
echo.
echo Instale Python em https://www.python.org/downloads/
echo (marque "Add Python to PATH" na instalacao)
echo.
echo Ou publique esta pasta num servidor FTP/web e abra pelo http:// do site.
echo.
pause
