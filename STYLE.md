# MindScan AI — Visual Design System
> Drop this file in your project root. The main prompt references it.

## THEME: Dark Surrealist Clinical
Brutalist editorial meets medical journal. Think True Detective title cards.

## REFERENCE IMAGES (provided alongside prompt)
- Image 1 (eye.jpg) → Hero full-bleed background with dark overlay (rgba 0,0,0,0.65)
- Image 2 (true-detective.jpg) → Layout philosophy: collage, rust tones, raw typography
- Image 3 (brain.jpg) → Results page background at 0.10 opacity, fixed position
- Image 4 (notice.jpg) → Screening page chrome: bold labels, barcode dividers, editorial grid

## COLORS
```
--bg-primary:   #0A0A0A
--bg-secondary: #111111
--bg-card:      #1A1410
--rust:         #C0392B
--amber-gold:   #F5A623
--cream:        #E8DCC8
--brain-grey:   #8B8680
--text-primary: #E8DCC8
--text-muted:   #8B8680
--danger:       #EF4444
--safe:         #2D5A27
```

## FONTS (Google Fonts)
- Display headings → Bebas Neue (e.g. "MINDSCAN", "HIGH RISK", "DATA READOUT")
- UI / subheadings → Space Grotesk
- Body copy → Inter
- Data / scores / labels → JetBrains Mono

## GLOBAL TEXTURE
- CSS film grain overlay at 4% opacity on <body>
- All cards: border 1px solid rgba(232,220,200,0.1), no bright shadows
- Buttons: sharp corners (border-radius: 0), bordered rectangle style

## PAGE-BY-PAGE

### / Landing
- Hero: eye.jpg full viewport, Saturn ring SVG rotating 20s, tsparticles star field
- App name "MINDSCAN" in Bebas Neue, massive, cream, wide letter-spacing
- Tagline: Space Grotesk. Below it: `[ PERCEPTION ENGINE v1.0 ]` in JetBrains Mono
- CTA button: cream border, cream text → rust fill on hover, sharp corners
- "How It Works" cards: slight random rotation, monospace number 01–04 in rust, aged paper bg
- Footer: barcode SVG left, iCall `9152987821` in amber-gold, disclaimer in monospace

### /screening
- Bg: #1A0A08, amber-gold 3px top border
- Tabs: `[ 01_TEXT ] [ 02_FACE ] [ 03_VOICE ] [ 04_PHQ-9 ]`
- Active tab: amber-gold bg, black text. Inactive: cream text, rust border on hover
- Text tab: cream textarea (typewriter feel), rust char counter, amber/rust word underlines
- Face tab: webcam in film-negative frame (corner tick marks), "LIVE FEED ●" blinking label
- Voice tab: pulsing concentric rust rings on record, `REC ● 00:23` timer, amber waveform
- PHQ-9: huge muted Bebas Neue watermark question number, bordered rectangle radio options
- Submit: full-width rust bg, `SUBMIT ANALYSIS` in Bebas Neue

### /results
- Bg: brain.jpg fixed, rgba(10,10,10,0.88) overlay + noise grain
- Risk gauge: custom SVG arc (not library), label in massive Bebas Neue
- Score rows: film-strip style, amber progress bars, JetBrains Mono percentages
- LIME chart: section header "LINGUISTIC EVIDENCE", rust=negative, amber=positive bars
- Emotion card: cream bg, dark text, rust left border, "EMOTIONAL PROFILE" stamp rotated 15deg
- Recommendations: telegram/bulletin style cards, rust left border on high-risk
- PDF button: `[ PRINT REPORT ]` sharp corners

## CONSENT MODAL
- Dark bg, cream border, Bebas Neue title "BEFORE WE BEGIN"
- Button: `[ I UNDERSTAND — PROCEED ]` amber-gold

## COMPONENTS CHEATSHEET
- Cards → bg #1A1410, border rgba(232,220,200,0.1)
- Badges → evidence-tag style: cream bg, black text, rust border
- Progress bars → amber fill (#F5A623) on #1A1410 track, height 3px
- Scan-line effect → CSS repeating-linear-gradient horizontal lines at 2% opacity
- Barcode divider → thin vertical SVG lines, decorative only
