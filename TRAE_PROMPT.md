You are an expert Next.js 14 + TypeScript + Tailwind CSS + shadcn/ui developer.
Build a complete production-ready frontend for "MindScan AI" — a Multimodal AI Depression Screening app.
Read STYLE.md in the project root for the full visual design system before writing any code.
The 4 images provided set the visual DNA — follow STYLE.md exactly for colors, fonts, textures, and per-page layout.

---

## TECH STACK
Next.js 14 App Router, TypeScript strict, Tailwind CSS, shadcn/ui, Framer Motion, Recharts,
react-webcam, react-audio-voice-recorder, wavesurfer.js, jsPDF + html2canvas, Lucide React,
React Hook Form, Axios, tsparticles

---

## FOLDER STRUCTURE
app/page.tsx, app/screening/page.tsx, app/results/page.tsx, app/layout.tsx, app/globals.css
components/landing/ → Hero.tsx, HowItWorks.tsx, Footer.tsx
components/screening/ → TextTab.tsx, FaceTab.tsx, VoiceTab.tsx, PHQ9Tab.tsx, TabProgress.tsx
components/results/ → RiskGauge.tsx, ScoreBreakdown.tsx, LIMEChart.tsx, EmotionSummary.tsx, Recommendations.tsx, PDFReport.tsx
components/shared/ → Navbar.tsx, ThemeToggle.tsx, LoadingSpinner.tsx, ConsentModal.tsx
lib/api.ts, lib/types.ts, lib/utils.ts

---

## TYPESCRIPT INTERFACES
```ts
interface AnalysisResult {
  text_score: number; face_score: number; voice_score: number;
  phq9_score: number; final_score: number;
  risk_level: "Low Risk" | "Medium Risk" | "High Risk";
  lime_words: { word: string; score: number }[];
  detected_face_emotion: string; detected_voice_emotion: string;
  phq9_total: number; phq9_severity: string;
}
interface PHQ9Answer { question_id: number; answer: number; }
```

---

## API (NEXT_PUBLIC_API_URL env var)
POST /analyze/text      → { text: string }
POST /analyze/face      → FormData (image)
POST /analyze/voice     → FormData (audio)
POST /analyze/phq9      → { answers: number[] }
POST /analyze/combined  → { text_score, face_score, voice_score, phq9_score }
- 30s timeout on face/voice. If server sleeping show: "Our servers are waking up, please wait 30 seconds..."

---

## PAGE REQUIREMENTS

### / Landing
- Hero full-viewport: eye.jpg bg + dark overlay, rotating Saturn SVG, tsparticles stars
- "MINDSCAN" Bebas Neue massive. Tagline + `[ PERCEPTION ENGINE v1.0 ]` monospace
- "How It Works" 4 cards (Text, Face, Voice, PHQ-9). CTA → /screening
- Footer: iCall helpline 9152987821, disclaimer

### /screening
4 tabs: 📝 Text | 📷 Face | 🎤 Voice | 📋 PHQ-9
Persistent bottom bar shows completion. "Analyze All" active when ≥1 tab done.

Tab 1 Text: textarea min 50 chars, word highlights, LIME bar chart (Recharts)
Tab 2 Face: Live Camera (react-webcam, viewfinder frame, emotion overlay) OR Upload (drag-drop). Show emotion confidence bars.
Tab 3 Voice: Record max 30s, pulsing rings, wavesurfer waveform, playback, vocal feature cards
Tab 4 PHQ-9: One question at a time, slide animation, 4 radio options (0–3), progress bar
PHQ-9 Questions:
1. Little interest or pleasure in doing things?
2. Feeling down, depressed, or hopeless?
3. Trouble falling or staying asleep, or sleeping too much?
4. Feeling tired or having little energy?
5. Poor appetite or overeating?
6. Feeling bad about yourself or that you are a failure?
7. Trouble concentrating on things?
8. Moving or speaking slowly / being fidgety or restless?
9. Thoughts that you would be better off dead or hurting yourself?

### /results
- Custom SVG arc risk gauge. Risk label Bebas Neue massive.
- Score breakdown: Text, Face, Voice, PHQ-9 animated progress bars
- LIME chart (Recharts horizontal). Emotion summary dossier card.
- 3 recommendation cards by risk level
- "[ PRINT REPORT ]" → jsPDF export with all scores + disclaimer
- Disclaimer + iCall 9152987821 footer
- ⚠️ "Not a substitute for professional medical advice. If in crisis, contact a mental health professional."

---

## RULES
- ConsentModal on first visit: "BEFORE WE BEGIN" → "[ I UNDERSTAND — PROCEED ]"
- Missing scores default to 0 in fusion
- Webcam needs HTTPS — handle gracefully if unavailable
- Accepted: images JPG/PNG/WEBP, audio WAV/MP3/WEBM
- Skeleton loaders on all API calls
- Mobile-first, fully responsive, hamburger nav on mobile
- No placeholders, no TODOs — write every file completely
