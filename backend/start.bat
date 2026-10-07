@echo off
setlocal
cd /d "%~dp0"
title SecureLearn Backend Launcher

echo ==========================================
echo   SecureLearn backend launcher
echo ==========================================
echo.

rem --- 1. Docker installed? ---
where docker >nul 2>&1
if errorlevel 1 goto no_docker

rem --- 2. Compose file present? ---
if not exist "docker-compose.yml" goto no_compose

rem --- 2b. Secrets file present? ---
if exist ".env" goto env_ok
if not exist ".env.example" goto no_env_example
copy ".env.example" ".env" >nul
echo First-time setup: a .env file was created for you.
echo Open it, paste your COGNITO_CLIENT_SECRET, save, then run start.bat again.
start notepad ".env"
goto fail_quiet
:env_ok

rem --- 3. Docker running? If not, try to start Docker Desktop ---
docker info >nul 2>&1
if not errorlevel 1 goto docker_ready

echo Docker is not running. Starting Docker Desktop...
if not exist "%ProgramFiles%\Docker\Docker\Docker Desktop.exe" goto docker_manual
start "" "%ProgramFiles%\Docker\Docker\Docker Desktop.exe"

set tries=0
:wait_docker
set /a tries+=1
if %tries% gtr 40 goto docker_timeout
echo Waiting for Docker to be ready... (%tries%/40)
timeout /t 3 /nobreak >nul
docker info >nul 2>&1
if errorlevel 1 goto wait_docker

:docker_ready
echo Docker is ready.
echo.

rem --- 4. Build and start everything in docker-compose.yml ---
echo Building and starting all services. The first run can take a few minutes...
echo.
docker compose up --build -d
if errorlevel 1 goto compose_failed

echo.
echo ------------------------------------------
echo  Running containers:
echo ------------------------------------------
docker compose ps
echo.
echo Backend should be available at: http://localhost:8080
echo.
echo Showing live logs. Press Ctrl+C to stop watching.
echo The containers keep running in the background.
echo To stop everything, run:  docker compose down
echo.
docker compose logs -f
goto end

:no_docker
echo [ERROR] Docker was not found.
echo Install Docker Desktop from https://www.docker.com/products/docker-desktop/
echo then run this file again.
goto fail

:no_env_example
echo [ERROR] Neither .env nor .env.example was found in:
echo %CD%
echo Create a file named .env containing:  COGNITO_CLIENT_SECRET=your-secret
goto fail

:no_compose
echo [ERROR] docker-compose.yml was not found in:
echo %CD%
echo Place start.bat in the backend folder, next to docker-compose.yml.
goto fail

:docker_manual
echo [ERROR] Could not find Docker Desktop automatically.
echo Please start Docker Desktop yourself, then run this file again.
goto fail

:docker_timeout
echo [ERROR] Docker did not become ready in time.
echo Open Docker Desktop, wait until it says "Engine running", then try again.
goto fail

:compose_failed
echo.
echo [ERROR] docker compose failed. Read the messages above for the cause.
goto fail

:fail
echo.
:fail_quiet
pause
exit /b 1

:end
pause
exit /b 0
