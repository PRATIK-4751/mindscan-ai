# MindScan AI - Project Context & Architecture

This document provides a comprehensive overview of the MindScan AI platform to help AI agents and developers understand the project structure, tech stack, and data flow.

## 1. Project Overview
**MindScan AI** is an advanced psychological screening and wellness platform. It captures multimodal user inputs (text, facial expressions, voice recordings, and standardized PHQ-9 questionnaires), analyzes them for emotional states, and generates dynamic risk assessments. The platform also offers interactive therapy components, including an integrated YouTube-based ambient audio player and an AI chat interface.

## 2. Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Frontend Library**: React 18
- **Styling**: Tailwind CSS, PostCSS, Framer Motion (for animations)
- **Authentication**: Firebase Authentication (Google Sign-In)
- **Data Visualization**: Recharts, HTML2Canvas & jsPDF (for report generation)
- **Media/Audio Processing**: WaveSurfer.js (voice screening), YouTube IFrame API (audio therapy)
- **Language**: TypeScript

## 3. Directory Structure

### `/app` (Next.js App Router)
- **`/(root)`**: Landing page.
- **`/screening`**: The multi-step multimodal assessment interface.
- **`/results`**: The dashboard rendering the user's psychological analysis, risk gauge, and therapy tools.
- **`/api`**: Next.js API routes (`/chat`, `/combined`, `/phq9`, `/text`, `/vision`, `/voice`). These act as proxies/fallbacks for the underlying Python AI backend models.

### `/components` (Modular React Components)
- **`/landing`**: Components for the homepage (Hero with `tsparticles`, HowItWorks, SignalVault).
- **`/screening`**: Multimodal input components:
  - `TextTab.tsx`: Textual journal entry.
  - `FaceTab.tsx`: Webcam integration for facial emotion analysis.
  - `VoiceTab.tsx`: Microphone recording utilizing `wavesurfer.js`.
  - `PHQ9Tab.tsx`: Standardized depression screening questionnaire.
  - `TabProgress.tsx`: UI for tracking assessment completion.
- **`/results`**: Dashboard widgets and therapy tools:
  - `RiskGauge.tsx`: Visual representation of psychological risk.
  - `AudioTherapy.tsx`: Custom, hidden YouTube IFrame audio player (no API key needed) for ambient healing.
  - `InsightChat.tsx`: Conversational interface.
  - `LIMEChart.tsx` / `ScoreBreakdown.tsx` / `EmotionSummary.tsx`: Data visualization widgets.
  - `PDFReport.tsx`: Client-side PDF generator for session summaries.
- **`/shared`**: Global components like `Navbar`, `AuthProvider` (Firebase context), and `ThemeToggle`.

### `/lib` (Utilities & Services)
- **`api.ts`**: Axios instance configuring requests to the `/api` routes.
- **`firebase.ts`**: Firebase initialization and Google Auth provider configuration.
- **`types.ts`**: Global TypeScript interfaces (`AnalysisResult`, `LimeWord`, etc.).

### `/public` (Static Assets)
- Serves static imagery (`brain.jpg`, `album1.jpg`, etc.) directly to the frontend.

## 4. Key Data Flows

1. **Authentication**: Users authenticate via `AuthProvider` wrapping the application. Session state dictates access to the dashboard.
2. **Screening Pipeline**:
   - Users interact with the `screening` page tabs.
   - Media (images/audio files) and text are sent to `lib/api.ts` which forwards them to `/app/api/...` routes using `FormData` or JSON.
   - The Next.js API returns calculated stress/emotion scores and LIME (Local Interpretable Model-agnostic Explanations) data.
3. **Results Rendering**:
   - The `results` page aggregates the multimodal scores.
   - Components like `RiskGauge` and `LIMEChart` parse the raw numbers into aesthetic UI elements.
   - The `AudioTherapy` component reads YouTube Track IDs from `.env` (`NEXT_PUBLIC_YT_TRACK_*`) and dynamically plays ambient audio using YouTube's vanilla IFrame API without an API key.

## 5. Environment Variables
The application relies on `.env` for critical configurations:
- `NEXT_PUBLIC_API_URL`: Target domain for the Python AI backend.
- `OLLAMA_CLOUD_API_KEY` / `OLLAMA_CLOUD_API_URL`: AI model configurations.
- `NEXT_PUBLIC_YT_TRACK_*`: Video IDs used by the `AudioTherapy` module.
- `GOOGLE_API_KEY`: Used for generic Google cloud integrations.

## 6. AI Agent Guidelines
- **CSS / Styling**: The project uses complex Tailwind utility classes mixed with global CSS variables. Avoid destroying custom CSS gradients and z-index layers.
- **Third-Party Libraries**: `AudioTherapy` uses the vanilla YouTube API (bypassing `react-player` for better stability). `VoiceTab` heavily relies on `wavesurfer.js`.
- **Imports**: Favor relative imports or explicit standard imports. Avoid unused imports as Next.js strict linting is enabled.
- **TypeScript**: Rely on interfaces defined in `lib/types.ts` when passing props to result components.
