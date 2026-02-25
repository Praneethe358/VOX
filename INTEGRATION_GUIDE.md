# MindKraft - Frontend & Backend Integration Guide

## 🎯 Overview

The MindKraft project is now fully integrated with both frontend and backend working together. The system uses:
- **Frontend**: React + TypeScript + Vite + TailwindCSS (Port 5174)
- **Backend**: Express.js + Node.js + Mock Database (Port 3000)

## 🚀 Quick Start

### 1. Start the Backend Server (Port 3000)

```bash
cd Team-A-Backend/Team-A-Backend
npm run server:mock
```

This will start the backend with an in-memory mock database (no MongoDB installation required).

**Default Admin Credentials:**
- Username: `admin`
- Password: `admin123`

### 2. Start the Frontend Development Server (Port 5174)

```bash
cd Team-A-Frontend
npm run dev
```

The frontend will be available at: http://localhost:5174

### 3. Access the Application

- **Splash Screen**: http://localhost:5174/
- **Admin Login**: http://localhost:5174/login
- **Admin Portal**: http://localhost:5174/admin
- **Dashboard**: http://localhost:5174/dashboard
- **Exam Interface**: http://localhost:5174/exam

## 🔧 Configuration

### Frontend Configuration (`.env`)

Located at: `Team-A-Frontend/.env`

```env
# Backend API Configuration
VITE_API_BASE_URL=http://localhost:3000
```

### Backend Configuration (`.env`)

Located at: `Team-A-Backend/Team-A-Backend/.env`

```env
# Use mock database (set to true to use in-memory database without MongoDB)
USE_MOCK_DB=true

# MongoDB Connection (only needed if USE_MOCK_DB=false)
MONGODB_URI=mongodb://127.0.0.1:27017

# Server Port
PORT=3000

# Ollama API (optional - for AI grading)
OLLAMA_URL=http://localhost:11434
```

## 📡 API Endpoints

The backend exposes several API endpoints:

### Admin Endpoints

- `POST /api/admin/login` - Admin authentication
- `POST /api/admin/upload-exam-pdf` - Upload exam PDF
- `POST /api/admin/publish-exam` - Publish an exam
- `POST /api/admin/register-student-face` - Register student with face data

### Student Endpoints

- `GET /api/student/exams` - Get available exams
- `POST /api/student/start-exam` - Start an exam session
- `POST /api/student/submit-answer` - Submit an answer
- `POST /api/student/end-exam` - End exam session

### Health Check

- `GET /health` - Check server health

## 🔐 Authentication Flow

1. User visits login page at `/login`
2. Enters username and password
3. Frontend calls `POST /api/admin/login`
4. Backend validates credentials against mock database
5. On success, frontend stores session data and redirects to `/admin`

## 📦 Project Structure

```
mk-frontend/
├── Team-A-Frontend/          # React Frontend
│   ├── src/
│   │   ├── api/
│   │   │   ├── apiService.ts  # API integration layer
│   │   │   └── bridge.ts      # Electron bridge (optional)
│   │   ├── components/
│   │   ├── pages/
│   │   │   ├── adminlogin.tsx # Login page (integrated)
│   │   │   ├── AdminPortal.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── ExamInterface.tsx
│   │   │   └── SplashScreen.tsx
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── .env                   # Frontend config
│   └── package.json
│
└── Team-A-Backend/
    └── Team-A-Backend/        # Express Backend
        ├── src/
        │   ├── database/
        │   │   ├── mock-mongo.ts      # In-memory mock DB
        │   │   ├── mongo-client.ts    # Real MongoDB client
        │   │   └── seed.ts            # Database seeding
        │   ├── server/
        │   │   ├── routes/
        │   │   │   ├── admin.routes.ts   # Admin API routes
        │   │   │   ├── student.routes.ts
        │   │   │   ├── ai.routes.ts
        │   │   │   └── db.routes.ts
        │   │   ├── express-app.ts
        │   │   ├── server.ts
        │   │   ├── standalone.ts         # Regular server (requires MongoDB)
        │   │   └── standalone-mock.ts    # Mock DB server (no MongoDB needed)
        │   └── services/
        ├── .env                          # Backend config
        └── package.json
```

## 🧪 Testing the Integration

### Using the Browser

1. Open http://localhost:5174/login
2. Enter credentials: `admin` / `admin123`
3. Click "Log In"
4. You should see a loading animation, then success, then redirect to Admin Portal

### Using cURL

Test the backend API directly:

```bash
# Test login endpoint
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"admin\",\"password\":\"admin123\"}"

# Expected response: {"success":true}

# Test health check
curl http://localhost:3000/health

# Expected response: {"status":"ok","service":"mindkraft-backend","timestamp":"..."}
```

## 🗄️ Database Options

### Option 1: Mock Database (Recommended for Development)

**Pros:**
- No MongoDB installation required
- Fast setup
- Perfect for development and testing
- Data persists for the session

**Cons:**
- Data resets when server restarts
- Not suitable for production

**Usage:** Already configured! Just run `npm run server:mock`

### Option 2: Real MongoDB (For Production)

**Requirements:**
- MongoDB installed and running on `mongodb://127.0.0.1:27017`

**Setup:**
1. Install MongoDB
2. Update `.env`: Set `USE_MOCK_DB=false`
3. Start MongoDB service
4. Run: `npm run server`

## 🎨 Frontend API Service

The frontend includes a comprehensive API service (`src/api/apiService.ts`) that handles all backend communication:

```typescript
import { adminApi, studentApi, dbApi } from './api/apiService';

// Example: Login
const result = await adminApi.login('admin', 'admin123');
if (result.success) {
  // Login successful
}

// Example: Upload exam PDF
await adminApi.uploadExamPdf(pdfFile, {
  code: 'EXAM101',
  title: 'My Exam',
  durationMinutes: 60
});

// Example: Get available exams
const exams = await studentApi.getAvailableExams();
```

## 🔍 Troubleshooting

### Backend won't start

**Error:** `MongoServerSelectionError: connect ECONNREFUSED 127.0.0.1:27017`
**Solution:** You're trying to use real MongoDB but it's not running. Either:
1. Use mock database: `npm run server:mock`, OR
2. Install and start MongoDB

### Frontend can't connect to backend

**Error:** "Connection error. Please check if the backend is running."
**Solution:**
1. Verify backend is running on port 3000
2. Check `.env` file has correct `VITE_API_BASE_URL`
3. Restart frontend dev server if you changed `.env`

### Login not working

**Issue:** Invalid credentials error
**Solution:**
- Use default credentials: `admin` / `admin123`
- Check backend logs for errors
- Verify backend is using mock database

### CORS errors

**Solution:** Backend is already configured to allow all origins for development. If issues persist:
1. Clear browser cache
2. Check browser console for specific error
3. Verify backend CORS configuration in `express-app.ts`

## 📝 Next Steps

1. **Enhance Admin Portal**: Add exam management, student registration, and analytics
2. **Implement Student Interface**: Complete exam taking flow with voice interface
3. **Add Real MongoDB**: For persistent data storage
4. **Implement Face Recognition**: Integrate face verification for students
5. **Add AI Grading**: Connect Ollama for automated answer evaluation

## 🤝 Integration Checklist

- ✅ Backend server created with Express
- ✅ Mock database implemented (no MongoDB required)
- ✅ API routes defined (admin, student, AI, db)
- ✅ Frontend API service created
- ✅ Admin login integrated with real backend
- ✅ Environment configuration files created
- ✅ CORS configured for development
- ✅ Error handling implemented
- ✅ Session management added
- ✅ Both servers running simultaneously

## 🎓 Demo Exam Data

The system comes pre-seeded with:

**Demo Exam: TECH101**
- Title: Introduction to AI (Demo)
- Duration: 30 minutes
- Status: Active
- Questions:
  1. What is the full form of AI?
  2. Define Machine Learning in one sentence.
  3. Who is known as the father of Artificial Intelligence?

## 👥 Contributing

When making changes:
1. Update this README if you add new features
2. Follow the existing code structure
3. Test both frontend and backend integration
4. Document new API endpoints

---

**Happy Coding! 🚀**
