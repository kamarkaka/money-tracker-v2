# Styling Improvements — Design Plan

## Current State

The app uses a mostly black/white zinc palette. It's clean and functional but lacks visual personality and warmth. The goal is to make it more appealing while maintaining readability and professionalism.

## Proposed Changes

### 1. Accent Color System (HIGH IMPACT)

Replace neutral zinc for interactive elements with a brand color. Deep blue/teal conveys trust — ideal for a finance app.

**Color tokens:**
```
Primary:      #2563eb (blue-600)
Primary hover: #1d4ed8 (blue-700)
Primary dark:  #3b82f6 (blue-500, for dark mode)
```

**Where to apply:**
- Primary action buttons (Save, Add, Login): `bg-blue-600 hover:bg-blue-700` instead of `bg-zinc-900`
- Active nav links: blue highlight instead of `bg-zinc-100`
- Selected/focused input borders: already blue — keep
- Links and interactive text: blue instead of zinc
- Topbar active page indicator: blue underline or pill

**What stays neutral:**
- Cancel/secondary buttons: keep zinc outline
- Text content: keep zinc
- Borders and dividers: keep zinc

### 2. Colored Dashboard Stats (HIGH IMPACT)

Tint the income/expense/savings cards with soft background colors:

```
Income card:  bg-green-50  dark:bg-green-950/30   border-green-200 dark:border-green-800
Expense card: bg-red-50    dark:bg-red-950/30     border-red-200   dark:border-red-800
Savings card: bg-blue-50   dark:bg-blue-950/30    border-blue-200  dark:border-blue-800
```

### 3. Soft Background Tint (MEDIUM IMPACT)

Shift from pure zinc to slate for a warmer, slightly blue-tinted feel:

```
Page background:  bg-slate-50    → dark:bg-slate-950
Card background:  bg-white       → dark:bg-slate-900
Topbar:           bg-white       → dark:bg-slate-950
```

This is a subtle change but makes the whole app feel less stark.

### 4. Card Left Borders (MEDIUM IMPACT)

Add colored left borders to cards for visual hierarchy:

- **Budget cards on overview**: 4px left border matching progress bar color
- **Account institution cards**: 4px left blue border
- **Transaction mobile cards**: 2px left border, colored by category (or neutral if uncategorized)
- **Tag cards**: left border using tag's color

```css
border-l-4 border-l-blue-500
```

### 5. Micro-animations (MEDIUM IMPACT)

Add subtle motion to make the app feel more polished:

**Progress bars:**
```css
/* Animate from 0 to target width on mount */
@keyframes grow-width {
  from { width: 0; }
}
.progress-bar {
  animation: grow-width 0.8s ease-out;
}
```

**Buttons:**
```css
button {
  transition: transform 0.1s;
}
button:active {
  transform: scale(0.97);
}
```

**Cards on load:**
```css
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
```

**Number counters:** Animate the income/expense/savings totals counting up on the overview page.

### 6. Category Color System (LOW IMPACT, MORE WORK)

Assign colors to categories (similar to tags) and show colored indicators:
- Category tree: colored dot before each category name
- Budget cards: icon/dot colored by the primary category
- Transaction list: small colored dot for the assigned category

This requires a schema change (add `color` field to Category) and migration.

### 7. Gradient Header (LOW IMPACT)

Subtle gradient on the topbar:
```css
/* Light mode */
background: linear-gradient(to right, white, #f0f4ff);

/* Dark mode */
background: linear-gradient(to right, #0f172a, #1e1b4b);
```

Very subtle — adds depth without being distracting.

## Implementation Order

| Priority | Change | Effort | Files |
|----------|--------|--------|-------|
| 1 | Accent color (buttons) | Low | All pages + components with primary buttons |
| 2 | Colored stat cards | Low | MonthlySummaryHeader.tsx |
| 3 | Micro-animations (buttons + progress bars) | Low | globals.css, BucketCard.tsx |
| 4 | Soft background tint (zinc → slate) | Medium | AppShell.tsx, Topbar.tsx, all cards |
| 5 | Card left borders | Low | BucketCard.tsx, InstitutionCard.tsx, transaction cards |
| 6 | Gradient header | Low | Topbar.tsx |
| 7 | Category colors | High | Schema, API, CategoryTree, transaction display |

## Three Accent Themes

All three themes use the same CSS variable approach for easy switching. The user selects a theme in Settings, stored in `UserSetting.accent` (new field). CSS variables are set on `<html>` and referenced throughout.

### Theme 1: "Professional" — Trust & Authority

Deep blue palette. Clean, corporate feel. Inspired by banking apps.

```
--accent:           #2563eb  (blue-600)
--accent-hover:     #1d4ed8  (blue-700)
--accent-dark:      #3b82f6  (blue-500)
--accent-dark-hover:#60a5fa  (blue-400)
--accent-subtle:    #eff6ff  (blue-50)
--accent-subtle-dark:#1e3a5f

Page bg light:      #f8fafc  (slate-50)
Page bg dark:       #0f172a  (slate-900)
Card bg light:      #ffffff
Card bg dark:       #1e293b  (slate-800)

Stat cards:
  Income:   bg-emerald-50 / border-emerald-200
  Expense:  bg-red-50 / border-red-200
  Savings:  bg-blue-50 / border-blue-200

Active nav:         blue pill with white text
Buttons:            solid blue, white text
Links:              blue-600
Selected row:       blue-50 bg
```

Vibe: Bloomberg terminal meets modern SaaS. Trustworthy, no-nonsense.

---

### Theme 2: "Friendly" — Warm & Personal

Warm teal/coral palette. Rounded, approachable feel. Inspired by personal finance apps like Mint/Copilot.

```
--accent:           #0d9488  (teal-600)
--accent-hover:     #0f766e  (teal-700)
--accent-dark:      #2dd4bf  (teal-400)
--accent-dark-hover:#5eead4  (teal-300)
--accent-subtle:    #f0fdfa  (teal-50)
--accent-subtle-dark:#134e4a

Secondary accent:   #f97316  (orange-500) — for highlights, badges, notifications
Warm neutral:       #78716c  (stone-500) — instead of zinc for text

Page bg light:      #fafaf9  (stone-50)
Page bg dark:       #1c1917  (stone-900)
Card bg light:      #ffffff
Card bg dark:       #292524  (stone-800)

Stat cards:
  Income:   bg-teal-50 / border-teal-200
  Expense:  bg-orange-50 / border-orange-200
  Savings:  bg-amber-50 / border-amber-200

Active nav:         teal pill
Buttons:            solid teal, white text
Destructive:        coral/orange instead of harsh red
Selected row:       teal-50 bg
Cards:              slightly more rounded (rounded-xl instead of rounded-lg)
```

Vibe: Friendly neighborhood advisor. Warm, encouraging, personal.

---

### Theme 3: "Creative" — Bold & Expressive

Purple/violet gradient palette with neon accents. Dark-mode forward. Inspired by Figma, Linear, Raycast.

```
--accent:           #7c3aed  (violet-600)
--accent-hover:     #6d28d9  (violet-700)
--accent-dark:      #a78bfa  (violet-400)
--accent-dark-hover:#c4b5fd  (violet-300)
--accent-subtle:    #f5f3ff  (violet-50)
--accent-subtle-dark:#2e1065

Secondary accent:   #ec4899  (pink-500) — for tags, highlights
Tertiary accent:    #06b6d4  (cyan-500) — for info, links

Page bg light:      #faf5ff  (very light violet tint)
Page bg dark:       #0c0a1a  (custom deep violet-black)
Card bg light:      #ffffff
Card bg dark:       #1a1625  (custom muted violet-dark)

Stat cards:
  Income:   bg-emerald-50 / border-emerald-300
  Expense:  bg-pink-50 / border-pink-300
  Savings:  bg-violet-50 / border-violet-300

Active nav:         violet pill with glow effect (box-shadow: 0 0 12px rgba(124,58,237,0.3))
Buttons:            gradient from violet-600 to purple-600
                    bg-gradient-to-r from-violet-600 to-purple-600
Destructive:        pink-500 instead of red
Selected row:       violet-50 bg with violet left border
Cards:              subtle violet border glow on hover in dark mode
Progress bars:      use violet→pink→orange→red instead of green→yellow→orange→red
Topbar dark mode:   subtle purple gradient background
```

Special effects (creative only):
- Button hover: subtle glow `shadow-lg shadow-violet-500/25`
- Card hover in dark mode: `border-violet-500/30` glow
- Active nav item: `shadow-[0_0_12px_rgba(124,58,237,0.3)]`
- Gradient text for page titles: `bg-gradient-to-r from-violet-600 to-pink-500 bg-clip-text text-transparent`

Vibe: Creative studio meets fintech. Bold, modern, expressive.

---

## Implementation Architecture

### CSS Variables Approach

Define accent colors as CSS variables on `<html>`, switched by a class:

```css
:root, .theme-professional {
  --accent: #2563eb;
  --accent-hover: #1d4ed8;
  --accent-subtle: #eff6ff;
  --page-bg: #f8fafc;
  --card-bg: #ffffff;
}
.theme-friendly {
  --accent: #0d9488;
  --accent-hover: #0f766e;
  --accent-subtle: #f0fdfa;
  --page-bg: #fafaf9;
  --card-bg: #ffffff;
}
.theme-creative {
  --accent: #7c3aed;
  --accent-hover: #6d28d9;
  --accent-subtle: #f5f3ff;
  --page-bg: #faf5ff;
  --card-bg: #ffffff;
}

/* Dark mode variants */
.dark.theme-professional {
  --accent: #3b82f6;
  --accent-hover: #60a5fa;
  --accent-subtle: #1e3a5f;
  --page-bg: #0f172a;
  --card-bg: #1e293b;
}
/* ... etc for each theme */
```

### Database Change

Add `accent` field to `UserSetting`:
```prisma
accent String @default("professional") @db.VarChar(20)
```

### Setting Page

Add an "Accent Theme" section with 3 preview cards, each showing a mini preview of the color scheme.

### Files to Change

| File | Change |
|------|--------|
| `globals.css` | Define CSS variables for all 3 themes |
| `ThemeProvider.tsx` | Also apply accent class to `<html>` |
| `UserSetting` schema | Add `accent` field |
| `setting/route.ts` | Accept `accent` in PUT |
| `setting/page.tsx` | Add accent picker UI |
| All buttons | Replace `bg-zinc-900` with `bg-[var(--accent)]` |
| All pages | Replace `bg-zinc-50` with `bg-[var(--page-bg)]` |
| All cards | Replace `bg-white` with `bg-[var(--card-bg)]` |

### Switching is Easy

Because everything uses CSS variables, switching themes is instant — just change the class on `<html>`:
```ts
document.documentElement.className = `${darkClass} theme-${accent}`;
```

No component re-renders needed. The browser repaints with new variable values automatically.

## What NOT to Change

- The green→yellow→orange→red progress bar gradient — it's distinctive and works well
- Tag colors and shapes — already have personality
- Dark/light theme toggle — keep the smooth transition
- Font choices — the current sans-serif is clean and readable
- The overall layout structure — it's well-organized
