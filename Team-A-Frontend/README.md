# MindKraft Frontend

Frontend client for the MindKraft voice-based exam experience.

## Repository Structure

```text
.
├── src/
│   ├── pages/
│   │   ├── SplashScreen.tsx
│   │   ├── LoginFaceID.tsx
│   │   ├── Dashboard.tsx
│   │   ├── ExamInterface.tsx
│   │   └── AdminPortal.tsx
│   ├── components/
│   │   ├── MicWaveform.tsx
│   │   ├── QuestionCard.tsx
│   │   └── StatusBadge.tsx
│   ├── api/
│   │   └── bridge.ts
│   ├── hooks/
│   │   ├── useSpeech.ts
│   │   └── useKiosk.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── index.html
├── package.json
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
└── README.md
```




## Directory Guide

- `src/pages` → Screen-level route views.
- `src/components` → Reusable UI elements.
- `src/api/bridge.ts` → Wrapper methods for `window.api` backend communication.
- `src/hooks` → Shared React logic for speech and kiosk behavior.
- `src/App.tsx` → Router setup and screen navigation.

## Main Screen Flow

1. `SplashScreen` → App intro with animated logo
2. `LoginFaceID` → Dual-mode authentication (credentials + Face ID)
3. `Dashboard` → User overview with exam list and statistics
4. `ExamInterface` → Voice-based exam with timer and question navigation
5. `AdminPortal` → Admin dashboard for exam management

## Tech Stack

- **React 18** + **TypeScript**
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Smooth animations
- **React Router** - Client-side routing

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```
