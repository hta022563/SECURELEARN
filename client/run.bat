@echo off
echo [1/3] Dang dung va xoa container cu (neu co)...
docker stop fe-container 2>nul
docker rm fe-container 2>nul

echo [2/3] Dang build lai Docker Image cho Front-End (Vite)...
docker build --no-cache -t securelearn-fe .

if %errorlevel% neq 0 (
    echo.
    echo [LOI] Build that bai! Vui lòng kiem tra lai thong bao loi o tren.
    pause
    exit /b %errorlevel%
)

echo [3/3] Dang khoi chay Container...
docker run -d -p 3000:80 --name fe-container securelearn-fe

echo.
echo ==========================================
echo HOAN TAT! Giao dien da san sang tai:
echo http://localhost:3000
echo ==========================================
pause