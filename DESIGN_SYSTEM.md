# Seliem.dev — Design System

Premium, boutique-studio aesthetic: **gold on black**. Confident and high-end,
never corporate or flashy. Built with Next.js 14 + Tailwind CSS + Framer Motion.

## Brand essence
- Signature look: warm **gold accents on near-black**, generous negative space,
  softly rounded corners, restrained motion.
- Voice: confident, polished, "premium agency." Concise. Not playful, not stiff.

## Colors
| Role | Hex | Notes |
|------|-----|-------|
| Gold (primary accent) | `#c9a84c` | brand signature; buttons, links, headings, focus rings |
| Gold light (hover) | `#f5d485` | hover state; end of gold gradient |
| Background | `#0a0a0a` | page base (near-black) |
| Surface / card | `#141414` | cards, panels, header bars |
| Border (subtle) | `#222` | card/input borders; lighter dividers `#1c1c1c` |
| Text primary | `#ffffff` / `#eee` | headings, key text |
| Text muted | `#888`–`#ccc` | body, secondary text |
| Text faint | `#666`–`#777` | labels, timestamps, captions |

**Gold gradient:** `linear-gradient(135deg, #c9a84c, #f5d485)` — used for gradient
text (`gold-text`), primary fills, and accents.

**Status pill colors** (small rounded badges): green `#1a2a1a`/`#4d4` (success/won),
gold `#2a2a14`/`#c9a84c` (pending), blue `#142a2a`/`#6bd` (info), red `#2a1414`/`#d66` (error/lost).

## Typography
- Font family: **Inter** (`var(--font-inter)`), fallback `system-ui, sans-serif`.
- Headings: tight, often in gold or `gold-text` gradient.
- Body: muted gray, comfortable line-height (~1.5).
- Selection highlight: gold at 30% opacity.

## Shape & spacing
- Radius: generous — `rounded-xl` (12px) and `rounded-2xl` (16px) for cards/buttons;
  full pills (`rounded-full`) for badges and the chat trigger.
- Section padding: `py-24 px-4 sm:px-6 lg:px-8`; max width `max-w-7xl` centered.
- Borders are thin (1px) and subtle; cards lift on hover.

## Shadows & hover
- Card lift on hover: `translateY(-4px)`, gold-tinted border (`rgba(201,168,76,0.45)`),
  shadow `0 16px 40px -12px rgba(0,0,0,0.7)`.
- Optional gold "sheen" sweep across primary buttons/cards on hover.
- Hero background: faint gold dotted grid (`radial-gradient` dots, 40px spacing).

## Motion (Framer Motion + CSS)
Restrained and smooth — fades and gentle slides, never bouncy/flashy.
- `fade-up` (24px rise + fade, 0.6s), `fade-in` (0.5s)
- Scroll reveal: 28px rise + fade, cubic-bezier(0.22, 1, 0.36, 1), 0.7s
- Ambient: slow `float`, `float-slow`, `spin-slow`, `shimmer`, `marquee`
- Always respect `prefers-reduced-motion`.

## Components (patterns to mirror)
- **Primary button:** gold fill (`#c9a84c`), black text, `rounded-xl`, hover → `#f5d485`,
  disabled at ~40% opacity.
- **Secondary/ghost button:** transparent or `#1c1c1c` bg, `#333` border, light text.
- **Card:** `#141414` bg, `#222` border, `rounded-2xl`, padding ~16–24px, lift on hover.
- **Input/textarea:** `#0a0a0a` bg, `#222` border, `rounded-lg/xl`, gold focus ring.
- **Badge/chip:** small pill, `rounded-full`, 11–12px, status-colored bg+text pairs.
- **Focus-visible:** 2px gold outline, 2px offset (accessibility).

## Assets
- Logo: `public/logo.png` · App icon: `public/icon.png` · Favicon: `public/favicon.svg`

## Do / Don't
- ✅ Gold sparingly as the hero accent on black; lots of dark space; soft rounded corners.
- ✅ Subtle, smooth transitions; thin borders; muted gray supporting text.
- ❌ Bright multi-color palettes, hard shadows, sharp corners, busy/flashy animation.
