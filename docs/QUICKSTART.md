# Vox — Quick Start Guide

> Get up and running with Vox in under 5 minutes

---

## Prerequisites

- **Python 3.11+** (with `python` command available)
- **Node.js 18+** (with `npm` command available)
- **MongoDB 7.x+** running locally on `mongodb://127.0.0.1:4200`
- **Git** for version control

---

## 1. Clone & Setup

```bash
# Clone the repository (if not already cloned)
git clone <repository-url>
cd Team-A-Frontend

# Create Python virtual environment
python -m venv .venv

# Activate virtual environment
# On Windows:
.\.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

# Install backend dependencies
cd Team-A-Backend/Team-A-Backend
pip install -r requirements.txt

# Install frontend dependencies
cd ../../Team-A-Frontend
npm install
```

---

## 2. Start Both Backend & Frontend

### Option A: Run Both Concurrently (Recommended)

From `Team-A-Frontend/Team-A-Frontend/`:

```bash
npm run dev:full
```

This will start:
- **Backend** (Python FastAPI) on `http://localhost:4000`
- **Frontend** (React Vite) on `http://localhost:4100`

### Option B: Run Separately in 2 Terminals

**Terminal 1 - Backend:**
```bash
cd Team-A-Backend/Team-A-Backend
python -m uvicorn app.main:app --reload --port 4000
```

**Terminal 2 - Frontend:**
```bash
cd Team-A-Frontend
npm run dev
```

---

## 3. Access the Application

- **Student Portal**: `http://localhost:4100/` (Face login or password fallback)
- **Admin Portal**: `http://localhost:4100/admin-login`
- **API Documentation**: `http://localhost:4000/docs` (Swagger UI)
- **Backend Health**: `http://localhost:4000/health`

Landing behavior (current):
- On first load of `/`, Vox speaks: **"Welcome to Vox. Say Student or Admin to continue."**
- Voice command examples: say **Student** to open student login or **Admin** to open admin login.
- The 15-second inactivity reminder is intentionally disabled on landing page.

---

## 4. Test Credentials

### Admin Account (Auto-created on startup)
- **Email**: `admin@vox.edu`
- **Password**: `ChangeMe@123`

### Test Face Registration
1. Go to Student Portal
2. Click "Register with Face"
3. Capture 5 face frames
4. Log in using face recognition

---

## 5. Smoke Test (Verify Setup)

From backend directory:
```bash
python scripts/smoke_test.py
```

This validates:
- Admin login
- Exam creation
- Student face registration
- Face verification
- Exam submission

---

## 6. Troubleshooting

### Backend won't start
```bash
# Check MongoDB is running
mongosh -u admin -p password --authenticationDatabase admin

# Check port 4000 is free
netstat -ano | findstr :4000

# Install missing dependencies
pip install -r requirements.txt
```

### Frontend won't start
```bash
# Clear cache and reinstall
rm -r node_modules package-lock.json
npm install
npm run dev
```

### Face recognition not working
1. Check browser camera permissions
2. Ensure good lighting
3. Look directly at camera during registration
4. Check browser console for errors

---

## 7. Development Workflow

### Run Backend with Auto-Reload
```bash
python -m uvicorn app.main:app --reload --port 4000
```

### Run Frontend with Hot Reload
```bash
npm run dev
```

### Build for Production
```bash
# Backend (create dist folder)
python -m PyInstaller app/main.py

# Frontend
npm run build
```

---

## 8. Project Structure

```
Team-A-Frontend/
├── Team-A-Backend/Team-A-Backend/   # Python FastAPI backend
│   ├── app/                         # Application code
│   ├── scripts/                     # Utilities
│   ├── requirements.txt             # Dependencies
│   └── start-python-backend.ps1    # Windows startup
├── Team-A-Frontend/                 # React frontend
│   ├── src/                        # React source
│   └── package.json                # npm dependencies
├── QUICKSTART.md                    # This file!
├── README.md                        # Full documentation
├── TECH_STACK.md                   # Architecture details
└── INTEGRATION_GUIDE.md            # API reference
```

---

## 9. Next Steps

- Read [README.md](README.md) for feature overview
- Check [TECH_STACK.md](TECH_STACK.md) for architecture details
- Review [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) for API endpoints
- See [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) for file organization

---

## Support

For issues or questions:
1. Check project documentation
2. Review backend logs: `http://localhost:4000/health`
3. Check browser console for frontend errors
4. Review smoke test output: `python scripts/smoke_test.py`
