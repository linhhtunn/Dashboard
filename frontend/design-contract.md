# CareSignal AI - Frontend Design Contract

> Source: approved brand identity board and current product UI directions.
> Purpose: turn the CareSignal AI visual identity into buildable frontend rules so the team can code consistently without guessing.
> Version: v2 branding refresh.

---

## 0. How To Use This Document

This file is the working contract between design and frontend.

- Do not invent colors, font sizes, or component styles outside this contract.
- Prefer semantic tokens over raw hex values in code.
- If a screen needs a new visual pattern, update this file first.

The most important sections for implementation are:

- Section 2: color system and semantic tokens
- Section 3: typography rules
- Section 4-6: component, icon, and motif behavior

---

## 1. Brand Identity

| Property | Value |
|---|---|
| Product name | CareSignal AI |
| Tagline | E2E Simulation for AI Health |
| Brand attributes | Trustworthy, Clinical, Modern, Intelligent, Calm |
| Product framing | Monitoring, simulation, and AI-assisted interpretation |
| Important constraint | This is not a diagnostic system |

### 1.1 Logo anatomy

The brand mark is built from:

- A shield shape for safety and trust
- A heartbeat line for clinical monitoring
- A small spark for intelligence and AI support

### 1.2 Logo usage

- Use the full lockup `icon + wordmark + tagline` on landing, auth, and brand-led marketing surfaces.
- Use `icon + wordmark` in app headers where space is moderate.
- Use icon-only for favicon, compact sidebar states, and mobile app chrome.
- Keep clear space around the logo equal to at least the width of the spark icon.
- Do not recolor the logo outside the approved palette.

### 1.3 Brand voice in UI

- Trust first, hype second.
- Clinical and calm, never alarming by default.
- Intelligent but evidence-led, not magical.
- Modern and clean, with generous whitespace and soft depth.

---

## 2. Color System

### 2.1 Core brand palette

| Token | Hex | Role |
|---|---|---|
| `--color-deep-blue` | `#0D47A1` | Primary brand, headings, primary CTA |
| `--color-teal-green` | `#009688` | Positive state, secondary brand accent |
| `--color-soft-aqua` | `#8ED3E6` | Supporting accent, charts, calm highlights |
| `--color-warm-gold` | `#F5B300` | Warning, attention, time-sensitive signals |
| `--color-cool-gray` | `#F2F5F8` | App background, soft surfaces |
| `--color-white` | `#FFFFFF` | Cards, inputs, elevated surfaces |

### 2.2 Supporting system colors

These are allowed system extensions needed for healthcare states.

| Token | Hex | Role |
|---|---|---|
| `--color-danger` | `#E5484D` | Critical alerts and urgent medical risk |
| `--color-text-strong` | `#172554` | Dense heading text on light surfaces |
| `--color-text-body` | `#475569` | Body copy and supporting text |
| `--color-border-soft` | `#D9E2EC` | Input, card, divider border |

### 2.3 Semantic token mapping

Use these in code. Avoid hard-coding palette values directly inside components.

| Semantic token | Maps to | Usage |
|---|---|---|
| `--color-primary` | deep-blue | Primary button, active nav, key charts |
| `--color-secondary` | teal-green | Healthy state, secondary button, success accents |
| `--color-accent` | soft-aqua | Info visuals, chart fills, calm emphasis |
| `--color-warning` | warm-gold | At-risk state, warnings, timing indicators |
| `--color-danger-strong` | danger | Critical state, destructive emphasis |
| `--color-surface` | cool-gray | Page canvas, app shell background |
| `--color-panel` | white | Cards, panels, inputs |
| `--color-border` | border-soft | Stroke for cards, inputs, chips |

### 2.4 Status color rules

| Status | Foreground | Border | Background |
|---|---|---|---|
| `healthy` | teal-green | teal-green at 24% | teal-green at 10% |
| `at_risk` | warm-gold | warm-gold at 28% | warm-gold at 12% |
| `critical` | danger | danger at 24% | danger at 10% |
| `recent_symptom` | deep-blue | soft-aqua + deep-blue blend | deep-blue at 8% |

Implementation note:

- For tinted badges and chips, use the matching hue family.
- Do not place neutral black text on colored tints.
- Minimum contrast target: WCAG AA.

### 2.5 Usage balance

- Deep Blue is the anchor color and should dominate brand moments.
- Teal Green is the preferred positive accent.
- Soft Aqua should support, not overpower.
- Warm Gold should highlight caution, not decorate.
- Red is reserved for true critical meaning only.

### 2.6 Background behavior

- Default product UI is light.
- Base page background should use `cool-gray` or a very soft white-to-cool-gray wash.
- Avoid heavy dark mode styling unless a dedicated dark contract is approved later.

---

## 3. Typography

### 3.1 Primary typeface

Font family: **Manrope**

Brand rationale:

- Clean
- Modern
- Humanist
- Trust-building for healthcare experiences

### 3.2 Required weights

- `400` Regular
- `500` Medium
- `600` SemiBold
- `700` Bold

### 3.3 Type scale

| Token | Weight | Size / Line-height | Usage |
|---|---|---|---|
| `text-h1` | 700 | `36px / 44px` | Brand hero, landing titles |
| `text-h2` | 600 | `24px / 32px` | Screen titles, major sections |
| `text-h3` | 600 | `18px / 26px` | Card titles, subsection labels |
| `text-body` | 400 | `14px / 22px` | Main UI copy |
| `text-caption` | 400 | `12px / 16px` | Meta text, helper text, timestamps |

### 3.4 Number display

Metric and KPI values can exceed the normal type scale.

| Token | Weight | Suggested size | Usage |
|---|---|---|---|
| `text-metric` | 600 | `28-32px` | Vital cards, stat cards |

### 3.5 Copy rules

- Headings should feel crisp and compact.
- Body text should remain calm and readable.
- Avoid all-caps for long labels.
- Avoid overly playful display typography.

---

## 4. Layout, Spacing, Radius, Elevation

### 4.1 Spacing scale

Base spacing unit: `4px`

Recommended scale:

- `4`
- `8`
- `12`
- `16`
- `24`
- `32`
- `40`

### 4.2 Radius tokens

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | `6px` | Small badges, compact fields |
| `--radius-md` | `10px` | Buttons, chips, inputs |
| `--radius-lg` | `16px` | Cards, large panels |
| `--radius-xl` | `24px` | Hero surfaces, large graphic containers |
| `--radius-full` | `9999px` | Pills, avatars |

### 4.3 Borders and shadows

| Token | Value | Usage |
|---|---|---|
| `--border-hairline` | `1px solid #D9E2EC` | Inputs, cards, dividers |
| `--shadow-card` | `0 10px 30px rgba(13, 71, 161, 0.08)` | Default card elevation |
| `--shadow-soft` | `0 20px 60px rgba(15, 23, 42, 0.06)` | Hero or floating surfaces |

### 4.4 Surface behavior

- Cards should sit on white with soft shadow and clear border.
- Avoid noisy gradients behind dense data tables.
- Let whitespace create calm before adding decoration.

---

## 5. UI Components And Tokens

This section is derived directly from the branding board and should guide the base component library.

### 5.1 Primary button

Visual rules:

- Background: Deep Blue
- Text: White
- Radius: `10px`
- Height: `44-48px`
- Optional leading icon in white
- Hover: darken blue by `6-8%`
- Focus: visible ring using Deep Blue at low opacity

Usage:

- Main CTA
- Submit
- Confirm
- Important navigation actions

### 5.2 Secondary button

Visual rules:

- Background: White
- Border: Teal Green
- Text and icon: Teal Green
- Radius: `10px`
- Height: `44-48px`

Usage:

- Secondary actions
- Less dominant branch actions
- Filter and utility flows

### 5.3 Input field

Visual rules:

- Background: White
- Border: `border-soft`
- Text: `text-body`
- Radius: `10px`
- Height: `44-48px`
- Optional right-side icon

State rules:

- Focus: blue or teal ring, never browser default only
- Error: use danger border and helper text
- Disabled: reduce contrast but keep readable

### 5.4 Status badges

Badges should follow the board exactly:

- Rounded pill shape
- Icon on the left
- Light tinted background
- Colored border or subtle stroke
- Medium-weight label text

Approved variants:

- Healthy
- At Risk
- Critical
- Recent Symptom

### 5.5 Metric cards

Metric cards in the board define the default stat-card pattern:

- White card
- Radius `16px`
- Soft border and subtle shadow
- Small colored icon tile in the top-left
- Large numeric value
- Supporting comparison text under the value

Card content order:

1. Icon tile
2. Metric label
3. Primary value
4. Delta text

Metric delta styling:

- Positive operational improvement can use green/teal
- Negative operational change can use danger or muted gray depending on meaning
- Medical interpretation should not rely on color alone

### 5.6 Alert chips

Alert chips are compact informational pills with:

- Thin border
- Light tinted background
- Leading icon
- Optional dismiss `x`

Recommended chip variants:

- Critical risk
- Warning or deterioration
- New symptom or info
- Neutral system signal

### 5.7 Navigation and shell

For app screens:

- Sidebar or left navigation should use white or cool-gray surfaces
- Active item should use Deep Blue emphasis
- Page content should breathe with wide margins and card grouping
- Dense medical data should be chunked into cards, not long unframed blocks

---

## 6. Icon Style And Graphic Motifs

### 6.1 Icon style

Icons should be:

- Outline-based
- Clean and geometric
- Clinically neutral
- Slightly rounded, not sharp or aggressive

Suggested library: `lucide-react`

Suggested stroke rules:

- Default size: `18-20px`
- Default stroke: `1.75`

### 6.2 Recommended icon families

- Dashboard
- Users or patients
- Heart or activity
- Database
- Brain or AI insight
- Bell or notification
- File or report
- Search
- Cloud sync
- Settings

### 6.3 Graphic motifs

The brand board includes three visual motifs:

- Dot grid
- Soft concentric arcs
- Flowing wave lines

Usage rules:

- Use as low-contrast background support only
- Keep opacity low
- Prefer aqua/teal/blue blends
- Never let motifs interfere with charts, tables, or medical readability

---

## 7. Brand Attributes To UX Translation

| Attribute | UX translation |
|---|---|
| Trustworthy | Clear structure, stable spacing, high readability, explicit states |
| Clinical | Clean layouts, restrained color usage, evidence-first messaging |
| Modern | Soft depth, rounded cards, crisp type, minimal clutter |
| Intelligent | Insight surfaces, summaries, AI cues, but always grounded in data |
| Calm | Soft backgrounds, breathable whitespace, avoid visual panic |

---

## 8. Clinical And Content Guardrails

Because this is a healthcare-facing product, brand expression must stay clinically responsible.

### 8.1 Avoid this wording

- "diagnosis"
- "confirmed disease"
- "AI recommends treatment"
- certainty language without evidence

### 8.2 Prefer this wording

- "abnormal signal"
- "at risk"
- "requires review"
- "needs clinician confirmation"
- "AI support only"

### 8.3 Standard disclaimer

Use this wording anywhere AI-generated interpretation appears:

`AI support only. Not a diagnosis. Always use clinical judgment.`

---

## 9. Frontend Implementation Rules

### 9.1 Tokenization

- Expose all palette and semantic values as CSS variables.
- Mirror the same values in Tailwind theme tokens if Tailwind is used.
- Components must consume semantic tokens first.

### 9.2 Component consistency

- Do not create multiple badge styles for the same status.
- Do not create ad-hoc card shadows.
- Do not mix different border radii in the same component family without a reason.

### 9.3 Accessibility

- Maintain visible focus states on all interactive elements.
- Do not rely on color alone for patient state.
- Keep small text at high contrast on light surfaces.

### 9.4 Visual priorities

- Data readability beats decoration.
- Brand motifs support the product, they do not lead it.
- Red is for urgency, not for aesthetics.

---

## 10. Open Decisions

These items still need team alignment before implementation is fully locked.

### Decision 1 - Official critical red

The brand board does not include a primary red swatch, but the UI clearly needs one for `Critical`.

Current proposal:

- `--color-danger: #E5484D`

### Decision 2 - Language strategy

The board uses English labels such as:

- Healthy
- At Risk
- Critical
- Recent Symptom

The team should confirm whether:

- English is the default UI language
- Vietnamese labels are needed now
- i18n is in Sprint 1 or later

### Decision 3 - Chart accent strategy

The board shows strong UI support for cards and badges, but chart palette sequencing is not explicitly locked yet.

Recommended order:

1. Deep Blue
2. Teal Green
3. Soft Aqua
4. Warm Gold
5. Danger Red only for threshold crossings

---

## 11. Deliverables That Should Reflect This Contract

- `globals.css` or `tokens.css`
- Tailwind theme extension if Tailwind is used
- Button, Input, Badge, Card, and Chip primitives
- Marketing and dashboard layouts
- AI response and alert surfaces

If any of these diverge from the contract, update this file first and then update code.
