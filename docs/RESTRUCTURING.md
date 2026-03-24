# 📁 Project Restructuring — Changelog

**Date:** 2026-03-25  
**Commit:** `09fc029` on branch `UI`  

---

## Why

The original project layout was deeply nested and confusing:

- Frontend was at `Team-A-Frontend/Team-A-Frontend/` (nested inside itself)
- Backend was at `Team-A-Frontend/Team-A-Backend/Team-A-Backend/` (double-nested)
- `.git/` was inside `Team-A-Frontend/`, not at the project root
- Empty junk directories existed (`echo/`, `docs folder created/`)
- Docker configs referenced deeply nested paths
- Docs were buried inside `Team-A-Frontend/docs/`

## What Changed

### Directory Layout

| Before | After |
|--------|-------|
| `Team-A-Frontend/Team-A-Frontend/` | `frontend/` |
| `Team-A-Frontend/Team-A-Backend/Team-A-Backend/` | `backend/` |
| `Team-A-Frontend/docs/` | `docs/` |
| `Team-A-Frontend/Team-A-Frontend/nginx.conf` | `nginx/nginx.conf` |
| `Team-A-Frontend/.git/` | `.git/` (project root) |

### Final Structure

```
d:\mindkraft\
├── .git/                  # Git repository at root
├── .gitignore             # Unified gitignore
├── .dockerignore          # Docker build exclusions
├── docker-compose.yml     # Orchestration (paths updated)
├── README.md              # Project readme
├── seed_data.js           # MongoDB seed script
│
├── frontend/              # React 18 + Vite + TypeScript
│   ├── src/               # Source code
│   │   ├── api/           # API client (unified)
│   │   ├── components/    # Shared components
│   │   ├── context/       # React contexts (Auth, Exam, Voice)
│   │   ├── hooks/         # Custom hooks
│   │   ├── pages/         # Page components
│   │   ├── services/      # Student API service
│   │   ├── types/         # TypeScript types
│   │   └── utils/         # Utility functions
│   ├── public/            # Static assets (face-api models)
│   ├── Dockerfile.nginx   # Multi-stage build (updated)
│   ├── package.json       # Dependencies
│   ├── vite.config.ts     # Vite configuration
│   └── tsconfig.json      # TypeScript config
│
├── backend/               # Python FastAPI
│   ├── app/               # Application code
│   │   ├── main.py        # FastAPI routes (JWT-protected)
│   │   ├── security.py    # Auth middleware
│   │   ├── config.py      # Settings
│   │   ├── database.py    # MongoDB repository
│   │   ├── services/      # Face, AI, PDF services
│   │   └── utils/         # Sanitization utilities
│   ├── scripts/           # Utility scripts
│   ├── Dockerfile         # Backend container
│   ├── requirements.txt   # Python dependencies
│   └── .env               # Environment variables
│
├── nginx/                 # Reverse proxy config
│   └── nginx.conf         # Routing, caching, security headers
│
└── docs/                  # Documentation
    ├── SECURITY_AUDIT.md   # Full security audit report
    ├── SECURITY_HARDENING.md # Changes made to harden security
    ├── ARCHITECTURE.md     # System architecture
    ├── QUICKSTART.md       # Getting started guide
    ├── SETUP.md            # Detailed setup instructions
    └── ...                 # Additional docs
```

### Files Modified

| File | Change |
|------|--------|
| `docker-compose.yml` | Build contexts: `./frontend`, `./backend` |
| `frontend/Dockerfile.nginx` | COPY from `frontend/` and `nginx/` (root context) |
| `.dockerignore` | Updated for root build context |
| `.gitignore` | New unified gitignore at root |

### Cleanup

- Deleted empty `echo/` directory
- Deleted empty `docs folder created/` directory
- Removed duplicate `nginx.conf` from project root
- Removed `restructure.bat` (migration script)

## Git

- **History preserved** — Git detected all moves as renames (100+ files)
- **Branch:** `UI`
- **Remote:** `origin → https://github.com/dot-Dev-Club/Team-A-Frontend.git`
- **Pushed:** `972064e..09fc029 UI → UI`

## How to Build

```bash
# From project root (d:\mindkraft)
docker compose build --no-cache
docker compose up -d
```

| Service | Port | URL |
|---------|------|-----|
| Frontend (nginx) | 4100 | http://localhost:4100 |
| Backend (FastAPI) | 4000 | http://localhost:4000 |
| MongoDB | 4200 | mongodb://localhost:4200 |
