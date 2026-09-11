<div align="center">

# 🌾 KisanFlow

### **One Procurement System. Every Farmer. Any Phone. Any Language.**

> _No Smartphone? No Problem._

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Live-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Gemini AI](https://img.shields.io/badge/Gemini_2.5_Flash-GenAI-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-4.x-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-5A0FC8?logo=pwa&logoColor=white)]()

</div>

---

## 🏆 Why KisanFlow Exists — The Problem

Every harvest season, **millions of Indian farmers** travel hours to government procurement centres (mandis) — only to discover:

- 🚶 Long, unpredictable queues with no ETA
- 📵 No real-time information on which centre has lower crowds
- 📱 No digital access for feature-phone or non-smartphone users
- 🗣️ No help in their native language
- ⏳ Hours or entire days wasted in congestion

> **KisanFlow exists to solve this problem end-to-end.** From queue monitoring to smart centre recommendations, multilingual AI assistance, and DBT payment tracking — accessible by every farmer, on any phone, in any language.

---

## 🎯 Product Vision

KisanFlow is a **multilingual, multichannel government agricultural procurement platform** that reduces farmer waiting time, uncertainty, and congestion at procurement centres.

### The Core Principle:
> *"Do not require every farmer to become digitally skilled. Make the procurement system accessible through the communication method the farmer already uses."*

| Farmer Type | How They Access KisanFlow |
|---|---|
| 📱 Smartphone farmer | Web app / PWA — full dashboard |
| 📞 Feature-phone farmer | IVR call to 1800-425-4747 |
| ✉️ No phone? | Assisted service via field operator |
| 🗣️ Can't read? | Voice assistant in native language |

---

## ✨ Core Features

### 1. 🗺️ Smart Real-Time Queue & Load Balancing
- Live queue dashboard showing all procurement centres
- AI-powered **smart centre recommendations** (e.g. "Switch to Ramapuram Centre — saves you 27 minutes")
- Live token tracking with farmer count ahead and ETA
- District-wide heat map of centre utilisation

### 2. 🎙️ Multilingual AI Voice Assistant
- Powered by **Gemini 2.5 Flash** (Google GenAI) with native Indic NLP fallback
- Fully conversational in **6 languages**: Telugu, Hindi, Kannada, Tamil, Bengali, English
- Browser-native Web Speech API for microphone input in each language
- Text-to-speech output in farmer's native language
- Answers: token status, queue wait, MSP rates, quality standards, DBT payment status

### 3. 📞 IVR / Phone Access Simulator
- Simulates the exact dual-tone DTMF (touch-tone) IVR call flow for 1800-425-4747
- Language selection at call start: press 1 for Telugu, 2 for Hindi, 3 for Kannada, etc.
- Service options: queue status, slot booking, payment inquiry, callback request
- Mimics real government helpline UX — accessible from any phone in India

### 4. 📲 SMS Notification System
- SMS-style drawer notifications for booking confirmation, token allocation, and payment status
- Works offline — notification drawn from local and Supabase-synced state
- Multilingual SMS body content

### 5. 🌾 Farmer Dashboard
- Slot booking for specific crop (Paddy, Wheat, Maize, etc.) with quantity in quintals
- Active booking card: token number, centre, time slot, ETA
- Smart centre recommendation card with live queue comparison
- DBT payment tracker with transaction ID and bank credit ETA
- Quality check status (moisture %, FAQ Grade standard)

### 6. 🏢 Procurement Operator Dashboard
- Live token queue management (Call Next, No-Show, Rush mode)
- Quality gate: record moisture %, weigh-bridge readings, grade approval
- Farmer lookup by phone/Aadhaar (masked)
- Centre-level KPIs: throughput, rejected lots, avg processing time

### 7. 🏛️ Government / District Officer Dashboard
- District-wide procurement overview: total farmers, quintals procured, DBT pending
- Centre heat cards: utilisation %, queue depth, alert status
- Load-balancing controls: threshold sliders, auto-rebalance triggers
- Historical trend charts for season comparison

### 8. 🤝 Assisted Service / Support Desk
- Operator-facing UI for field agents to register non-smartphone farmers
- Create bookings on behalf of farmers using phone/Aadhaar lookup
- Escalation panel for issue resolution
- Bilingual agent interface

### 9. ☁️ Supabase Cloud Sync
- Real-time sync of farmers and bookings to Supabase PostgreSQL
- Duplicate detection and auto-deduplication utility (by phone/Aadhaar uniqueness)
- Upsert-based sync prevents data conflicts
- Connection health indicator in header navbar

### 10. 🎬 Demo Tour System
- 20-step anchored demo tour bar (for SIH / hackathon presentations)
- Jump directly to any step: Landing → Farmer Booking → Queue → IVR → Operator → Government → AI Assistant → Payment
- Designed to walk a jury through the complete product story in under 5 minutes

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        KisanFlow PWA                            │
│                  (React 19 + TypeScript + Vite)                 │
├─────────────┬──────────────┬──────────────┬────────────────────-┤
│  Farmer     │  Operator    │  Government  │  Support Desk        │
│  Dashboard  │  Dashboard   │  Dashboard   │  (Assisted Service)  │
├─────────────┴──────────────┴──────────────┴─────────────────────┤
│               KisanFlowContext (Global State)                    │
│   Farmers • Bookings • Centres • Queue Tokens • Language        │
├─────────────────────────┬───────────────────────────────────────┤
│   AI Assistant Service  │   Phone/IVR Simulator                 │
│   ├── Gemini 2.5 Flash  │   ├── DTMF Audio Synthesis           │
│   └── Indic NLP Engine  │   └── 6-Language IVR Flow            │
│       (6 languages)     │                                       │
├─────────────────────────┴───────────────────────────────────────┤
│               Supabase PostgreSQL                               │
│         farmers  •  bookings  •  procurement_records            │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
Farmer Interaction
       │
       ▼
  Slot Booking ──────────────────────► Supabase (farmers + bookings tables)
       │                                       │
       ▼                                       ▼
  Token Assigned                    Real-time Queue Counter
       │
       ▼
  Queue Monitoring ◄──── Smart Load Balancer ◄──── Centre Utilisation
       │
       ▼
  Voice AI Query ──────► Gemini 2.5 Flash ────► Native Language Reply
                  └─────► Indic NLP Fallback ──►        (TTS)
       │
       ▼
  Operator Quality Check ──► Moisture/Weight ──► DBT Payment Initiated
       │
       ▼
  Government Dashboard ──► District KPIs ──► Load Balancing Alerts
```

---

## 📁 Project Structure

```
kisanflow/
├── src/
│   ├── App.tsx                          # Root router & layout
│   ├── main.tsx                         # Vite entry point
│   ├── types.ts                         # All TypeScript interfaces
│   ├── translations.ts                  # 6-language UI translations
│   │
│   ├── context/
│   │   └── KisanFlowContext.tsx          # Global state (React Context)
│   │
│   ├── services/
│   │   └── aiAssistantService.ts        # Gemini AI + Indic NLP engine
│   │
│   ├── utils/
│   │   ├── audio.ts                     # Web Speech API + TTS + DTMF
│   │   └── supabaseClient.ts            # Supabase connection & sync
│   │
│   ├── data/
│   │   └── mockData.ts                  # Seed data: farmers, centres, crops
│   │
│   └── components/
│       ├── LandingPage.tsx              # Hero page + feature showcase
│       ├── Navbar.tsx                   # Language toggle + Supabase status
│       ├── DemoTourBar.tsx              # 20-step hackathon demo navigator
│       │
│       ├── farmer/
│       │   ├── FarmerDashboard.tsx       # Booking + token + payment view
│       │   └── VoiceAssistantModal.tsx   # Multilingual AI Voice Assistant
│       │
│       ├── operator/
│       │   └── OperatorDashboard.tsx    # Queue management + quality gate
│       │
│       ├── government/
│       │   └── GovernmentDashboard.tsx  # District KPIs + load balancing
│       │
│       ├── support/
│       │   └── SupportDashboard.tsx     # Assisted service / field agent UI
│       │
│       ├── phone/
│       │   └── PhoneSimulatorModal.tsx  # IVR / feature-phone simulator
│       │
│       ├── auth/
│       │   └── LoginModal.tsx           # Role-based login UI
│       │
│       └── modals/
│           └── SMSDrawerModal.tsx       # SMS notification overlay
│
├── package.json
├── vite.config.ts
├── tsconfig.json
└── .env.local                           # GEMINI_API_KEY (not committed)
```

---

## 🌐 Supported Languages

| Code | Language | Script | Greeting |
|------|----------|--------|----------|
| `te` | Telugu | తెలుగు | నమస్తే |
| `hi` | Hindi | हिंदी | नमस्ते |
| `en` | English | Latin | Hello |
| `kn` | Kannada | ಕನ್ನಡ | ನಮಸ್ಕಾರ |
| `ta` | Tamil | தமிழ் | வணக்கம் |
| `bn` | Bengali | বাংলা | নমস্কার |

Every UI label, AI response, voice greeting, IVR prompt, and SMS notification is available in all 6 languages. Language can be switched instantly from any screen.

---

## 🧠 AI Assistant — How It Works

The voice assistant uses a **two-tier AI engine**:

### Tier 1: Gemini 2.5 Flash (Google GenAI)
When a `GEMINI_API_KEY` is configured, queries are sent to Gemini with a structured context-injection prompt containing:
- Live farmer token, queue depth, ETA
- Centre names, MSP rates, crop quantity
- Payment transaction ID and bank credit status
- **Strict instruction**: _"Respond ENTIRELY in [native language]. Do not answer in English unless requested."_

### Tier 2: Indic NLP Fallback Engine (Built-in)
When Gemini is unavailable, a high-precision keyword matching engine handles 7 intent categories in all 6 languages:

| Intent | Keywords Detected | Languages |
|--------|------------------|-----------|
| Queue Status | token, queue, wait, కాయుట, कतार... | te/hi/en/kn/ta/bn |
| Centre Recommendation | centre, mandi, రద్దీ, भीड़... | te/hi/en/kn/ta/bn |
| MSP Rate | price, ధర, भाव, விலை... | te/hi/en/kn/ta/bn |
| Quality Standards | moisture, తేమ, नमी, ஈரப்பதம்... | te/hi/en/kn/ta/bn |
| DBT Payment | payment, చెల్లింపు, भुगतान... | te/hi/en/kn/ta/bn |
| Greetings | hello, నమస్తే, नमस्ते... | te/hi/en/kn/ta/bn |
| General Fallback | (any other query) | te/hi/en/kn/ta/bn |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18 or higher
- A **Gemini API key** (free at [Google AI Studio](https://aistudio.google.com/))
- A **Supabase project** (free tier works — [supabase.com](https://supabase.com))

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env.local` file in the project root:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

> The Supabase URL and anon key can be entered directly in the app's **Supabase Settings** panel (Navbar → Cloud Sync icon), so no extra `.env` entry is required.

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for production

```bash
npm run build
```

---

## 🔌 Supabase Integration

KisanFlow connects to a live PostgreSQL database via Supabase to persist farmer registrations and slot bookings.

### Database Connection

```
URL:       https://pqconvvuhpvoqutgtmac.supabase.co
Anon Key:  Configured in app settings panel
```

### Required Tables

```sql
-- Farmers table
CREATE TABLE farmers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  village TEXT,
  district TEXT,
  state TEXT,
  aadhaar_masked TEXT,
  land_holding_acres NUMERIC,
  preferred_language TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bookings table
CREATE TABLE bookings (
  id TEXT PRIMARY KEY,
  farmer_id TEXT REFERENCES farmers(id),
  centre_id TEXT,
  crop TEXT,
  quantity_quintals NUMERIC,
  token_number INTEGER,
  slot_time TEXT,
  slot_date TEXT,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Auto-Deduplication
The app includes a built-in **duplicate cleaner** (`cleanDuplicateSupabaseData`) that:
- Identifies duplicate farmers by phone/Aadhaar key
- Identifies duplicate bookings by farmer_id + date + token
- Removes all but the first occurrence
- Can be triggered from the Supabase settings panel in the navbar

---

## 🎭 User Roles & Dashboards

| Role | Access Path | Key Capability |
|------|-------------|----------------|
| 👨‍🌾 **Farmer** | `/farmer` | Book slot, track token, query AI, check payment |
| 🏢 **Operator** | `/operator` | Manage queue, verify quality, update procurement |
| 🏛️ **Government** | `/government` | District KPIs, centre heat map, load balancing |
| 🤝 **Support Agent** | `/support` | Register non-digital farmers, manage escalations |
| 📞 **IVR Demo** | (modal) | Phone simulator for feature-phone access |

---

## 📱 Multichannel Access Architecture

```
         ┌────────────────────────────────────┐
         │           ANY FARMER               │
         └──────────────┬─────────────────────┘
                        │
         ┌──────────────┼─────────────────────┐
         │              │                     │
    📱 Web App     📞 IVR Call          🤝 Assisted
  (Smartphone)    (Feature Phone)    (No Phone/Offline)
         │              │                     │
    Full PWA     1800-425-4747      Field Agent App
    Dashboard    DTMF Keypad        Registers Farmer
         │              │                     │
         └──────────────┴─────────────────────┘
                        │
               ☁️ Supabase Backend
               (Real-time sync across all channels)
```

---

## 🧑‍💻 Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | React 19 + TypeScript 5.8 |
| **Build Tool** | Vite 6.x |
| **Styling** | Tailwind CSS 4.x |
| **Icons** | Lucide React |
| **Animations** | Motion (Framer Motion v12) |
| **AI / LLM** | Google GenAI SDK — Gemini 2.5 Flash |
| **Indic NLP** | Custom built-in engine (zero external dependency) |
| **Speech** | Web Speech API (recognition + synthesis) |
| **Database** | Supabase (PostgreSQL) |
| **State** | React Context API + localStorage |
| **DTMF Audio** | Web Audio API (dual-tone synthesis) |

---

## 🔑 Key Innovation Points

### 1. Zero-Dependency Multilingual NLP
No external paid NLP API. The built-in Indic NLP engine handles intent detection across 6 Indian languages using Unicode-aware keyword matching — works fully offline.

### 2. Smart Load Balancing Engine
Computes queue depth, wait time, and centre utilisation in real time and proactively recommends the lowest-wait centre — saving farmers significant wasted travel time.

### 3. Dual AI Strategy
Gemini 2.5 Flash for rich, contextualised responses when online — native Indic NLP fallback for offline/no-key environments. Same quality of native-language response regardless of connectivity.

### 4. Genuine Multichannel Architecture
Not just a web app with a phone screenshot. The IVR simulator generates real dual-tone DTMF audio, walks through a real call tree in 6 languages, and mirrors the actual helpline script flow.

### 5. Production-Scale Supabase Integration
Live cloud database with schema-validated upserts, duplicate deduplication, connection health monitoring, and configurable credentials — not just local mock state.

---

## 📸 Application Screens

| Screen | Description |
|--------|-------------|
| **Landing Page** | Hero section, feature highlights, 4-channel access illustration |
| **Farmer Dashboard** | Active booking, live queue, AI assistant button, payment tracker |
| **Voice Assistant** | Mic interface, conversation transcript, quick suggestion chips |
| **IVR Simulator** | Phone UI, DTMF keypad, language-specific call tree navigation |
| **SMS Drawer** | Mobile-style notification overlay with multilingual content |
| **Operator Dashboard** | Token queue controls, quality verification form |
| **Government Dashboard** | District KPI cards, centre heat map, load-balance controls |
| **Support Desk** | Assisted registration and escalation management |

---

## 🗺️ Demo Tour (Hackathon Presentation Guide)

A **20-step demo tour bar** is pinned to the bottom of the app to help jury members follow along:

| Steps | What It Shows |
|-------|---------------|
| 1–2 | Landing page + tagline + 4-channel value proposition |
| 3–5 | Farmer login → crop selection → slot booking |
| 6–8 | Token issued → live queue position → ETA display |
| 9–10 | Smart centre recommendation (saves 27 minutes) |
| 11–12 | IVR phone access demo (DTMF, Telugu/Hindi flow) |
| 13–14 | SMS booking confirmation notification |
| 15–16 | Operator: Call Next token → Quality gate (moisture check) |
| 17–18 | Government: District KPIs → Load balancing alert |
| 19 | AI voice assistant: multilingual query in Telugu/Hindi |
| 20 | DBT payment status: ₹48,750 → TxID KF-PAY-2026-00981 |

---

## 🌍 Social Impact

| Impact Metric | Target / Achievement |
|---------------|---------------------|
| Farmer wait time reduction | **~40–60%** via smart load balancing |
| Languages supported | **6** Indian languages |
| Farmers reachable | **~100M+** (feature-phone + smartphone) |
| IVR-only access | Any farmer with a basic phone |
| Digital literacy required | **Zero** for IVR / assisted mode |
| Crops supported | Paddy, Wheat, Maize, Soybean, Cotton, Sugarcane |

---

## 🤝 Built For

**Smart India Hackathon (SIH)** — KisanFlow is a production-style prototype built to demonstrate how government agricultural procurement infrastructure can be modernised to bridge the digital divide for rural India's 140 million farmers.

---

<div align="center">

**🌾 KisanFlow — Any Farmer. Any Phone. Any Language. One Platform.**

_Built with ❤️ for India's farmers._

</div>
