# TradeHub — Design System (Locked)
**Document:** 04 of 06  
**Version:** 2.3 | **Last Updated:** June 2026  
**Status: LOCKED — do not modify without a formal design review**

This document is the single source of truth for all visual decisions. Every screen across the student app, influencer dashboard, and super admin panel uses these tokens. No component may introduce new colors, type sizes, or motion patterns not defined here.

---

## Philosophy

Premium here means **materials and restraint**, not decoration. The system is built around one idea: the account balance is a *physical object* (a titanium or silver card, the way Apple Wallet renders one), everything around it is quiet frosted glass, and the whole system supports true light and dark appearance — not just a dark theme with inverted text.

What to avoid: a near-black background with one neon accent is the most common AI-generated default. It reads as generic. This system uses restraint — one accent color used rarely, depth from blur and shadow rather than color, and numerals that feel like a financial instrument rather than a dashboard.

---

## Typography

**Primary face:** `-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif`

Renders as true SF Pro on Apple devices, falls back cleanly to Inter on Android and desktop. One face throughout — no separate display or monospace face for body content.

**Numerals:** all financial figures, prices, and statistics use `font-variant-numeric: tabular-nums` for alignment. Large numbers (38px+) use `letter-spacing: -0.025em`. This is what makes numbers feel like financial data rather than text.

**Sizes used in the reference prototype:**
| Role | Size | Weight |
|---|---|---|
| Screen title | 14px | 600 |
| Section label | 11px | 600 — uppercase, 0.1em tracking |
| Body / card content | 13–13.5px | 400–600 |
| Caption / label | 10–11px | 400–500 |
| Hero balance | 38px | 700 |
| Stat card value | 14–16px | 600–700 |

---

## Color Tokens — Dark Mode

```css
:root[data-theme="dark"] {
  --bg:         #000000;                        /* True black — not navy, not #111 */
  --glass:      rgba(255, 255, 255, 0.047);     /* Glass card surface */
  --glass-hi:   rgba(255, 255, 255, 0.09);      /* Elevated glass (secondary surfaces) */
  --line:       rgba(255, 255, 255, 0.09);      /* All borders and dividers */
  --label:      #F5F5F7;                        /* Primary text */
  --label2:     rgba(235, 235, 245, 0.60);      /* Secondary text */
  --label3:     rgba(235, 235, 245, 0.30);      /* Captions, placeholders, section labels */
  --accent:     #D9C28C;                        /* Champagne gold — used sparingly */
  --accent-bg:  rgba(217, 194, 140, 0.12);      /* Accent tint for backgrounds */
  --green:      #30D158;                        /* Profit, success, active states */
  --green-bg:   rgba(48, 209, 88, 0.13);        /* Green tint for backgrounds */
  --red:        #FF453A;                        /* Loss, error, danger states */
  --red-bg:     rgba(255, 69, 58, 0.13);        /* Red tint for backgrounds */
  --amber:      #FF9F0A;                        /* Warning, paused states */
  --amber-bg:   rgba(255, 159, 10, 0.13);       /* Amber tint */

  /* Hero card */
  --card:       linear-gradient(160deg, #3a3a3c, #232325 38%, #18181a 66%, #2a2a2c);
  --card-shadow: 0 22px 40px -18px rgba(0,0,0,0.7),
                 inset 0 1px 0 rgba(255,255,255,0.06);
  --sheen:      rgba(255, 255, 255, 0.22);      /* Light sweep on hero card */

  /* Tab bar */
  --tabbar:     rgba(8, 8, 9, 0.84);
}
```

---

## Color Tokens — Light Mode

```css
:root[data-theme="light"] {
  --bg:         #F1F1F4;                        /* Soft neutral — not pure white */
  --glass:      rgba(255, 255, 255, 0.76);      /* White glass over gray canvas */
  --glass-hi:   rgba(255, 255, 255, 0.96);      /* Elevated white */
  --line:       rgba(0, 0, 0, 0.08);            /* All borders and dividers */
  --label:      #1C1C1E;                        /* Primary text */
  --label2:     rgba(60, 60, 67, 0.60);         /* Secondary text */
  --label3:     rgba(60, 60, 67, 0.30);         /* Captions, placeholders */
  --accent:     #93722F;                        /* Deeper gold — same role, adjusted for contrast */
  --accent-bg:  rgba(147, 114, 47, 0.10);
  --green:      #1F9D44;                        /* Profit, success */
  --green-bg:   rgba(31, 157, 68, 0.10);
  --red:        #E0342A;                        /* Loss, error */
  --red-bg:     rgba(224, 52, 42, 0.09);
  --amber:      #B37000;                        /* Warning */
  --amber-bg:   rgba(179, 112, 0, 0.10);

  /* Hero card — brushed silver, not an inverted dark card */
  --card:       linear-gradient(160deg, #fcfcfd, #e8e8ec 35%, #cfcfd6 65%, #f3f3f5);
  --card-shadow: 0 16px 32px -16px rgba(0,0,0,0.14),
                 inset 0 1px 0 rgba(255,255,255,0.70);
  --sheen:      rgba(255, 255, 255, 0.82);

  --tabbar:     rgba(255, 255, 255, 0.84);
}
```

**Theme behaviour:** follows `prefers-color-scheme` by default. A manual toggle in the app header overrides it per session. Both modes are required at MVP — this is not a Phase 2 addition.

---

## Color Rules

**The accent color (#D9C28C / #93722F) is used in exactly these places:**
- Tier badge on the hero card
- Progress bar fill
- Signal card "new" border glow (fades to `--line` after ~900ms)
- Quiz prompt card background and border
- Section labels where an active/accent state is needed
- The light sheen sweep on the hero card

**The accent is never used for:**
- Body text
- Tab bar (inactive tabs use `--label3`, active tab icon uses `--accent`)
- Buttons other than the primary CTA
- Decorative borders on idle elements

**Green and red are used exclusively for:**
- P&L values (profit / loss)
- Win/loss indicators in the journal
- Buy / Sell action badges on signals
- Copier status dot (green = active, amber = paused, red = error)
- Calendar heatmap cells — use 20% opacity tint (`rgba(48,209,88,0.2)`) not the full solid color

---

## Signature Component: The Hero Card

The balance / revenue card is a physical metal object, not a text block on a flat panel.

```css
.card {
  position: relative;
  border-radius: 28px;
  padding: 22px;
  overflow: hidden;
  background: var(--card);
  box-shadow: var(--card-shadow);
  cursor: pointer;
  transition: background 350ms ease, box-shadow 350ms ease;
}
```

**Contents (top to bottom):**
1. Chip glyph (top-left) — `32×22px`, gold gradient, `border-radius: 5px`
2. Tier / status badge (top-right) — text only, accent color
3. Faint equity sparkline (absolute, right-bottom) — `currentColor` at 14–15% opacity
4. Label ("Portfolio Balance" / "Revenue this month") — `--label2`, 11px
5. Large number — 38px, 700 weight, tabular numerals
6. Change indicator — 13px, `--green` or `--red`, with arrow icon

**Light sweep animation:**

```css
.card::after {
  content: '';
  position: absolute;
  top: -60%; left: -30%;
  width: 55%; height: 220%;
  background: linear-gradient(75deg, transparent, var(--sheen), transparent);
  transform: translateX(-140%) rotate(8deg);
  opacity: 0;
  pointer-events: none;
}

.card.sheen::after {
  animation: sweep 1.25s ease forwards;
}

@keyframes sweep {
  0%   { transform: translateX(-140%) rotate(8deg); opacity: 0; }
  12%  { opacity: 0.9; }
  65%  { opacity: 0.4; }
  100% { transform: translateX(140%) rotate(8deg); opacity: 0; }
}
```

Trigger: on page load (450ms delay), on card tap, and when theme is switched. Disabled entirely under `prefers-reduced-motion`.

---

## Glass Cards

Used for: signal tickets, course cards, stat chips, journal entries, copier controls, student rows — any surface that sits above the background.

```css
.glass-card {
  background: var(--glass);
  border: 1px solid var(--line);
  border-radius: 16–20px;             /* 16px for small, 18px for standard, 20–22px for large */
  padding: 12–14px;
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
  transition: border-color 200ms ease;
}

.glass-card:hover {
  border-color: var(--accent);        /* Only on interactive/tappable cards */
}
```

---

## Signature Motion: The Signal Fill

When a new signal card appears:

```css
.ticket.new {
  border-color: var(--accent);
  animation:
    cardIn 460ms cubic-bezier(0.3, 1.2, 0.6, 1) both,
    glowFade 1000ms ease-out;
}

@keyframes cardIn {
  from { opacity: 0; transform: translateY(9px) scale(0.98); }
  to   { opacity: 1; transform: none; }
}

@keyframes glowFade {
  0%   { box-shadow: 0 0 0 0 rgba(217, 194, 140, 0.32); }
  100% { box-shadow: 0 0 22px 3px rgba(217, 194, 140, 0); }
}
```

After 700ms, remove the `.new` class — the border transitions back to `--line` over 900ms.

---

## Screen Transitions

Between tab screens:

```css
.screen {
  position: absolute;
  inset: 0;
  overflow-y: auto;
  opacity: 0;
  pointer-events: none;
  transform: translateY(7px);
  transition: opacity 220ms ease, transform 220ms ease;
}

.screen.active {
  opacity: 1;
  pointer-events: all;
  transform: none;
}
```

---

## Tab Bar

```css
.tabbar {
  display: flex;
  justify-content: space-around;
  padding: 10px 6px calc(10px + env(safe-area-inset-bottom, 0px));
  background: var(--tabbar);
  -webkit-backdrop-filter: blur(24px);
  backdrop-filter: blur(24px);
  border-top: 1px solid var(--line);
  flex-shrink: 0;
}

.tab {
  color: var(--label3);
  font-size: 9.5px;
  font-weight: 500;
}

.tab.active { color: var(--label); }
.tab.active svg { color: var(--accent); }
```

---

## Progress Bars

```css
.progress-track {
  height: 3px;
  background: var(--line);
  border-radius: 99px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 99px;
}
```

---

## Calendar Heatmap (Journal)

Day cells use **tinted backgrounds at 20% opacity** — not full solid green/red, which reads as too vibrant:

```javascript
// Profitable day
background: 'rgba(48, 209, 88, 0.20)'   // dark mode
color: 'var(--green)'                    // day number in vivid color

// Loss day
background: 'rgba(255, 69, 58, 0.20)'   // dark mode
color: 'var(--red)'

// No trades
background: 'var(--line)'
color: 'var(--label3)'

// Future dates
background: 'var(--line)'
opacity: 0.22
```

Today's cell gets `box-shadow: 0 0 0 1.5px var(--accent)` — a gold ring.

---

## App Shell

```css
.app {
  max-width: 480px;
  margin: 0 auto;
  height: 100vh;
  height: 100dvh;           /* dynamic viewport — handles iOS address bar */
  display: flex;
  flex-direction: column;
}
```

No fake device bezel around the shell. Renders edge-to-edge in the browser like a real installed app. Use `env(safe-area-inset-*)` for real notch/home indicator handling.

---

## Quality Floor (Non-negotiable)

- `:focus-visible` outline in `var(--accent)` on every interactive element — 2px, 3px offset, matching the element's border-radius.
- `prefers-reduced-motion` disables all CSS animations and JS-triggered class-based animations. Content appears in its final state instantly.
- Text meets WCAG AA contrast ratios against both the dark glass and light glass card backgrounds — not just against the page background.
- All financial numbers use `font-variant-numeric: tabular-nums` so decimal points align in lists.
- `overflow: hidden` on the body at all times — no page-level scroll, only per-screen scroll within the `.screen` containers.

---

## What the Design System Does NOT Include

- Any monospace / terminal font for body content — that reads as a developer tool.
- Neon glows, gradient borders, or animated gradients on idle elements.
- More than one accent color — green and red are semantic only (profit/loss), not decorative.
- Skeleton loading screens — use Firestore real-time listeners so data appears immediately.
- Dark mode implemented as a CSS filter or `invert()` on the light theme — both themes are independently specified above.
