---
name: frontend-design
description: >
  Create distinctive, production-grade frontend interfaces with high design
  quality. Use when the user asks to build web components, pages, artifacts,
  posters, or applications (websites, landing pages, dashboards, React
  components, HTML/CSS layouts) or when styling/beautifying any web UI.
  Generates creative, polished code that avoids generic AI aesthetics.
  Always use alongside design-guide (component conventions) and the Vectra
  Cargo brand palette defined in doc/vectra/COLOR_PALETTE.md.
---

# Frontend Design Skill

Create distinctive, production-grade frontend interfaces that avoid generic "AI slop" aesthetics. Implement real working code with exceptional attention to aesthetic details and creative choices.

The user provides frontend requirements: a component, page, application, or interface to build. They may include context about the purpose, audience, or technical constraints.

**Always use with:** `design-guide` (component conventions & tokens) when working inside the Paperclip UI.

---

## 1. Design Thinking

Before coding, understand the context and commit to a **bold** aesthetic direction:

- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Pick a clear direction: brutally minimal, maximalist, retro-futuristic, organic/natural, luxury/refined, playful, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian, etc. Use these for inspiration but design one that is true to the aesthetic direction.
- **Constraints**: Technical requirements (framework, performance, accessibility).
- **Differentiation**: What makes this UNFORGETTABLE? What is the one thing someone will remember?

**CRITICAL**: Choose a clear conceptual direction and execute it with precision. Bold maximalism and refined minimalism both work -- the key is intentionality, not intensity.

Then implement working code (HTML/CSS/JS, React, Vue, etc.) that is:

- Production-grade and functional
- Visually striking and memorable
- Cohesive with a clear aesthetic point-of-view
- Meticulously refined in every detail

---

## 2. Vectra Cargo Context

When working inside the Paperclip dashboard (this repo), the aesthetic direction is already set:

### Brand Identity

- **Navy** `#1B2A4A` -- authority, depth, professionalism
- **Orange** `#E8751A` -- energy, action, CTAs
- **Orange Light** `#FFF3E8` -- warm highlights on light theme
- **Dark Text** `#2D2D2D` / **Medium Text** `#555555`
- **Red Conf** `#CC0000` -- destructive / critical
- **Green Dot** `#4CAF50` -- success / online

### How to Use Brand Colors in Paperclip

- **Never use raw hex in components.** Use semantic tokens (`--primary`, `--sidebar-background`, etc.) that are already mapped to the Vectra palette in `ui/src/index.css`.
- Use `--vectra-*` CSS custom properties **only** when you need an explicit brand color match (e.g., a branded hero section).
- Canonical mapping lives in `doc/vectra/COLOR_PALETTE.md`.

### Tone for Paperclip

- **Professional logistics control room.** Dense, data-rich, keyboard-first.
- Dark theme default: navy-based surfaces, orange accents.
- Light theme: clean white/gray, orange primary, navy sidebar.
- No playful/toy aesthetics -- this is an operations tool.

---

## 3. Frontend Aesthetics Guidelines

### Typography

- Choose fonts that are beautiful, unique, and interesting.
- Avoid generic fonts: Arial, Inter, Roboto, system fonts.
- Pair a distinctive display font with a refined body font.
- **In Paperclip:** follow the exact typography scale from `design-guide`:

  | Pattern | Classes | Usage |
  |---------|---------|-------|
  | Page title | `text-xl font-bold` | Top of pages |
  | Section title | `text-lg font-semibold` | Major sections |
  | Section heading | `text-sm font-semibold text-muted-foreground uppercase tracking-wide` | Sidebar, section headers |
  | Card title | `text-sm font-medium` or `text-sm font-semibold` | Card headers, list items |
  | Body | `text-sm` | Default body text |
  | Muted | `text-sm text-muted-foreground` | Descriptions, secondary |
  | Tiny label | `text-xs text-muted-foreground` | Metadata, timestamps |
  | Mono identifier | `text-xs font-mono text-muted-foreground` | Issue keys (PAP-001) |
  | Large stat | `text-2xl font-bold` | Dashboard metrics |
  | Code/log | `font-mono text-xs` | Log output, code |

  Do NOT invent new typography patterns. For standalone artifacts outside the dashboard, choose freely.

### Color & Theme

- Commit to a cohesive aesthetic. Use CSS variables for consistency.
- Dominant colors with sharp accents outperform timid, evenly-distributed palettes.
- **In Paperclip:** use the semantic token system. Do not introduce new color variables without updating `index.css` and `COLOR_PALETTE.md`.
- **Shadows (Paperclip):** minimal only -- `shadow-xs` (outline buttons) and `shadow-sm` (cards). Never use `shadow-md` or heavier.
- **Radius (Paperclip):** single `--radius` variable (0.625rem) with derived sizes: `rounded-sm` (small inputs), `rounded-md` (buttons/inputs), `rounded-lg` (cards/dialogs), `rounded-xl` (card containers). Max is `rounded-xl` except `rounded-full` for badges/avatars/pills. Never use `rounded-2xl` or larger.

### Motion & Animation

- Use animations for effects and micro-interactions.
- Prioritize CSS-only solutions for HTML. Use Motion library for React when available.
- Focus on high-impact moments: one well-orchestrated page load with staggered reveals (`animation-delay`) creates more delight than scattered micro-interactions.
- Use scroll-triggering and hover states that surprise.
- **In Paperclip:** keep animations subtle and fast (150-300ms). This is a productivity tool, not a portfolio site. Prefer `transition` on hover/focus states over elaborate entrance animations.

### Spatial Composition

- Unexpected layouts. Asymmetry. Overlap. Diagonal flow. Grid-breaking elements.
- Generous negative space OR controlled density.
- **In Paperclip:** follow the three-zone layout (sidebar / main / properties panel). Density is a feature -- maximize information without extra clicks.

### Backgrounds & Visual Details

- Create atmosphere and depth rather than defaulting to solid colors.
- Apply creative forms: gradient meshes, noise textures, geometric patterns, layered transparencies, dramatic shadows, decorative borders, custom cursors, grain overlays.
- **In Paperclip:** keep backgrounds clean (`--background`, `--card`). Reserve texture/depth for standalone pages like login, onboarding, or marketing views.

---

## 4. Anti-Patterns (What to NEVER Do)

- Overused font families (Inter, Roboto, Arial, system fonts) for standalone artifacts
- Cliched color schemes (purple gradients on white)
- Predictable layouts and cookie-cutter design lacking context-specific character
- **Space Grotesk** or any single font converging across generations
- Generic card grids with rounded corners and soft shadows (the "AI look")
- Using `!important` or inline styles to override the token system
- **In Paperclip:** using `shadow-md` or heavier (max `shadow-sm`)
- **In Paperclip:** using `rounded-2xl` or larger (max `rounded-xl`, except `rounded-full` for pills)
- **In Paperclip:** inventing new typography patterns outside the established scale

---

## 5. Internationalization Awareness

All user-visible strings must go through **i18n** (`react-i18next`):

- Use `t('namespace.key')` -- never hardcode English or Portuguese.
- Add keys to both `ui/src/i18n/locales/en.json` and `pt-BR.json`.
- Dates and numbers: use locale-aware formatting (`i18n.language`).
- Buttons, labels, tooltips, placeholders, error messages -- everything.

---

## 6. Accessibility Checklist

- Contrast ratio: minimum 4.5:1 for text, 3:1 for large text and UI components.
- **Orange on navy** passes for large text but verify small text -- adjust `--primary-foreground` if needed.
- All interactive elements need visible focus states (`focus-visible:ring-ring`).
- Images/logos need `alt` text (translated via i18n when clickable).
- Semantic HTML: `<nav>`, `<main>`, `<aside>`, `<header>`, proper heading hierarchy.
- Keyboard navigation: all actions reachable without mouse.

---

## 7. Implementation Checklist

When building a new page or component in Paperclip:

1. Read `design-guide` for component conventions and token system
2. Use semantic tokens from `index.css` -- never raw colors
3. Follow typography scale exactly
4. Add i18n keys for all user-visible strings (both locales)
5. Test dark and light themes
6. Verify WCAG contrast on brand color combinations
7. Add component to `/design-guide` page if reusable
8. Update `component-index.md` if new reusable component
9. Run `pnpm build` and `pnpm typecheck` before committing

---

## 8. Creative Freedom

For artifacts **outside** the Paperclip dashboard (landing pages, marketing sites, standalone tools, posters, PDFs):

- Full creative freedom applies. No convergence.
- Each design should be unique -- vary themes, fonts, aesthetics.
- Interpret creatively and make unexpected choices that feel genuinely designed for the context.
- Match implementation complexity to the aesthetic vision: maximalist designs need elaborate code; minimalist designs need precision and restraint.

**Remember:** Claude is capable of extraordinary creative work. Don't hold back -- show what can truly be created when thinking outside the box and committing fully to a distinctive vision.
