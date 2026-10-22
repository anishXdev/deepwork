# Deepwork ⏱️📚

A minimalist, cross-platform study tracking and scheduling application that syncs seamlessly across **Web** and **Android**. 

Features Google Account login, Google Calendar auto-scheduling, a built-in Pomodoro focus timer with auto-logging to today, subject-wise, and weekly hours, daily streak preservation, dynamic weekly pacing recommendations, and a dedicated analytics dashboard.

---

## ✨ Key Features

### 1. Smart Pacing & Daily Recommendation
- Set a **Weekly Hours Target** (e.g. 20 hrs/week).
- Calculates remaining days in the week and remaining hours:
  $$\text{Recommended Daily Pace} = \frac{\text{Weekly Target} - \text{Cumulative Hours Studied This Week}}{\text{Remaining Days in Week}}$$
- Dynamic status indicators: **Ahead of Pace**, **Optimal Pace**, or **Needs Boost**.

### 2. Things to Study Today & Tomorrow
- **Today's Focus**: List of scheduled tasks with estimated hours, priority indicators, and quick-start Pomodoro launch.
- **Plan for Tomorrow**: Quick-add topics for tomorrow to wake up with clarity.
- **Reschedule Anytime**: 1-click presets (*Later Today*, *Tomorrow Morning*, *Tomorrow Afternoon*, *Custom*).

### 3. Subject & Curriculum Hierarchy
- Add/delete subjects with customizable pastel accents.
- Manage topics with approximate hours required, scheduled date/time, notes, and completion tracking.

### 4. Pomodoro Focus Timer with Auto-Logging
- Classic 25m Focus / 5m Break / 15m Long Break intervals, plus manual completion.
- Built-in **ambient focus sounds** (Gentle Rain, White Noise, Deep Drone) generated with the Web Audio API without external dependencies.
- **Melodic chime** when the timer completes.
- **Automatic Roll-up Engine**:
  - Automatically adds completed time to **Today's** hours.
  - Adds to **Subject-wise** hours.
  - Adds to **Cumulative Weekly** hours.
  - Maintains and increments daily **Streak** 🔥.

### 5. Dedicated Analytics Dashboard
- **KPI Cards**: Today's hours, Weekly cumulative vs Target, Remaining hours left, and Active & Best Streak.
- **Subject-Wise Breakdown**: Interactive progress and percentage distribution across subjects.
- **7-Day Study Distribution**: Bar chart showing daily study hours.
- **Completed Sessions History**: Chronological log with subject tags and exact timestamps.

### 6. Google Account & Google Calendar Auto-Schedule
- **Instant Web Deep-Link**: Automatically generates 1-click Google Calendar links for any topic.
- **OAuth API Sync**: Optional direct background sync to your primary Google Calendar using OAuth 2.0 (`calendar.events` scope).
- **Zero-Barrier Demo Mode**: Instant 1-click demo login to experience the full app with pre-seeded data immediately.
- **One-Click Backup**: Export and import complete JSON backups across devices.

---

## 🚀 Running on Web

```bash
cd /Users/anish/.gemini/antigravity/scratch/study-sync-app
npm install
npm run dev
```

Visit `http://localhost:5173/` in your browser.

### Deploying calls

Calls use browser-to-browser WebRTC for audio and video, with the Deepwork Node server relaying call setup messages. Run `npm run server` on a public Node host that supports WebSocket upgrades, and serve it over HTTPS/WSS. Set `VITE_COLLAB_WS_URL` to `wss://<your-server>/api/collab-socket` when building the web app. For peers behind restrictive NATs, configure a TURN relay using the `VITE_TURN_*` settings; TURN credentials are exposed to the browser and should be short-lived or otherwise restricted.

For local development, `npm run dev` includes the signaling server.

---

## 📱 Running on Android

### Method 1: Instant PWA Install (Recommended)
1. Open `http://<your-computer-ip>:5173` in Google Chrome on your Android device (or deploy to Vercel/Netlify).
2. Tap the **Menu (⋮)** in Chrome.
3. Tap **"Install app"** or **"Add to Home screen"**.
4. Deepwork launches fullscreen without an address bar and works completely offline!

### Method 2: Native Android App (Capacitor)
The native Android project is already configured in `/android`:

```bash
# Build the web bundle
npm run build

# Sync assets to Android
npx cap sync android

# Open in Android Studio to build APK or run on device/emulator
npx cap open android
```

---

## 🛠️ Tech Stack
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS (Minimalist Dark Theme)
- **Icons**: Lucide React
- **Celebrations**: Canvas Confetti
- **Audio Engine**: Web Audio API (Chime + Ambient Noise)
- **Mobile Engine**: Capacitor 6 + Web App Manifest (PWA)
- **Storage**: Local-First IndexedDB / LocalStorage with Cloud Adapter
