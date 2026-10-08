@echo off
setlocal
cd /d "%~dp0"
title SecureLearn Backend - Stop

echo ==========================================
echo   SecureLearn Backend - Stop
echo ==========================================
echo.

rem --- Handle command-line arguments ---
set stop_mode=%1
if "%stop_mode%"=="--remove" goto stop_remove
if "%stop_mode%"=="--clean"  goto stop_clean
if "%stop_mode%"=="--help"   goto show_help
if "%stop_mode%"=="/?"       goto show_help
if not "%stop_mode%"=="" (
    echo Unknown option: %stop_mode%
    echo.
    goto show_help
)

rem --- Pre-flight checks ---
call :check_docker  || goto fail
call :check_compose || goto fail

echo Stopping all containers (data is preserved)...
echo.
docker compose stop
if errorlevel 1 (
    echo.
    echo [ERROR] Failed to stop containers.
    goto fail
)

echo.
echo   Containers stopped. Data in postgres-data volume is safe.
echo.
echo   Restart:       run start.bat
echo   Remove:        run stop.bat --remove
echo   Remove + data: run stop.bat --clean
echo.
docker compose ps -a
goto end

rem ============================================================================

:stop_remove
call :check_docker  || goto fail
call :check_compose || goto fail

echo Stopping and removing containers...
echo (The postgres-data volume and its data are kept.)
echo.
docker compose down
if errorlevel 1 (
    echo [ERROR] Failed to remove containers.
    goto fail
)
echo.
echo   Containers removed. Database volume preserved.
echo   Run start.bat to rebuild and start fresh.
goto end

rem ============================================================================

:stop_clean
call :check_docker  || goto fail
call :check_compose || goto fail

echo ==========================================
echo   CLEAN MODE
echo ==========================================
echo.
echo This will permanently remove:
echo   - All containers
echo   - All images built by this project
echo   - The postgres-data volume  ^(ALL DATABASE DATA LOST^)
echo   - The DynamoDB data volume
echo.
set /p confirm="Type YES to confirm: "
if /i not "%confirm%"=="YES" (
    echo Cancelled.
    goto end
)

echo.
echo Removing containers, images and volumes...
docker compose down --rmi local --volumes
if errorlevel 1 (
    echo [ERROR] Clean failed. Some resources may still exist.
    goto fail
)
echo.
echo   Everything removed. Run start.bat to rebuild from scratch.
goto end

rem ============================================================================
rem   Subroutines
rem ============================================================================

:check_docker
where docker >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker was not found.
    exit /b 1
)
exit /b 0

:check_compose
if not exist "docker-compose.yml" (
    echo [ERROR] docker-compose.yml was not found in: %CD%
    exit /b 1
)
exit /b 0

rem ============================================================================

:show_help
echo Usage: stop.bat [OPTION]
echo.
echo   (none)      Stop containers, keep volumes and images
echo   --remove    Stop and remove containers, keep volumes
echo   --clean     Remove containers, images and volumes (data loss!)
echo   --help, /?  Show this message
echo.
goto end

:fail
echo.
pause
exit /b 1

:end
pause
exit /b 0
