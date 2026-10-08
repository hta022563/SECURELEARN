@echo off
setlocal
cd /d "%~dp0"
title SecureLearn Backend Launcher

echo ==========================================
echo   SecureLearn Backend Launcher
echo ==========================================
echo.

rem --- Handle command-line arguments ---
set build_mode=%1
if "%build_mode%"=="--no-cache" goto auto_no_cache
if "%build_mode%"=="--cache"    goto auto_cache
if "%build_mode%"=="--skip"     goto auto_skip
if "%build_mode%"=="--help"     goto show_help
if "%build_mode%"=="/?"         goto show_help
if not "%build_mode%"=="" (
    echo Unknown option: %build_mode%
    echo.
    goto show_help
)

rem ============================================================================
rem   Pre-flight checks (interactive mode)
rem ============================================================================
call :check_docker     || goto fail
call :check_compose    || goto fail
call :check_env        || goto fail_quiet
call :start_docker     || goto fail

rem --- Show build menu ---
echo ==========================================
echo   Build Options
echo ==========================================
echo 1. Full rebuild (NO CACHE)  [Recommended]
echo    Ensures you are running the latest code
echo.
echo 2. Quick rebuild (WITH CACHE)
echo    Faster but may use old code if unchanged
echo.
echo 3. Skip rebuild (RESTART ONLY)
echo    Just restart existing containers
echo.
set /p build_choice="Choose option (1-3, default is 1): "

if "%build_choice%"=="" set build_choice=1
if "%build_choice%"=="1" goto full_rebuild
if "%build_choice%"=="2" goto quick_rebuild
if "%build_choice%"=="3" goto skip_rebuild
echo Invalid choice, using full rebuild...

:full_rebuild
echo.
echo [Building without cache - this may take a moment...]
echo.
docker compose build --no-cache
if errorlevel 1 goto compose_failed
docker compose up -d
if errorlevel 1 goto compose_failed
goto build_complete

:quick_rebuild
echo.
echo [Building with cache...]
echo.
docker compose up --build -d
if errorlevel 1 goto compose_failed
goto build_complete

:skip_rebuild
echo.
echo [Restarting existing containers...]
echo.
docker compose up -d
if errorlevel 1 goto compose_failed
goto build_complete

:build_complete
echo.
echo ==========================================
echo   Services Status
echo ==========================================
docker compose ps
echo.
echo   Backend API  ^>  http://localhost:8080/api/v1
echo   PostgreSQL   ^>  localhost:5432
echo   DynamoDB     ^>  http://localhost:8000
echo.
echo Showing live logs. Press Ctrl+C to stop watching.
echo Containers keep running in the background.
echo.
echo To stop: run stop.bat
echo.
docker compose logs -f
goto end

rem ============================================================================
rem   Auto mode (command-line arguments bypass the menu)
rem ============================================================================

:auto_no_cache
echo [Auto: full rebuild without cache]
call :check_docker     || goto fail
call :check_compose    || goto fail
call :check_env        || goto fail_quiet
call :start_docker     || goto fail
goto full_rebuild

:auto_cache
echo [Auto: quick rebuild with cache]
call :check_docker     || goto fail
call :check_compose    || goto fail
call :check_env        || goto fail_quiet
call :start_docker     || goto fail
goto quick_rebuild

:auto_skip
echo [Auto: skip rebuild, restart only]
call :check_docker     || goto fail
call :check_compose    || goto fail
call :check_env        || goto fail_quiet
call :start_docker     || goto fail
goto skip_rebuild

rem ============================================================================
rem   Subroutines
rem ============================================================================

:check_docker
where docker >nul 2>&1
if errorlevel 1 (
    echo ==========================================
    echo [ERROR] Docker Not Found
    echo ==========================================
    echo Install Docker Desktop from:
    echo https://www.docker.com/products/docker-desktop/
    exit /b 1
)
exit /b 0

:check_compose
if not exist "docker-compose.yml" (
    echo ==========================================
    echo [ERROR] docker-compose.yml Not Found
    echo ==========================================
    echo Make sure start.bat is in the backend folder.
    exit /b 1
)
exit /b 0

:check_env
if exist ".env" exit /b 0
if not exist ".env.example" (
    echo ==========================================
    echo [ERROR] No .env or .env.example Found
    echo ==========================================
    echo Create a .env file with at minimum:
    echo   POSTGRES_PASSWORD=your-db-password
    echo   COGNITO_CLIENT_SECRET=your-cognito-secret
    exit /b 1
)
copy ".env.example" ".env" >nul
echo First-time setup: .env was created from .env.example.
echo.
echo Open .env and set the required values:
echo   POSTGRES_PASSWORD   - password for the PostgreSQL container
echo   COGNITO_CLIENT_SECRET - your AWS Cognito client secret
echo.
start notepad ".env"
exit /b 1

:start_docker
docker info >nul 2>&1
if not errorlevel 1 exit /b 0

echo Docker is not running. Attempting to start Docker Desktop...
if not exist "%ProgramFiles%\Docker\Docker\Docker Desktop.exe" (
    echo ==========================================
    echo [ERROR] Docker Desktop Not Found
    echo ==========================================
    echo Please start Docker Desktop manually,
    echo wait until the engine is running, then try again.
    exit /b 1
)

start "" "%ProgramFiles%\Docker\Docker\Docker Desktop.exe"

set tries=0
:wait_loop
set /a tries+=1
if %tries% gtr 40 (
    echo ==========================================
    echo [ERROR] Docker Startup Timeout
    echo ==========================================
    echo Docker did not become ready after 2 minutes.
    echo Please start Docker Desktop manually and try again.
    exit /b 1
)
echo Waiting for Docker to be ready... (%tries%/40)
timeout /t 3 /nobreak >nul
docker info >nul 2>&1
if errorlevel 1 goto wait_loop
echo Docker is ready.
exit /b 0

rem ============================================================================
rem   Error labels
rem ============================================================================

:compose_failed
echo.
echo ==========================================
echo [ERROR] Docker Compose Failed
echo ==========================================
echo Common causes:
echo   - Port 8080, 5432, or 8000 is already in use
echo   - POSTGRES_PASSWORD or COGNITO_CLIENT_SECRET missing in .env
echo   - Docker Desktop not fully started
echo.
goto fail

:show_help
echo ==========================================
echo   Usage
echo ==========================================
echo start.bat [OPTION]
echo.
echo Options:
echo   --no-cache    Full rebuild (recommended after code changes)
echo   --cache       Quick rebuild using Docker layer cache
echo   --skip        Skip rebuild, restart containers only
echo   --help, /?    Show this message
echo.
echo Services started:
echo   Backend API  ^>  http://localhost:8080/api/v1
echo   PostgreSQL   ^>  localhost:5432
echo   DynamoDB     ^>  http://localhost:8000
echo.
goto end

:fail
echo.
pause
exit /b 1

:fail_quiet
pause
exit /b 1

:end
pause
exit /b 0
