# Build Guide

## Project Structure

```
social-coach-ai/
├── apps/web/          # Next.js frontend (PWA + Capacitor Android)
├── services/api/      # FastAPI backend (LangGraph + SQLite)
├── docs/              # PRD, Tech Design
└── scripts/           # Helper scripts
```

## Prerequisites

- Node.js 20+
- Python 3.10+
- Java 17+ (for Android APK build)
- Android Studio + SDK (for APK build)

---

## 1. Frontend (Web)

```bash
cd apps/web
npm install
npm run build        # Static export to dist/
npm run dev          # Dev server on http://localhost:3000
```

## 2. Backend (API)

```bash
cd services/api
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Backend runs at http://127.0.0.1:8000

## 3. Android APK Build

The Android project is pre-configured with Capacitor at `apps/web/android/`.

### Option A: Command Line

```bash
cd apps/web
npm install
npm run build
npx cap sync android
cd android
./gradlew assembleDebug      # Debug APK
./gradlew assembleRelease    # Release APK
```

APK outputs to: `android/app/build/outputs/apk/debug/app-debug.apk`

### Option B: Android Studio (Recommended)

1. Open Android Studio
2. File -> Open -> select `apps/web/android/`
3. Wait for Gradle sync
4. Build -> Build Bundle(s) / APK(s) -> Build APK(s)

### Capacitor Workflow

After any frontend code change:

```bash
cd apps/web
npm run build          # Rebuild static assets
npx cap sync android   # Copy new assets to Android project
# Then rebuild APK in Android Studio or gradlew
```

---

## Environment Variables

Create `services/api/.env`:

```env
LLM_PROVIDER=openai
LLM_API_KEY=your_key
LLM_MODEL=gpt-4o-mini
TTS_PROVIDER=alibaba
TTS_API_KEY=your_dashscope_key
```

Or configure LLM/TTS in the app settings UI (stored in localStorage).
