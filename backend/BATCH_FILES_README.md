# Backend Batch Files Guide

## 📁 Available Scripts

### `start.bat` - Start Backend Services

Builds and starts the SecureLearn backend with Docker Compose.

#### Interactive Mode (Recommended for First-Time Users)
```bash
start.bat
```

You'll be prompted to choose:
1. **Full rebuild (NO CACHE)** ⭐ Recommended - Ensures latest code
2. **Quick rebuild (WITH CACHE)** - Faster but may use old code
3. **Skip rebuild (RESTART ONLY)** - Just restart existing containers

#### Command-Line Mode (For Automation)

```bash
# Always rebuild without cache (RECOMMENDED after code changes)
start.bat --no-cache

# Quick rebuild with cache (faster)
start.bat --cache

# Just restart without rebuilding (fastest)
start.bat --skip

# Show help
start.bat --help
```

### `stop.bat` - Stop Backend Services

Stops the running containers.

```bash
# Stop containers (keep them for quick restart)
stop.bat

# Stop and remove containers (clean state)
stop.bat --remove

# Stop and remove EVERYTHING (containers + images + volumes)
stop.bat --clean

# Show help
stop.bat --help
```

---

## 🎯 Common Use Cases

### First Time Setup
```bash
# 1. Run start.bat
start.bat

# 2. If prompted, edit .env file and add COGNITO_CLIENT_SECRET
# 3. Run start.bat again
start.bat --no-cache
```

### After Changing Code
```bash
# Always use --no-cache to ensure Docker uses new code
start.bat --no-cache
```

### Quick Restart (No Code Changes)
```bash
# Stop
stop.bat

# Start without rebuild
start.bat --skip
```

### Clean Start (Remove Everything)
```bash
# Remove all containers, images, and data
stop.bat --clean

# Rebuild from scratch
start.bat --no-cache
```

### Daily Development Workflow
```bash
# Morning: Start everything
start.bat --skip

# After code changes: Rebuild
stop.bat
start.bat --no-cache

# Evening: Stop everything
stop.bat
```

---

## 🔧 What start.bat Does

1. **Checks Docker** - Verifies Docker is installed and running
2. **Starts Docker Desktop** - Automatically if not running (Windows)
3. **Creates .env** - Copies from .env.example if needed
4. **Builds Backend** - With or without cache based on your choice
5. **Starts Services**:
   - DynamoDB Local (port 8000)
   - Backend API (port 8080)
6. **Shows Logs** - Live logs from all containers

---

## ⚙️ Environment Setup

### Required: .env File

On first run, `start.bat` will create a `.env` file from `.env.example`.

**You MUST edit it and add:**
```bash
COGNITO_CLIENT_SECRET=your-actual-secret-here
```

### Optional Environment Variables

```bash
# CORS origins (comma-separated)
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# DynamoDB Configuration (auto-set by docker-compose.yml)
AWS_DYNAMODB_ENDPOINT=http://dynamodb-local:8000
AWS_DYNAMODB_REGION=ap-southeast-1
```

---

## 🚨 Troubleshooting

### "Docker is not running"
**Solution**: 
- Start Docker Desktop manually
- Wait until it says "Engine running"
- Run `start.bat` again

### "Port 8080 already in use"
**Solution**:
```bash
# Check what's using the port
netstat -ano | findstr :8080

# Stop the backend container
stop.bat

# Start again
start.bat --skip
```

### "Old code still running after rebuild"
**Solution**:
```bash
# Clean everything and rebuild
stop.bat --clean
start.bat --no-cache
```

### "COGNITO_CLIENT_SECRET error"
**Solution**:
1. Open `.env` file in `backend/` folder
2. Add: `COGNITO_CLIENT_SECRET=your-secret`
3. Save and run `start.bat` again

---

## 📊 Container Status

### Check Running Containers
```bash
docker compose ps
```

### View Logs
```bash
# All containers
docker compose logs -f

# Backend only
docker compose logs -f backend

# DynamoDB only
docker compose logs -f dynamodb-local
```

### Execute Commands in Container
```bash
# Access backend container shell
docker compose exec backend bash

# Access DynamoDB container
docker compose exec dynamodb-local sh
```

---

## 🎨 Build Modes Explained

### 1. NO CACHE (--no-cache) ⭐ RECOMMENDED
- **When**: After code changes, pulling new code
- **Speed**: Slowest (~2-3 minutes)
- **Guarantee**: Always uses latest code
- **Use**: `start.bat --no-cache`

### 2. WITH CACHE (--cache)
- **When**: Quick restart, testing without code changes
- **Speed**: Medium (~30 seconds)
- **Risk**: May use old cached code if files look unchanged
- **Use**: `start.bat --cache`

### 3. SKIP REBUILD (--skip)
- **When**: Just restarting existing containers
- **Speed**: Fastest (~5 seconds)
- **Note**: Won't pick up any code changes
- **Use**: `start.bat --skip`

---

## 🔄 Version Control

**DO NOT commit these files:**
- `.env` - Contains secrets
- `docker/dynamodb/shared-local-instance.db` - Local database

**Safe to commit:**
- `.env.example` - Template
- `start.bat` - Startup script
- `stop.bat` - Stop script
- `docker-compose.yml` - Docker configuration

---

## 💡 Pro Tips

1. **Always use --no-cache after git pull**
   ```bash
   git pull
   stop.bat
   start.bat --no-cache
   ```

2. **Create desktop shortcuts**
   - Right-click `start.bat` → Send to → Desktop (create shortcut)
   - Edit properties → Add `--no-cache` to target

3. **Use Task Scheduler for auto-start**
   - Schedule `start.bat --skip` to run at login
   - Backend automatically starts with Windows

4. **Monitor resource usage**
   ```bash
   docker stats
   ```

5. **Quick cleanup command**
   ```bash
   # Remove stopped containers and unused images
   docker system prune
   ```

---

## 📞 Support

If you encounter issues:

1. Check Docker Desktop is running
2. Check `.env` file has `COGNITO_CLIENT_SECRET`
3. Try `stop.bat --clean` then `start.bat --no-cache`
4. Check logs: `docker compose logs -f`

---

**Last Updated**: 2026-10-07  
**Docker Compose Version**: 2.x  
**Windows Version**: Windows 10/11
