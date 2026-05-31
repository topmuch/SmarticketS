# SmarticketS — Design System & Landing Page Documentation

## 1. Color Palette

### Primary Colors
| Name | Hex | Usage |
|------|-----|-------|
| Orange Primary | `#FF6B35` | Brand accent, CTAs, borders |
| Orange Dark | `#e65a28` | Hover states, dark accent |
| Gold | `#D4AF37` | Gradients, badges, premium accents |
| Gold Dark | `#b8941f` | Hover states for gold |
| Emerald/WhatsApp | `#25D366` | WhatsApp integration, success states |
| Emerald Dark | `#1fb855` | Hover states for emerald |
| Ocean Blue | `#0077B6` | Agency section, information |
| Blue Dark | `#005f8a` | Hover states for blue |

### Neutral Colors
| Name | Hex | Usage |
|------|-----|-------|
| Slate 900 | `#0F172A` | Footer background, text |
| Slate 700 | `#334155` | Illustrations |
| Slate 600 | `#475569` | Body text |
| Slate 500 | `#64748B` | Secondary text |
| Slate 400 | `#94A3B8` | Placeholder text |
| Slate 200 | `#E2E8F0` | Borders, dividers |
| Slate 100 | `#F1F5F9` | Light backgrounds |
| Slate 50 | `#F8FAFC` | Section backgrounds |

### Background Tints
| Name | Usage |
|------|-------|
| `#FFF5F0` | Warm sections (Hero, Chauffeur) |
| `#F8FAFC` | Cool neutral sections |
| White | Clean content sections |

---

## 2. Typography

### Font Stack
- **Primary**: Inter (system fallback: -apple-system, BlinkMacSystemFont, sans-serif)
- **Sizes**: 
  - H1: `text-4xl sm:text-5xl md:text-6xl lg:text-7xl` (font-extrabold, tracking-tight, leading-[1.08])
  - H2: `text-3xl sm:text-4xl lg:text-5xl` (font-bold, tracking-tight)
  - H3: `text-lg lg:text-xl` (font-bold)
  - Body: `text-sm` (leading-relaxed)
  - Small: `text-xs` (font-medium)

### Gradient Text
```css
bg-gradient-to-r from-[#FF6B35] to-[#D4AF37] bg-clip-text text-transparent
```

---

## 3. Spacing & Layout

### Container
- Max width: `max-w-6xl` (1152px) for content, `max-w-7xl` (1280px) for nav
- Section padding: `py-20 lg:py-28 px-4`
- Card padding: `p-7 lg:p-8`

### Grid System
- 2 columns: `grid-cols-2` (mobile tech features)
- 3 columns: `md:grid-cols-3` (why cards, testimonials)
- 4 columns: `lg:grid-cols-4` (bento grid)
- Split: `lg:grid-cols-2` (chauffeur/agence)

### Border Radius
- Small: `rounded-lg` (8px)
- Medium: `rounded-xl` (12px)
- Large: `rounded-2xl` (16px)
- XL: `rounded-3xl` (24px)
- Full: `rounded-full` (buttons, badges)

---

## 4. Components

### Buttons
- **Primary**: `bg-[#FF6B35] hover:bg-[#e65a28] text-white rounded-full px-7 py-3.5 font-semibold shadow-lg`
- **Secondary**: `border-2 border-[#FF6B35] text-[#FF6B35] hover:bg-[#FF6B35]/5 rounded-full`
- **Ghost**: `bg-transparent border border-slate-200 text-slate-500`
- **Green**: `bg-[#25D366] hover:bg-[#1fb855] text-white`

### Cards
- Default: `bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-xl`
- Glassmorphism: `bg-white/70 backdrop-blur-lg border border-white/50`
- Tilt: Uses `TiltCard` wrapper with `perspective(1000px)` and 3D rotation

### Badges
- Pill: `inline-flex px-4 py-1.5 rounded-full text-xs font-bold tracking-[0.15em] uppercase`

---

## 5. Animation System

### FadeIn Component
- Scroll-triggered via `useInView` (once, margin: -40px)
- Direction: up/down/left/right (40px offset)
- Duration: 0.7s, ease: `[0.22, 1, 0.36, 1]` (custom cubic-bezier)
- Stagger: `delay: i * 0.12`

### Framer Motion Patterns
- **Hover**: `whileHover={{ scale: 1.03 }}` / `whileTap={{ scale: 0.98 }}`
- **Spring**: `type: 'spring', stiffness: 200`
- **Parallax**: `useScroll` + `useTransform` for hero parallax
- **Timeline**: Animated progress bar with `width: 0% → 100%`
- **Ping**: `animate-ping` for live indicators
- **Float**: `y: [0, 8, 0]` with `repeat: Infinity`

### Particle Canvas
- Pure Canvas API (no Three.js dependency)
- Particle count: `Math.min(width * height / 12000, 80)`
- Colors: Orange, Gold, Emerald, Yellow
- Mouse repulsion within 150px radius
- Connection lines between particles < 120px apart
- Responsive resize with devicePixelRatio support

### 3D Tilt Effect
- Perspective: 1000px
- Max rotation: 6-12 degrees
- Scale on hover: 1.02
- Glare overlay: radial-gradient following cursor
- CSS transition: 200ms ease-out

### Confetti
- Library: `canvas-confetti` (dynamic import)
- Colors: `['#FF6B35', '#D4AF37', '#25D366', '#FFD23F']`
- Pattern: Center burst + delayed side bursts
- Triggered on CTA button click

---

## 6. Section Architecture

| # | Section | Background | Key Feature |
|---|---------|-----------|-------------|
| 1 | Navigation | `bg-white/80` → `bg-white/95` (scrolled) | Backdrop blur, sticky |
| 2 | Hero | `#FFF5F0` → `#FFFFFF` gradient + Particles | Canvas animation, parallax |
| 3 | Why SmarticketS | `#F8FAFC` | 3D tilt cards |
| 4 | How it Works | White | Animated timeline (progress bar) |
| 5 | Stats | White | Animated counters (scroll-triggered) |
| 6 | Chauffeur | `#FFF5F0` | Split 50/50, SVG illustration |
| 7 | Agence | White | Split reverse, dashboard mockup |
| 8 | Tech Features | `#F8FAFC` | Bento grid with tilt |
| 9 | Testimonials | `#F8FAFC` | Carousel (auto-play, 5s) |
| 10 | CTA | Orange→Gold gradient | Confetti burst, floating dots |
| 11 | Footer | `#0F172A` | Social links, 5-column grid |

---

## 7. Performance Targets

- **Lighthouse**: ≥ 95 (Performance, Accessibility, Best Practices, SEO)
- **Lazy loading**: Heavy components (ParticleCanvas, TiltCard, TestimonialCarousel, StatsSection) loaded via `next/dynamic` with `ssr: false`
- **Bundle**: No GSAP/Three.js — pure Canvas API + Framer Motion
- **Images**: SVG inline illustrations (zero network requests)
- **Fonts**: System font stack (no external font files)

---

## 8. Accessibility

- Semantic HTML: `<main>`, `<section>`, `<nav>`, `<footer>`
- ARIA labels on all interactive elements
- Keyboard navigation: all buttons/links focusable
- Touch targets: minimum 44px (w-11 h-11)
- Color contrast: WCAG AA compliant
- Reduced motion: Framer Motion respects `prefers-reduced-motion`

---

## 9. Responsive Breakpoints

| Breakpoint | Width | Layout |
|-----------|-------|--------|
| Mobile | < 640px | Single column, vertical timeline |
| Tablet | 640-1024px | 2-column grids, visible search |
| Desktop | > 1024px | Full grid, horizontal timeline, parallax |
| Large | > 1280px | Max-width containers |
