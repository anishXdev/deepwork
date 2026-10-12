# StudyPulse: Architecture & Cloud Sync Engine

This document provides a technical walkthrough of **StudyPulse**, its **MongoDB Atlas persistence layer**, cross-device synchronization pipeline, and real-time offline-first timing architecture.

---

## 1. System Architecture Overview

StudyPulse combines **Local-First Speed** with **Cloud Resilience** backed by MongoDB Atlas.

```mermaid
flowchart TD
    subgraph Client["StudyPulse Client (Web / Android / PWA)"]
        UI["React UI (Obsidian Graph, Focus Vessel, Queue)"]
        State["AppContext (Central State & Delta Engine)"]
        LocalCache[("Browser LocalStorage Cache")]
        Debouncer["Debounced Sync Worker (2000ms)"]
    end

    subgraph API["Cloud Sync Layer (/api/sync)"]
        VercelHandler["Vercel Serverless Function (Production)"]
        ViteDevMiddleware["Vite Local Dev Middleware (Development)"]
        ConnPool["MongoClient Connection Pool"]
    end

    subgraph Database["MongoDB Atlas Cluster (cluster0.pmmziei.mongodb.net)"]
        DB[("Database: studypulse")]
        Collection[("Collection: user_data")]
    end

    UI <--> State
    State <--> LocalCache
    State --> Debouncer
    Debouncer -->|POST JSON Snapshot| API
    API --> ConnPool
    ConnPool -->|Upsert _id: syncKey| Collection
    Collection -->|GET Query on Startup| API
    API -->|Hydrate State| State
```

---

## 2. Multi-Device Sync & Pairing Process

Whether you are using a desktop browser, iPhone, Android device, or tablet, StudyPulse enables seamless data synchronization.

```mermaid
sequenceDiagram
    autonumber
    actor User as User on Phone
    participant Phone as Phone Client (PULSE-PHONE)
    participant Cloud as MongoDB Atlas (/api/sync)
    participant Laptop as Laptop Client (PULSE-4A9X2)

    User->>Phone: Open Cross-Device Sync Modal
    User->>Phone: Enter Laptop Sync Key: "PULSE-4A9X2"
    Phone->>Cloud: GET /api/sync?key=PULSE-4A9X2
    Cloud->>Cloud: Query MongoDB collection: user_data
    Cloud-->>Phone: Return Snapshot (Subjects, Topics, Sessions, Streaks)
    Phone->>Phone: Hydrate LocalStorage & React AppContext
    Phone-->>User: Visual Confirmation: "Devices paired! Data synced."

    Note over Phone,Laptop: Any subsequent edits on either device are saved to MongoDB
    User->>Phone: Complete 25m Focus Session on "DBMS"
    Phone->>Cloud: POST /api/sync { key: "PULSE-4A9X2", data: updatedSnapshot }
    Cloud->>Cloud: MongoDB Atlas updateOne({ _id: key }, { $set: data }, upsert: true)
    Cloud-->>Phone: { success: true, storage: "mongodb", updatedAt: ISO }
```

---

## 3. MongoDB Atlas Database & Schema Structure

- **Cluster**: `cluster0.pmmziei.mongodb.net`
- **Database**: `studypulse`
- **Collection**: `user_data`

Each registered device sync room or user profile occupies a single, denormalized document for high read/write throughput:

```json
{
  "_id": "PULSE-4A9X2",
  "updatedAt": "2026-10-03T12:00:00.000Z",
  "lastClientIp": "10.166.111.95",
  "data": {
    "subjects": [
      {
        "id": "sub_1",
        "name": "DBMS",
        "color": "#0d9488",
        "weeklyTargetHours": 5,
        "createdAt": "2026-10-01T08:00:00.000Z"
      }
    ],
    "topics": [
      {
        "id": "top_1",
        "name": "Normalization (1NF to BCNF)",
        "subjectId": "sub_1",
        "approxHours": 2,
        "completedHours": 1.5,
        "status": "in_progress",
        "scheduledDate": "2026-10-03",
        "scheduledTime": "10:00"
      }
    ],
    "sessions": [
      {
        "id": "ses_1",
        "subjectId": "sub_1",
        "topicId": "top_1",
        "durationMinutes": 25,
        "durationHours": 0.42,
        "mode": "pomodoro",
        "date": "2026-10-03",
        "timestamp": "2026-10-03T10:25:00.000Z"
      }
    ],
    "streaks": {
      "currentStreak": 3,
      "longestStreak": 14,
      "lastActiveDate": "2026-10-03",
      "activityHistory": {
        "2026-10-01": 2.5,
        "2026-10-02": 3.0,
        "2026-10-03": 1.2
      }
    },
    "settings": {
      "weeklyHoursTarget": 30,
      "pomodoroWorkMinutes": 25,
      "pomodoroBreakMinutes": 5,
      "theme": "dark",
      "weekStartsOnMonday": true
    },
    "profile": {
      "name": "Alex Rivera",
      "email": "alex.rivera@gmail.com",
      "googleConnected": true,
      "googleCalendarSyncEnabled": true
    }
  }
}
```

---

## 4. Obsidian Force-Directed Graph Engine

The **Obsidian Graph View** visualizes your study curriculum as an organic constellation:

```mermaid
graph LR
    Sub1((DBMS)) --- Top1((Normalization))
    Sub1 --- Top2((Indexing))
    Sub1 --- Top3((ACID Transactions))
    Top1 -.- Top2

    Sub2((Machine Learning)) --- Top4((Transformers))
    Sub2 --- Top5((Backprop))
    Top4 -.- Top5

    style Sub1 fill:#0d9488,stroke:#fff,stroke-width:2px,color:#fff
    style Sub2 fill:#8b5cf6,stroke:#fff,stroke-width:2px,color:#fff
    style Top1 fill:#10b981,stroke:#0d9488,color:#fff
    style Top2 fill:#030a12,stroke:#0d9488,color:#fff
    style Top3 fill:#030a12,stroke:#0d9488,color:#fff
    style Top4 fill:#030a12,stroke:#8b5cf6,color:#fff
    style Top5 fill:#10b981,stroke:#8b5cf6,color:#fff
```

### Physics Simulation Laws:
1. **Coulomb Repulsion**:
   $$F_{\text{repulsion}} = \frac{k_{\text{repulsion}}}{d^2 + \epsilon}$$
   Every node repels all other nodes, preventing overlap and spreading subjects into orbital clusters.

2. **Hooke's Spring Law**:
   $$F_{\text{spring}} = k_{\text{spring}} \cdot (d - d_0)$$
   Connects topics to their parent subject hub and links sequential topics.

3. **Center Gravity**:
   $$F_{\text{gravity}} = -k_{\text{gravity}} \cdot \mathbf{r}$$
   Gently pulls the entire constellation towards the center of the viewport.

4. **Velocity Damping**:
   $$\mathbf{v}_{t+1} = \mathbf{v}_t \times 0.86$$
   Stabilizes the simulation smoothly into equilibrium.

---

## 5. Focus Timer: Timestamp Delta Engine

To prevent timer pauses when switching tabs or locking mobile screens:
- The engine does not rely on naive `tick - 1` increments.
- Instead, upon starting, it records an absolute finish epoch timestamp:
  $$\text{targetEndTime} = \text{Date.now()} + (\text{timeLeft} \times 1000)$$
- On every 250ms tick, as well as on `document.visibilitychange` and `window.focus`, remaining time is computed:
  $$\text{timeLeft} = \max\left(0, \left\lceil \frac{\text{targetEndTime} - \text{Date.now()}}{1000} \right\rceil\right)$$
- This guarantees $100\%$ real-world time accuracy even if the browser sleeps, the app is backgrounded, or the screen locks.
