# Vox — Development Setup Guide

> Complete environment setup for developing Vox

---

## Table of Contents

- [System Requirements](#system-requirements)
- [Step 1: Prerequisites Installation](#step-1-prerequisites-installation)
- [Step 2: Repository Setup](#step-2-repository-setup)
- [Step 3: Backend Setup](#step-3-backend-setup)
- [Step 4: Frontend Setup](#step-4-frontend-setup)
- [Step 5: Database Setup](#step-5-database-setup)
- [Step 6: Verify Installation](#step-6-verify-installation)
- [IDE Setup](#ide-setup)
- [Troubleshooting](#troubleshooting)

---

## System Requirements

### Hardware
- **RAM**: 8GB minimum (16GB recommended)
- **Storage**: 5GB free space
- **CPU**: Dual-core (quad-core recommended)
- **GPU**: Optional (acceleration for face detection)

### Software
- **OS**: Windows 10+, macOS 11+, Linux (Ubuntu 20.04+)
- **Python**: 3.11 or higher
- **Node.js**: 18.0 or higher
- **npm**: 9.0 or higher
- **MongoDB**: 7.x or higher
- **Git**: Latest stable version

---

## Step 1: Prerequisites Installation

### Windows

#### Install Python
```powershell
# Download from https://www.python.org/downloads/
# Or use Chocolatey:
choco install python

# Verify installation
python --version
```

#### Install Node.js
```powershell
# Download from https://nodejs.org/
# Or use Chocolatey:
choco install nodejs

# Verify installation
node --version
npm --version
```

#### Install MongoDB
```powershell
# Download from https://www.mongodb.com/try/download/community
# Or use Chocolatey:
choco install mongodb-community

# Start MongoDB service
net start MongoDB
```

#### Install Git
```powershell
choco install git

# Verify installation
git --version
```

### macOS

```bash
# Using Homebrew
brew install python@3.11
brew install node
brew install mongodb-community
brew install git

# Verify installations
python3 --version
node --version
npm --version
mongod --version
git --version

# Start MongoDB (one-time)
brew services start mongodb-community
```

### Linux (Ubuntu 20.04+)

```bash
# Update package manager
sudo apt update && sudo apt upgrade -y

# Install Python
sudo apt install python3 python3-pip python3-venv

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-5.0.asc | sudo apt-key add -
echo "deb http://repo.mongodb.org/apt/ubuntu focal/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install mongodb-org

# Start MongoDB
sudo systemctl start mongod

# Install Git
sudo apt install git

# Verify installations
python3 --version
node --version
npm --version
mongod --version
git --version
```

---

## Step 2: Repository Setup

```bash
# Clone the repository
git clone https://github.com/your-org/vox.git
cd vox

# Verify structure
ls -la
# Should show: .git, Team-A-Frontend/, .venv (after setup)
```

---

## Step 3: Backend Setup

### Create Python Virtual Environment

```bash
# Create venv
python -m venv .venv

# Activate venv
# On Windows (PowerShell):
.\.venv\Scripts\Activate.ps1

# On Windows (Command Prompt):
.venv\Scripts\activate

# On macOS/Linux:
source .venv/bin/activate

# Verify activation (should show (.venv) prefix in terminal)
```

### Install Backend Dependencies

```bash
# Navigate to backend directory
cd Team-A-Frontend/Team-A-Backend/Team-A-Backend

# Install Python packages
pip install -r requirements.txt

# Verify installation
pip list
# Should show: fastapi, uvicorn, pymongo, pyjwt, etc.
```

### Configure Backend Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your settings (optional)
# Default settings should work for local development
cat .env
```

### Verify Backend Configuration

```bash
# Check if dependencies are working
python -c "import fastapi; import pymongo; print('Dependencies OK')"

# Output: Dependencies OK
```

---

## Step 4: Frontend Setup

### Install Frontend Dependencies

```bash
# Navigate to frontend directory
cd ../../../Team-A-Frontend

# Install npm packages
npm install

# Verify installation
npm list --depth=0
# Should show: react, vite, typescript, tailwind, face-api.js, etc.
```

### Configure Frontend Environment

```bash
# Copy environment template (if exists)
cp .env.example .env || echo "No template found"

# Verify .env content
cat .env
# Should show: VITE_API_BASE_URL=http://localhost:3000
```

---

## Step 5: Database Setup

### Start MongoDB

```bash
# Windows (Command Prompt):
mongod

# Windows (PowerShell):
mongosh

# macOS/Linux:
mongod --config /usr/local/etc/mongod.conf
# Or if using Homebrew services:
brew services start mongodb-community

# Verify MongoDB is running
mongosh --eval "db.serverStatus()"
# You should see server status information
```

### Initialize Database (Auto on First Run)

The database will be initialized automatically on first backend startup:

```bash
python -m uvicorn app.main:app --reload --port 3000
# Backend will:
# 1. Connect to MongoDB
# 2. Create 'vox' database
# 3. Create collections (exams, students, etc.)
# 4. Create super-admin user (admin@vox.edu / ChangeMe@123)
# 5. Print initialization logs
```

---

## Step 6: Verify Installation

### Test Backend

```bash
# Terminal 1: Start backend
cd Team-A-Frontend/Team-A-Backend/Team-A-Backend
python -m uvicorn app.main:app --reload --port 3000

# Terminal 2: Test health endpoint
curl http://localhost:3000/health

# Expected output:
# {"status":"ok","service":"vox-backend","timestamp":"2026-03-17T..."}
```

### Test Frontend

```bash
# Terminal 3: Start frontend
cd Team-A-Frontend/Team-A-Frontend
npm run dev

# Expected output:
# ➜  Local:   http://localhost:5173/
# ➜  Network: use --host to expose
```

### Access Application

- Open `http://localhost:5173` in browser
- Frontend should load without errors
- Student login should be accessible
- Landing page should narrate: **"Welcome to Vox. Say Student or Admin to continue."**
- Saying **Student** should navigate to `/student/login`, and **Admin** to `/admin-login`
- Landing page should not play the 15-second silence reminder prompt

### Run Smoke Test

```bash
# Terminal 4: Run tests
cd Team-A-Frontend/Team-A-Backend/Team-A-Backend
python scripts/smoke_test.py

# Expected output should show:
# ✓ Admin login successful
# ✓ Exam creation successful
# ✓ Student face registration successful
# ✓ Face verification successful
# ✓ Exam submission successful
```

---

## IDE Setup

### VS Code (Recommended)

#### Extensions to Install

1. **Python**
   - Publisher: Microsoft
   - ID: ms-python.python

2. **Pylance**
   - Publisher: Microsoft
   - ID: ms-python.vscode-pylance

3. **Black Formatter**
   - ID: ms-python.black-formatter

4. **ESLint**
   - Publisher: Microsoft
   - ID: dbaeumer.vscode-eslint

5. **Prettier - Code Formatter**
   - ID: esbenp.prettier-vscode

6. **Tailwind CSS IntelliSense**
   - ID: bradlc.vscode-tailwindcss

#### Workspace Settings (`.vscode/settings.json`)

Create `.vscode/settings.json` in project root:

```json
{
  "python.defaultInterpreterPath": "${workspaceFolder}\\.venv\\Scripts\\python",
  "python.linting.enabled": true,
  "python.linting.pylintEnabled": true,
  "python.formatting.provider": "black",
  "[python]": {
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "ms-python.python"
  },
  "[typescript]": {
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "editor.insertSpaces": true,
  "editor.tabSize": 2,
  "files.trimTrailingWhitespace": true
}
```

#### Launch Configuration (`.vscode/launch.json`)

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Python: FastAPI Backend",
      "type": "python",
      "request": "launch",
      "module": "uvicorn",
      "args": ["app.main:app", "--reload", "--port", "3000"],
      "jinja": true,
      "cwd": "${workspaceFolder}/Team-A-Frontend/Team-A-Backend/Team-A-Backend"
    }
  ]
}
```

---

## Development Workflow

### Daily Development

```bash
# Open project
cd Team-A-Frontend

# Activate Python venv (if not already active)
.\.venv\Scripts\Activate.ps1

# Start both backend and frontend
npm run dev:full

# Or in separate terminals:
# Terminal 1:
cd Team-A-Backend/Team-A-Backend
python -m uvicorn app.main:app --reload --port 3000

# Terminal 2:
cd Team-A-Frontend
npm run dev
```

### Code Changes Auto-Reload

- **Backend**: FastAPI with `--reload` automatically restarts on file changes
- **Frontend**: Vite with HMR (Hot Module Replacement) updates instantly

### Testing Changes

```bash
# Test backend routes
curl http://localhost:3000/api/v1/exams

# Test frontend in browser
# Open DevTools (F12) to check for errors
```

---

## Troubleshooting

### Virtual Environment Issues

```bash
# If venv is broken, recreate it
rmdir .venv /s /q          # Windows
rm -rf .venv               # macOS/Linux

# Recreate
python -m venv .venv
.venv\Scripts\activate     # Windows
source .venv/bin/activate  # macOS/Linux

# Reinstall packages
pip install -r requirements.txt
```

### MongoDB Connection Failed

```bash
# Check if MongoDB is running
mongosh --eval "db.serverStatus()"

# If not running, start it:
# Windows:
net start MongoDB

# macOS:
brew services start mongodb-community

# Linux:
sudo systemctl start mongod
```

### Port 3000 Already in Use

```bash
# Find and kill process on port 3000
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux:
lsof -i :3000
kill -9 <PID>
```

### Frontend Won't Build

```bash
# Clear cache and reinstall
cd Team-A-Frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Dependencies Installation Slow

```bash
# Use npm cache clean
npm cache clean --force

# Or use different npm registry
npm config set registry https://registry.npmjs.org/
npm install
```

---

## Next Steps

1. Read [QUICKSTART.md](QUICKSTART.md) to run the application
2. Check [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) for file organization
3. Review [TECH_STACK.md](TECH_STACK.md) for architecture details
4. See [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) for API documentation
