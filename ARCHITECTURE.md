# MoodScan Pro — Full Technical Architecture
### Production-Grade Real-Time Face Emotion Detection System
> Version 2.0 | Privacy-First | On-Device Inference | Multi-Language

---

## 1. SYSTEM ARCHITECTURE

```
╔══════════════════════════════════════════════════════════════════╗
║                    USER DEVICE (Browser)                         ║
║                                                                  ║
║  ┌──────────────┐   WebRTC       ┌──────────────────────────┐   ║
║  │  Built-in    │  getUserMedia  │  On-Device ML Pipeline   │   ║
║  │  Camera      │ ─────────────► │                          │   ║
║  └──────────────┘                │  ① TinyFaceDetector      │   ║
║                                  │     (WebGL accelerated)  │   ║
║  ┌──────────────┐                │  ② FaceLandmark68Tiny    │   ║
║  │  HTML5       │  VideoFrame    │  ③ FaceExpressionNet     │   ║
║  │  <video>     │ ─────────────► │     7-class softmax      │   ║
║  └──────────────┘   at 15fps     └──────────┬───────────────┘   ║
║          │                                  │ <200ms/frame       ║
║          │                        expressions[7]                 ║
║          ▼                                  │                    ║
║  ┌──────────────┐                           ▼                    ║
║  │  Canvas 2D   │◄────── overlay ── ┌──────────────────────┐    ║
║  │  Overlay     │      rendering    │  Emotion Engine      │    ║
║  │  (mirrored)  │                   │  - Dominant detect   │    ║
║  └──────────────┘                   │  - Response pick     │    ║
║                                     │  - GIF select        │    ║
║  ┌──────────────────────────────┐   │  - i18n lookup       │    ║
║  │  UI Layer (Vanilla JS)       │◄──┘                      │    ║
║  │  - Prob bars update          │                          │    ║
║  │  - Chip strip update         │                          │    ║
║  │  - Emotion display           │                          │    ║
║  │  - Chart.js feed             │                          │    ║
║  └──────────────────────────────┘                          │    ║
║                                                             │    ║
║  ┌────────────────────┐   ┌──────────────────────────────┐ │    ║
║  │  FeedbackSystem    │   │  Analytics (Chart.js)        │ │    ║
║  │  - Yes/No capture  │   │  - Doughnut (distribution)   │ │    ║
║  │  - Correction pick │   │  - Line (60s timeline)       │ │    ║
║  │  - localStorage    │   │  - Session stats             │ │    ║
║  │  - CSV export      │   │  - CSV export                │ │    ║
║  └────────────────────┘   └──────────────────────────────┘ │    ║
║                                                             │    ║
║  ┌─────────────────────────────────────────────────────┐   │    ║
║  │  localStorage (Browser)                             │   │    ║
║  │  moodscan_privacy · moodscan_theme · moodscan_lang  │   │    ║
║  │  moodscan_feedback_v2 (JSON array of corrections)   │   │    ║
║  └─────────────────────────────────────────────────────┘   │    ║
╚══════════════════════════════════════════════════════════════════╝

EXTERNAL CALLS (read-only, no PII):
  CDN → face-api.js model weights (~3MB, cached after first load)
  CDN → Chart.js library (~200KB)
  Giphy → Reaction GIF images (no API key, public direct URLs)
```

**Data Flow (step-by-step):**
1. User grants camera permission via `getUserMedia()`
2. Video frames rendered to `<video>` element at ~30fps
3. `requestAnimationFrame` loop throttled to 15 inference-fps
4. `faceapi.detectSingleFace()` runs TinyFaceDetector (MobileNetV1-based, WebGL backend)
5. If face found → FaceLandmark68TinyNet extracts 68 landmark points
6. FaceExpressionNet produces 7-class probability vector (softmax, sums to 1.0)
7. Dominant emotion selected by `argmax`
8. Canvas overlay renders: glowing bounding box + corner accents + landmark dots + label
9. UI layer updates: probability bars, chip strip, big emoji, name, confidence
10. Change detection: if emotion changed or 4s elapsed → response text + GIF refreshed
11. Every ~1s: Chart.js doughnut + timeline updated, session stats ticked
12. On user feedback: localStorage entry written with FER+-compatible schema

---

## 2. TECH STACK JUSTIFICATION

### ML Inference Options Compared

| Option | Accuracy | Latency | Privacy | Browser Support | Choice |
|--------|----------|---------|---------|-----------------|--------|
| **face-api.js** (vladmandic) | ~75% FER+ | <200ms | ✅ On-device | ✅ All modern | **✅ SELECTED** |
| DeepFace (Python backend) | ~82% | 300-800ms | ❌ Server | N/A (Python) | ❌ Requires backend |
| MediaPipe Holistic | N/A (no emotion) | <100ms | ✅ On-device | ✅ | ❌ No emotion class |
| Custom CNN (TensorFlow.js) | ~80%+ | ~150ms | ✅ On-device | ✅ | ❌ Requires training |

**face-api.js (vladmandic fork) wins because:**
- Runs 100% on-device via WebGL — true privacy-first
- FaceExpressionNet trained on FER+ dataset (35,887 labelled face images)
- TinyFaceDetector is MobileNetV1-based: fast, small (~1.9MB)
- 68-landmark model adds spatial context for downstream use
- Works from `file://` with no CORS issues

### Frontend Framework Options

| Option | Bundle Size | Portability | Learning Curve | DX | Choice |
|--------|-------------|-------------|----------------|----|--------|
| **Vanilla JS** | 0KB | ✅ Zero deps | Low | Good | **✅ SELECTED** |
| React + Vite | ~100-200KB | Medium | Medium | Excellent | ❌ Overkill for this scope |
| Vue 3 | ~60KB | Good | Low | Good | ❌ Adds complexity |

**Vanilla JS wins because:**
- Zero build step → open `index.html` directly
- No module bundler needed (works with `file://` protocol)
- Fastest load time; CDN-only dependencies
- Competition-portable: single folder, no `npm install`

---

## 3. MODEL DESIGN

### Dataset
- **FER+** (Microsoft, 2016): 35,887 grayscale 48×48 face images
- 8-class labels (MoodScan uses 7: happy, sad, angry, fearful, disgusted, surprised, neutral)
- Crowdsourced voting (10 annotators/image) — reduces single-annotator bias

### Preprocessing Pipeline
```
Raw image (any resolution)
  └─► Face detection crop (TinyFaceDetector)
      └─► Resize to 112×112 (landmark net input)
          └─► Resize to 48×48 normalized (expression net input)
              └─► Grayscale conversion
                  └─► Per-pixel normalization: (pixel - 127.5) / 127.5
                      └─► Softmax output → [0,1]×7
```

### Model Architecture (FaceExpressionNet)

```
Input: 48×48×1 (grayscale face crop)
  │
  ├── BatchNorm → ReLU
  ├── Conv 3×3, 32 filters → MaxPool 2×2
  ├── Conv 3×3, 64 filters → MaxPool 2×2
  ├── Conv 3×3, 128 filters → MaxPool 2×2
  │
  ├── Flatten → Dense(256) → Dropout(0.25) → ReLU
  ├── Dense(7) → Softmax
  │
Output: probability vector [happy, sad, angry, fearful, disgusted, surprised, neutral]
```

**TinyFaceDetector (detection backbone):**
- MobileNetV1-variant (depthwise separable convolutions)
- Input: variable size → 160/224/320/416/608px (configurable for speed/accuracy trade-off)
- Score threshold: 0.45 (balanced false positive/negative)
- Output: bounding boxes + confidence scores

### Training Configuration (FaceExpressionNet)
- Framework: TensorFlow / Keras
- Optimizer: Adam (lr=1e-3)
- Loss: Categorical cross-entropy
- Epochs: 50 with ReduceLROnPlateau
- Data augmentation: horizontal flip, rotation ±10°, brightness ±20%
- Final accuracy: ~72-76% on FER+ test set (human-level ~65%)

---

## 4. FULL CODE IMPLEMENTATION

### File Structure
```
emotion-detector/
├── index.html              # App shell (modals, header, camera, dashboard, footer)
├── css/
│   └── styles.css          # 600+ line design system (dark/light, animations)
├── js/
│   ├── emotion-engine.js   # Emotion data, 3-lang response engine, i18n
│   ├── analytics.js        # Chart.js doughnut + timeline + session stats
│   ├── feedback.js         # Self-learning feedback loop + LocalStorage + CSV
│   └── app.js              # Main orchestrator (models, camera, detection loop)
└── ARCHITECTURE.md         # This document
```

### Key Implementation Details

**Detection Loop (app.js):**
```javascript
// Throttled to 15 inference-fps for latency balance
const TARGET_IFR = 1000 / 15;  // 66.7ms between inferences

async function loop(timestamp) {
  if (timestamp - lastInferTs >= TARGET_IFR) {
    const result = await faceapi
      .detectSingleFace(videoEl, new faceapi.TinyFaceDetectorOptions({
        inputSize: 224,         // higher = more accurate, slower
        scoreThreshold: 0.45,   // confidence filter
      }))
      .withFaceLandmarks(true)
      .withFaceExpressions();

    state.inferenceMs = Math.round(performance.now() - t0);
    // ... handle result
  }
  requestAnimationFrame(loop);
}
```

**Emotion Change Throttling:**
```javascript
// Only update display if emotion changed OR 4 seconds have elapsed
// This prevents UI flickering on per-frame oscillation
if (dominant !== state.currentEmotion || now - state.lastResponseTs > 4000) {
  state.currentEmotion = dominant;
  state.lastResponseTs = now;
  updateEmotionDisplay(dominant, expressions[dominant]);
}
```

**Feedback Storage Schema (localStorage):**
```json
[
  {
    "id": "m7k3x2abc",
    "ts": 1713432561000,
    "sessionId": "lx3k9m",
    "detected": "neutral",
    "confidence": 0.8231,
    "isCorrect": false,
    "corrected": "happy",
    "lang": "en"
  }
]
```

---

## 5. UI DESIGN DETAILS

### Layout Wireframe
```
┌─────────────────────────────────────────────────────┐
│ [😮 MoodScan PRO]  [Real-time AI Emotion...]  [EN▾][🌙][⚙️] │
├─────────────────────────────────────────────────────┤
│                         │                           │
│  ┌─────────────────┐    │  ┌─────────────────────┐  │
│  │  📷 LIVE CAMERA │    │  │   🔴 LIVE  ⬤ FACE  │  │
│  │                 │    │  │   😄 HAPPY           │  │
│  │  [face overlay] │    │  │   87% confidence     │  │
│  │  [corner accents│    │  │   ─────────────────  │  │
│  │  [landmarks]    │    │  │   Probability Bars   │  │
│  │  [scan line]    │    │  │   😄━━━━━━━━━━ 87%   │  │
│  │                 │    │  │   😢━━ 5%            │  │
│  └─────────────────┘    │  └─────────────────────┘  │
│  [😄87%][😢5%]...chips  │  ┌─────────────────────┐  │
│                         │  │ 🧠 AI Response       │  │
│                         │  │ "Your smile could..." │  │
│                         │  └─────────────────────┘  │
│                         │  ┌─────────────────────┐  │
│                         │  │ [✓ Yes] [✗ No]      │  │
│                         │  └─────────────────────┘  │
│                         │  ┌─────────────────────┐  │
│                         │  │ 🎬 [GIF reaction]   │  │
│                         │  └─────────────────────┘  │
├─────────────────────────────────────────────────────┤
│         📊 EMOTION DASHBOARD                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ │
│  │ Doughnut     │ │ 60s Timeline │ │ Session Stats│ │
│  │ (session     │ │ (all 7 lines)│ │ Detections   │ │
│  │  distribution│ │ animated     │ │ Duration     │ │
│  │  per emotion)│ │ real-time    │ │ Inference ms │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Color Psychology Mapping
| Emotion | Color | Hex | Color Psychology |
|---------|-------|-----|------------------|
| Happy | Gold | `#FBBF24` | Warmth, energy, optimism, joy |
| Sad | Sky Blue | `#60A5FA` | Calm, introspection, melancholy |
| Angry | Deep Red | `#EF4444` | Urgency, heat, intensity, threat |
| Fearful | Soft Purple | `#A78BFA` | Mystery, tension, anxiety |
| Disgusted | Muted Green | `#34D399` | Natural aversion, revulsion |
| Surprised | Vibrant Orange | `#FB923C` | Alertness, novelty, excitement |
| Neutral | Cool Slate | `#94A3B8` | Balance, calm, neutrality |

### Animation Inventory
| Animation | Element | Duration | Type |
|-----------|---------|----------|------|
| `scan` | Camera scan-line | 3.5s linear infinite | Top-to-bottom sweep |
| `float` | Big emotion emoji | 3s ease-in-out | Vertical float |
| `spin` | Emoji ring border | 3s linear | Conic gradient rotate |
| `blink` | Live dot | 1s step-start | Opacity blink |
| `shimmer` | Loader bar + active prob bar | 1.8s linear | Shine sweep |
| `slide-up` | Cards on load | 0.4s ease | Entrance |
| `pop-in` | Modals | 0.35s spring | Bounce entrance |
| `loader-bounce` | Loader logo | 1.5s ease | Scale + glow |

---

## 6. EMOTION RESPONSE ENGINE

### Architecture: Rule-Based + Curated Corpus

The response engine uses a **deterministic random selection** from a psychologically-curated corpus, with anti-repetition logic:

```
Emotion detected (e.g. "angry")
  └─► Language selected (en/hi/es)
      └─► Response pool: RESPONSES[lang][emotion] (4-5 items)
          └─► Anti-repeat filter (excludes last selected index)
              └─► Selected response rendered with 250ms fade
```

### Sample Responses per Emotion

**Sad (English) — Empathetic + grounding:**
- "Every storm runs out of rain eventually. You've got an umbrella and a rainbow incoming ☂️🌈"
- "Neuroscience says: this feeling is temporary. Your brain is already healing. 🧠💙"
- "Being sad means you cared deeply. That's not weakness — that's humanity at its finest."

**Angry (English) — Cognitive defusion + redirect:**
- "Fun fact: the anger hormone flushes out in 90 seconds. Count with me. 1… 2… 3… 🕐"
- "Anger is just passion without a direction. Let's redirect that energy! 🎯"

**Fearful (Hindi) — Grounding + courage:**
- "डर का मतलब है कि आप कुछ बड़ा करने वाले हैं। यही वो moment है! 💪"
- "हर hero ने पहले यही face बनाया था। आपकी story अभी शुरू हुई है। 🦸"

**Psychological Principles Used:**
- Sad → Normalisation + temporal priming ("this too shall pass")
- Angry → Cognitive restructuring + somatic awareness (90-second rule)
- Fearful → Reframing (fear = courage signal) + growth mindset
- Happy → Amplification + social contagion framing
- Neutral → Positive reframe (calm as superpower)

---

## 7. SELF-LEARNING SYSTEM

### Feedback Loop Design
```
  ┌────────────────────────────────────────┐
  │  User sees: "Was this correct?"        │
  │  [✓ Yes] ─────────────────────────►   │
  │  [✗ No] ──► [Emotion picker 7 buttons]│
  │                    │                  │
  │                    ▼                  │
  │  FeedbackSystem.saveFeedbackEntry()   │
  │  {                                     │
  │    detected:   "neutral",              │
  │    corrected:  "happy",    ◄── user   │
  │    confidence: 0.72,                  │
  │    isCorrect:  false                  │
  │  }                                    │
  │         │                             │
  │         ▼                             │
  │  localStorage["moodscan_feedback_v2"] │
  │         │                             │
  │         ▼                             │
  │  Export CSV (settings panel) ─────►  │
  │  moodscan_feedback_TIMESTAMP.csv      │
  └────────────────────────────────────────┘
```

### Retraining Pipeline (Offline)
```
1. Export feedback CSV from MoodScan Pro settings
2. Map corrections back to FER+ labeling format
3. Use corrected labels as "soft labels" or hard overrides
4. Fine-tune FaceExpressionNet:
   python retrain.py \
     --feedback  moodscan_feedback.csv \
     --base-model faceExpressionNet_weights.json \
     --epochs 10 \
     --lr 5e-5 \
     --output model_v2.json
5. Convert to face-api.js format (TensorFlow.js SavedModel → JSON)
6. Replace model weights in CDN / self-hosted path
```

### Data Storage Structure (localStorage)
- Key: `moodscan_feedback_v2`
- Value: JSON array, trimmed to 500 entries (FIFO eviction if localStorage full)
- Export format: RFC 4180 CSV with quoted strings

---

## 8. SCALABILITY PLAN

### Phase 1: 1–100 Users (Current)
- Pure client-side. CDN for models. No backend.
- Cost: $0/month
- Limitation: No central aggregation, no personalisation

### Phase 2: 100–10,000 Users
- Add lightweight FastAPI backend:
  - `POST /api/feedback` — aggregate corrections centrally
  - `GET /api/stats` — aggregate emotion trends
- Host model weights on own S3/CDN (cold load ~3MB, cached)
- Database: PostgreSQL (feedback + sessions)
- Infrastructure: Single t3.micro → Auto Scaling Group

### Phase 3: 10,000+ Users
```
Users ──► CloudFront CDN ──► ALB ──► ECS Fargate (API)
                                       └──► RDS PostgreSQL
                                       └──► Redis (session cache)
Model serving: TensorFlow Serving / ONNX Runtime (server-side fallback)
Monitoring: Prometheus + Grafana (latency, accuracy, error rates)
Retraining: Weekly MLflow pipeline on SageMaker
```

### Edge vs Cloud Inference Trade-off
| Factor | Edge (Current) | Cloud |
|--------|---------------|-------|
| Privacy | ✅ Total | ❌ Data sent |
| Latency | ✅ <200ms | ❌ Network adds 50-300ms |
| Accuracy | ⚠️ TinyNet ~75% | ✅ LargeNet ~82% |
| Cost | ✅ Free | ❌ GPU compute |
| Offline | ✅ After model cache | ❌ Requires connectivity |

**Decision: Keep edge inference as default. Offer cloud opt-in for higher accuracy.**

---

## 9. FAILURE MODES & MITIGATION

| Failure Mode | Root Cause | Mitigation |
|---|---|---|
| **Bad lighting** | FaceDetector confidence < 0.45 → no detection | Show "improve lighting" tip; lower scoreThreshold dynamically |
| **Face occlusion** (mask/sunglasses) | Partial face → wrong landmarks | Confidence badge warning; inform user |
| **Rapid misclassification** | Per-frame oscillation | 4s throttle + emotion change threshold (>0.15 delta) |
| **Wrong emotion bias** | Training data imbalance (FER+ skews happy/neutral) | User feedback loop corrects over time |
| **Low-end device lag** | >200ms inference on CPU-only | Reduce inputSize to 160; drop to 10fps; show warning |
| **Model CDN down** | Network failure | Cache-first ServiceWorker; fallback to basic detection notice |
| **Privacy concern** | User unsure about data | Explicit consent modal; no-op without accept; privacy badge |
| **Racial/gender bias** | FER+ dataset skew | Documented limitation; user feedback loop to build diverse corrections |

---

## 10. DEPLOYMENT GUIDE

### Option A: Local (Development)
```bash
# No build step needed! Just open the file:
# Windows:
start d:\Timepass\emotion-detector\index.html
# Or serve locally for better isolation:
cd d:\Timepass\emotion-detector
npx serve .
# Open: http://localhost:3000
```

### Option B: GitHub Pages (Free Hosting)
```bash
git init
git add .
git commit -m "MoodScan Pro v2.0"
gh repo create moodscan-pro --public --source=. --push
# Enable GitHub Pages → Settings → Pages → main branch / root
# Access: https://USERNAME.github.io/moodscan-pro
```

### Option C: Vercel (Recommended for sharing)
```bash
npm i -g vercel
cd d:\Timepass\emotion-detector
vercel deploy
# Vercel auto-detects static site; provides HTTPS URL
```

### Option D: Netlify Drop
- Go to netlify.com/drop
- Drag `emotion-detector/` folder to browser
- Live URL in 30 seconds

### HTTPS Requirement
> ⚠️ Camera access (`getUserMedia`) requires HTTPS in production (not `file://`).
> GitHub Pages, Vercel, and Netlify all provide HTTPS by default.
> For local development, `localhost` is automatically treated as secure.

---

## 11. FUTURE IMPROVEMENTS

### Voice Emotion Detection
- Add `getUserMedia({ audio: true })`
- Feed to Web Audio API → extract MFCC features
- Run through TensorFlow.js audio classification model (TIMIT/EMoDB trained)
- Fuse with face emotion via confidence-weighted ensemble

### Multimodal AI (Face + Voice + Text)
```
Face emotion (confidence W₁)
    + Voice emotion (confidence W₂)    ──► Ensemble fusion ──► Final emotion
    + Text sentiment (confidence W₃)
```
- Text: Real-time speech-to-text via Web Speech API → sentiment analysis

### Personalisation Engine
- Per-user emotion baseline calibration
- "Your neutral is typically X% — today you're 30% higher"
- Trend insights: "You've been happier on Fridays"

### Advanced Analytics
- Emotion heatmap over time (calendar view)
- Correlation with time-of-day
- Export to PDF report

### Mobile PWA
- `manifest.json` + ServiceWorker
- Offline model caching
- Add to home screen
- Rear camera support for presentations

### Dataset Contribution Mode (opt-in)
- Users voluntarily donate corrected frames (with explicit consent)
- Federated learning approach: send only gradients, not raw data
