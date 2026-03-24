# Voice Logic Backport Report (Python -> UI)

Date: 2026-03-21
Target branch: UI
Source reference: python branch latest voice update set

## Scope Requested
- Backport only the recent voice behavior changes from python branch.
- Do not change UI design/layout in the UI branch.
- Focus on:
  - removal of Whisper fallback path in command/listening hooks
  - 15-second silence prompt behavior
  - command guidance text for MCQ vs descriptive flow
  - related voice auto-speak stability update

## Files Updated
- Team-A-Frontend/src/hooks/student/useVoiceEngine.ts
- Team-A-Frontend/src/hooks/useVoiceNavigation.ts
- Team-A-Frontend/src/hooks/useAutoSpeak.ts
- Team-A-Frontend/src/pages/student/ExamInterface.tsx
- Team-A-Frontend/src/pages/student/ExamSelector.tsx

## What Was Backported

### 1) Whisper fallback removal in active command hooks
Applied in:
- Team-A-Frontend/src/hooks/student/useVoiceEngine.ts
- Team-A-Frontend/src/hooks/useVoiceNavigation.ts

Changes:
- Removed backend fallback control flow and recorder loop usage from these two hooks.
- Removed fallback trigger behavior that switched to backend STT when browser speech recognition failed.
- Kept browser Web Speech API as the primary command recognition path.
- Updated error messaging to report browser speech availability/permission clearly without fallback switching.

### 2) Silence prompt logic update
Applied in:
- Team-A-Frontend/src/hooks/student/useVoiceEngine.ts
- Team-A-Frontend/src/hooks/useVoiceNavigation.ts

Changes:
- Added controlled silence prompt behavior:
  - prompt text: "hello are you still there ?? please say the command to proceed"
- Added 15-second gating so prompt is not spoken repeatedly or immediately.
- In navigation hook, inactivity timing now starts from true activity boundaries (TTS finish / last speech activity) to avoid instant prompt after greeting.

### 3) MCQ vs descriptive guidance updates
Applied in:
- Team-A-Frontend/src/pages/student/ExamInterface.tsx

Changes:
- Improved spoken guidance when user gives a command that does not fit question type:
  - If MCQ and user asks written flow: "This is a multiple choice question, please select an option."
  - If descriptive and user asks option selection: "This is a descriptive question, please say start answering."

### 4) Auto-speak robustness and exam list narration
Applied in:
- Team-A-Frontend/src/hooks/useAutoSpeak.ts
- Team-A-Frontend/src/pages/student/ExamSelector.tsx

Changes:
- useAutoSpeak now keeps the latest text/options refs and clears pending timeout safely.
- Exam selector narration now handles empty list explicitly and produces concise selection guidance.

## Verification Performed

### A. Whisper fallback removed from target hooks
Search checks in these files returned no remaining fallback symbols:
- Team-A-Frontend/src/hooks/student/useVoiceEngine.ts
- Team-A-Frontend/src/hooks/useVoiceNavigation.ts

Checked symbols:
- startBackendSttLoop
- convertCommandToText
- WHISPER_HALLUCINATIONS
- usingBackend*
- apiService import (for these two hooks)

Result: Passed for target hooks.

### B. 15-second silence logic present
Found in:
- Team-A-Frontend/src/hooks/student/useVoiceEngine.ts
  - 15000ms gating with prompt cooldown
- Team-A-Frontend/src/hooks/useVoiceNavigation.ts
  - lastActivityAt tracking and 15000ms inactivity check

Result: Passed.

### C. Compile diagnostics on changed files
- No compile/type errors were reported for:
  - Team-A-Frontend/src/hooks/student/useVoiceEngine.ts
  - Team-A-Frontend/src/hooks/useVoiceNavigation.ts
  - Team-A-Frontend/src/hooks/useAutoSpeak.ts
- Existing style/lint findings were reported in page files regarding inline styles; these are pre-existing UI-lint constraints and not introduced by this backport.

## Important Boundary Note
This backport intentionally did not remove all Whisper references across the full application because admin configuration/types and other non-target modules still define STT engine options. That is outside the requested "last-commit prompt/fallback hook behavior" migration scope.

If needed, a second pass can remove Whisper references globally (types, admin settings, and API client methods) as a separate controlled change.

## Post-Backport Runtime Updates (2026-03-21)

Additional production flow updates applied after this backport:

1. Landing page onboarding prompt
- On route `/`, TTS now says: "Welcome to Vox. Say Student or Admin to continue."

2. Landing command routing
- "student" -> `/student/login`
- "admin" / "administrator" -> `/admin-login`

3. Per-page silence reminder control
- `useVoiceNavigation` now supports `silencePromptEnabled`.
- Landing page sets `silencePromptEnabled: false` to prevent the 15-second "hello are you still there" reminder on landing.
