# SmarticketS — Guide de Design & Développement

> Référence officielle du système de design pour la landing page SmarticketS.
> Next.js 16 · Tailwind CSS 4 · Framer Motion

---

## Table des matières

1. [Vue d'ensemble du système de design](#1-vue-densemble-du-système-de-design)
2. [Palette de couleurs](#2-palette-de-couleurs)
3. [Typographie](#3-typographie)
4. [Règles d'espacement](#4-règles-despacement)
5. [Border Radius](#5-border-radius)
6. [Ombres (Shadows)](#6-ombres-shadows)
7. [Standards d'animation (Framer Motion)](#7-standards-danimation-framer-motion)
8. [Architecture des composants](#8-architecture-des-composants)
9. [Règles de mise en page (Layout)](#9-règles-de-mise-en-page-layout)
10. [Breakpoints responsifs](#10-breakpoints-responsifs)
11. [Accessibilité](#11-accessibilité)
12. [Standards d'images](#12-standards-dimages)
13. [Objectifs de performance](#13-objectifs-de-performance)
14. [Intégration du routage](#14-intégration-du-routage)

---

## 1. Vue d'ensemble du système de design

**SmarticketS** est une plateforme de suivi logistique pour le transport inter-villes au Sénégal. Le système de design reflète une identité **corporate, crédible et premium**, inspirée des leaders du secteur comme DHL et Kuehne+Nagel.

### Principes directeurs

| Principe | Description |
|---|---|
| **Fiabilité** | Palette sobre, typographie nette, espacement généreux |
| **Professionnalisme** | Ombres subtiles, pas d'effets gimmick, animations retenues |
| **Modernité** | Animations au scroll, micro-interactions, gradients fins |
| **Accessibilité** | Contrastes conformes WCAG AA, navigation clavier, aria-labels |

---

## 2. Palette de couleurs

### Couleurs principales

| Nom | Hex | CSS Variable | Tailwind Background | Tailwind Text |
|---|---|---|---|---|
| Navy Primary | `#0A2540` | `--color-navy` | `bg-[#0A2540]` | `text-[#0A2540]` |
| Navy Light | `#1A3A52` | `--color-navy-light` | `bg-[#1A3A52]` | `text-[#1A3A52]` |
| White Pure | `#FFFFFF` | `--color-white` | `bg-white` | `text-white` |
| White Soft | `#F8FAFC` | `--color-white-soft` | `bg-[#F8FAFC]` | `text-[#F8FAFC]` |

### Couleurs d'accent

| Nom | Hex | Usage | Tailwind Background | Tailwind Text |
|---|---|---|---|---|
| Accent Orange | `#FF6B35` | CTAs, badges, highlights | `bg-[#FF6B35]` | `text-[#FF6B35]` |
| Accent Green | `#10B981` | Succès, WhatsApp, espace chauffeur | `bg-[#10B981]` | `text-[#10B981]` |
| WhatsApp Green | `#25D366` | Bouton WhatsApp | `bg-[#25D366]` | `text-[#25D366]` |

### Couleurs neutres

| Nom | Hex | Usage | Tailwind Classes |
|---|---|---|---|
| Gray Text | `#475569` | Texte courant, descriptions | `text-[#475569]` |
| Gray Light | `#E2E8F0` | Bordures, séparateurs | `border-[#E2E8F0]` |

### Règles d'utilisation

- **Fonds de section** : alterner `bg-white` et `bg-[#F8FAFC]` pour créer un rythme visuel
- **Sections sombres** : `bg-[#0A2540]` (Process, Footer, CTA Final)
- **Texte sur fond sombre** : toujours `text-white` ou `text-white/80`
- **Ne jamais** utiliser plus de 2 couleurs d'accent par section

---

## 3. Typographie

### Police

- **Famille** : Inter (via `next/font/google`)
- **Variable CSS** : `--font-inter`
- **Application** : appliquée sur `<body>` via `className="font-[family-name:var(--font-inter)]"`

### Hiérarchie typographique

| Élément | Taille | Poids | Espacement | Lettrage |
|---|---|---|---|---|
| **H1** | `text-4xl sm:text-5xl md:text-6xl lg:text-7xl` | `font-extrabold` | `tracking-tight` | `-0.02em` |
| **H2** | `text-3xl sm:text-4xl lg:text-5xl` | `font-bold` | `tracking-tight` | `-0.02em` |
| **H3** | `text-lg sm:text-xl` | `font-bold` | `tracking-tight` | — |
| **Body** | `text-sm sm:text-base` | `font-normal` to `font-medium` | `leading-relaxed` (1.625) | — |
| **Small** | `text-xs` | `font-medium` | `leading-relaxed` | — |

### Règles typographiques

- Les titres sont toujours en **Navy Primary** (`text-[#0A2540]`) sur fond clair, `text-white` sur fond sombre
- Le texte courant utilise `text-[#475569]` (Gray Text)
- Les labels et métadonnées utilisent `text-xs font-medium uppercase tracking-wider text-[#475569]/60`
- Les puces de liste utilisent `text-sm font-medium text-[#475569]`

---

## 4. Règles d'espacement

### Sections

| Propriété | Valeur |
|---|---|
| Padding vertical | `py-16 sm:py-24 lg:py-32` |
| Padding horizontal | `px-4 sm:px-6 lg:px-8` |
| Container courant | `max-w-6xl mx-auto` |
| Container large | `max-w-7xl mx-auto` |
| Marge sous titre de section | `mb-12 sm:mb-16` |

### Cartes (Cards)

| Propriété | Valeur |
|---|---|
| Padding interne | `p-6 sm:p-8` |
| Écart entre cartes | `gap-6 lg:gap-8` |
| Grille 3 colonnes | `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8` |

### Éléments internes

| Propriété | Valeur |
|---|---|
| Icône → Titre | `mb-4` |
| Titre → Description | `mb-2` |
| Bouton au-dessus | `mt-6 sm:mt-8` |
| Étape (process) → Contenu | `mb-4` |

---

## 5. Border Radius

| Élément | Classe | Rayon |
|---|---|---|
| Cartes | `rounded-xl` | 12px |
| Boutons | `rounded-lg` | 8px |
| Badges (full) | `rounded-full` | 50% |
| Icônes en cercle | `rounded-full` | 50% |
| Champs de saisie | `rounded-xl` | 12px |
| Images | `rounded-xl` | 12px |

---

## 6. Ombres (Shadows)

### Philosophie

Les ombres sont **professionnelles et subtiles**. Aucune ombre lourde, aucun glow coloré (sauf léger sur les CTA).

| Usage | Classe Shadow |
|---|---|
| Carte par défaut | `shadow-[0_4px_24px_rgba(10,37,64,0.04)]` |
| Carte au survol | `shadow-[0_8px_32px_rgba(10,37,64,0.1)]` |
| CTA Orange | `shadow-[0_4px_12px_rgba(255,107,53,0.25)]` |
| CTA Orange au survol | `shadow-[0_4px_16px_rgba(255,107,53,0.35)]` |
| CTA Vert | `shadow-[0_4px_12px_rgba(16,185,129,0.25)]` |
| Navigation scrollée | `shadow-[0_4px_24px_rgba(10,37,64,0.08)]` |

### Règles

- **Ne jamais** utiliser `shadow-2xl`, `shadow-lg` par défaut, ou des ombres colorées exagérées
- Les transitions d'ombre utilisent `transition-shadow duration-300`
- Les cartes combinent `whileHover={{ y: -4 }}` + changement d'ombre via Framer Motion

---

## 7. Standards d'animation (Framer Motion)

### Bibliothèque

Toutes les animations utilisent **`framer-motion`**. Aucun autre library d'animation (pas de GSAP, pas de CSS @keyframes complexe).

### Easing

```typescript
const EASING = [0.22, 1, 0.36, 1]; // cubic-bezier corporate smooth
```

### Composant FadeIn (`src/components/landing/FadeIn.tsx`)

Composant réutilisable qui enveloppe les éléments pour les animer au scroll.

```tsx
// Props principales
<FadeIn direction="up" delay={0} duration={0.7}>
  {children}
</FadeIn>

// Directions disponibles : "up" | "down" | "left" | "right"
```

### Paramètres d'animation

| Paramètre | Valeur |
|---|---|
| Durée FadeIn | `0.7s` |
| Easing | `[0.22, 1, 0.36, 1]` |
| Stagger par carte | `0.08s` |
| Stagger par étape | `0.1s` |
| Scroll trigger | `useInView` avec `once: true, margin: '-40px'` |

### Micro-interactions

| Interaction | Implementation |
|---|---|
| Carte au survol | `whileHover={{ y: -4 }}` |
| CTA au survol | `hover:scale-[1.02]` + shadow enhancement |
| Timeline Process | Ligne animée au scroll, cercles en spring |
| WhatsApp float | `animate-ping` sur l'anneau, `hover:scale-110` sur le bouton |

### Règles strictes

- **ZERO gimmick** : pas de particules, pas de curseur custom, pas de parallaxe agressive
- Pas de rotation sur les cartes
- Pas de mouvement excessif (max `y: -4` pour le hover)
- Respecter `prefers-reduced-motion` : réduire ou désactiver les animations
- Toujours utiliser `once: true` sur `useInView` pour ne pas rejouer

---

## 8. Architecture des composants

### Structure

```
src/components/landing/
├── Navigation.tsx
├── HeroSection.tsx
├── ServicesSection.tsx
├── ProcessSection.tsx
├── WhySmarticketSSection.tsx
├── SpacesSection.tsx
├── TestimonialsSection.tsx
├── BlogSection.tsx
├── CTAFinalSection.tsx
├── Footer.tsx
├── WhatsAppFloat.tsx
└── FadeIn.tsx
```

### Conventions

| Convention | Règle |
|---|---|
| Directive client | Tous les composants utilisent `'use client'` (requis par Framer Motion) |
| Export | `export default function ComponentName()` |
| Icônes | **UNIQUEMENT** Lucide React (`lucide-react`) |
| Emoji | Autorisé uniquement à titre décoratif (jamais pour les icônes fonctionnelles) |
| Nommage | PascalCase pour les fichiers et composants |

### Imports standard

```tsx
'use client';

import { motion } from 'framer-motion';
import { IconName } from 'lucide-react';
import FadeIn from './FadeIn';
```

---

## 9. Règles de mise en page (Layout)

### Navigation

- Position : `fixed top-0`, `z-50`
- État par défaut : `bg-transparent`
- État scrollé : `bg-white/95 backdrop-blur-sm shadow-[0_4px_24px_rgba(10,37,64,0.08)]`
- Transition : `transition-all duration-300`

### Hero

- Hauteur : `min-h-screen`
- Fond : dégradé de `#F8FAFC` vers `#FFFFFF`
- Contenu centré verticalement et horizontalement

### Sections thématiques

| Section | Fond |
|---|---|
| Services | `bg-white` |
| Process | `bg-[#0A2540]` (plein navy) |
| Why SmarticketS | `bg-[#F8FAFC]` |
| Espaces | `bg-white` |
| Témoignages | `bg-[#F8FAFC]` |
| Blog | `bg-white` |
| CTA Final | Dégradé `from-[#0A2540] to-[#1A3A52]` |
| Footer | `bg-[#0A2540]` |

### Rythme visuel

Alterner systématiquement `bg-white` et `bg-[#F8FAFC]` entre les sections pour créer une séparation naturelle sans bordures.

---

## 10. Breakpoints responsifs

### Approche

**Mobile-first**. Toutes les styles sont définis pour mobile puis enrichis avec les breakpoints.

### Breakpoints Tailwind

| Breakpoint | Largeur | Usage typique |
|---|---|---|
| Default | 0px | Mobile |
| `sm` | 640px | Mobile large |
| `md` | 768px | Tablette |
| `lg` | 1024px | Desktop |
| `xl` | 1280px | Desktop large |

### Comportements responsifs par composant

| Composant | Mobile | Tablet (md) | Desktop (lg+) |
|---|---|---|---|
| **Services grid** | 1 colonne | 2 colonnes | 3 colonnes |
| **Process timeline** | Verticale | Verticale | Horizontale |
| **Témoignages** | 1 carte | 2 cartes | 2 cartes |
| **Navigation CTA** | Masqué | Visible | Visible |
| **Menu mobile** | Hamburger + AnimatePresence | — | Navigation inline |
| **Titres H1** | `text-4xl` | `text-5xl` | `text-6xl lg:text-7xl` |
| **Container** | `px-4` | `px-6` | `px-8` |

### Menu mobile

- Utiliser `AnimatePresence` de Framer Motion pour le slide-down
- Animation : `initial={{ height: 0, opacity: 0 }}` → `animate={{ height: 'auto', opacity: 1 }}`
- Le hamburger a `aria-label="Menu"`

---

## 11. Accessibilité

### Standards

Tous les éléments doivent respecter **WCAG AA** (niveau minimum).

### Contraste

- Ratio de contraste ≥ **4.5:1** pour le texte normal
- Ratio de contraste ≥ **3:1** pour le texte large (18px+ ou 14px+ bold)
- Vérification systématique des combinaisons couleur texte / fond

### Labels et attributs ARIA

| Élément | Attribut |
|---|---|
| Hamburger menu | `aria-label="Menu"` |
| Flèches de carousel | `aria-label="Précédent"` / `aria-label="Suivant"` |
| Liens CTA | Texte descriptif + `aria-label` si icône uniquement |
| Images | `alt` descriptif pour chaque image |
| Sections sémantiques | Utiliser `<section>`, `<nav>`, `<main>`, `<footer>` |

### Navigation clavier

- Tous les éléments interactifs sont accessibles au clavier (Tab, Enter, Escape)
- Focus visible sur tous les éléments focusables
- Menu mobile se ferme avec `Escape`

### Recommandations

- Ajouter un **skip link** pour le contenu principal : `<a href="#main" className="sr-only focus:not-sr-only">Aller au contenu</a>`
- Tester avec un lecteur d'écran
- Respecter l'ordre logique du DOM

---

## 12. Standards d'images

### Format

- **Formats préférés** : WebP, AVIF
- Fallback JPEG/PNG si nécessaire
- Utiliser le composant `<Image>` de Next.js avec `width` et `height` explicites

### Chargement

- Toutes les images utilisent le **lazy loading** (comportement par défaut de Next.js `<Image>`)
- Les images above-the-fold (Hero) peuvent utiliser `priority`

### Types de visuels

| Type | Description |
|---|---|
| Photos | Chauffeurs, camions, entrepôts, scènes logistiques au Sénégal |
| Dashboards | Mockups d'interface de suivi SmarticketS |
| Cartes | Cartes géographiques avec itinéraires inter-villes |
| QR Codes | Illustrations de QR codes scannés |
| SVG décoratifs | Illustrations inline (ex: dashboard mockup dans WhySmarticketS) |

### SVG

- Les SVG décoratifs doivent être **inline** (composants React)
- Utiliser les couleurs du système de design
- Ne pas inclure de SVG externes comme assets si possible

---

## 13. Objectifs de performance

### Cibles Lighthouse

| Métrique | Objectif |
|---|---|
| Performance | ≥ **95** |
| Accessibility | ≥ **95** |
| Best Practices | ≥ **95** |
| SEO | ≥ **95** |

### Stratégies

| Technique | Implementation |
|---|---|
| Code splitting | Automatique via Next.js App Router |
| Prefetch des routes | `<Link prefetch>` sur tous les CTA |
| Images optimisées | Next.js `<Image>` + WebP/AVIF |
| Animations légères | Framer Motion + `prefers-reduced-motion` |
| Pas de lib lourdes | Pas de GSAP, Three.js, ou équivalent |
| CSS | Tailwind CSS purging automatique |

### Motion réduite

```css
@media (prefers-reduced-motion: reduce) {
  /* Désactiver les animations Framer Motion */
  /* Utiliser useReducedMotion() hook de framer-motion */
}
```

```tsx
import { useReducedMotion } from 'framer-motion';

const shouldReduceMotion = useReducedMotion();
// Conditionner les animations selon cette variable
```

---

## 14. Intégration du routage

### Routes principales

Tous les CTA de la landing page pointent vers des **routes réelles** de l'application SmarticketS.

| CTA | Route | Description |
|---|---|---|
| Suivi de colis | `/activate/[id]` | Activation et suivi d'un envoi |
| Espace chauffeur | `/inscrire` | Inscription chauffeur |
| Connexion agence | `/agence/connexion` | Login back-office agence |
| Partenariat | `/devenir-partenaire` | Devenir partenaire SmarticketS |
| Blog | `/blog` | Articles et actualités |
| Contact | `/contact` | Page de contact |

### WhatsApp

```
https://wa.me/221784858226?text=Bonjour%20!%20Je%20souhaite%20en%20savoir%20plus%20sur%20SmarticketS.
```

- Numéro : +221 78 485 82 26
- Message pré-rempli : "Bonjour ! Je souhaite en savoir plus sur SmarticketS."
- Bouton flottant en bas à droite, présent sur toutes les pages

### Composant Link

Toujours utiliser le composant `<Link>` de Next.js pour la navigation interne :

```tsx
import Link from 'next/link';

<Link
  href="/inscrire"
  className="inline-flex items-center gap-2 bg-[#FF6B35] text-white px-6 py-3 rounded-lg font-semibold hover:scale-[1.02] transition-all duration-300 shadow-[0_4px_12px_rgba(255,107,53,0.25)]"
>
  Devenir chauffeur
  <ArrowRight className="w-4 h-4" />
</Link>
```

---

## Quick Reference — Classes courantes

### Bouton CTA Orange

```html
bg-[#FF6B35] text-white px-6 py-3 rounded-lg font-semibold
hover:scale-[1.02] transition-all duration-300
shadow-[0_4px_12px_rgba(255,107,53,0.25)]
hover:shadow-[0_4px_16px_rgba(255,107,53,0.35)]
```

### Bouton CTA Vert

```html
bg-[#10B981] text-white px-6 py-3 rounded-lg font-semibold
hover:scale-[1.02] transition-all duration-300
shadow-[0_4px_12px_rgba(16,185,129,0.25)]
```

### Bouton Outline

```html
border-2 border-[#0A2540] text-[#0A2540] px-6 py-3 rounded-lg font-semibold
hover:bg-[#0A2540] hover:text-white transition-all duration-300
```

### Carte standard

```html
bg-white p-6 sm:p-8 rounded-xl
shadow-[0_4px_24px_rgba(10,37,64,0.04)]
```

### Section wrapper

```html
py-16 sm:py-24 lg:py-32 px-4 sm:px-6 lg:px-8
max-w-6xl mx-auto
```

### Titre de section (H2)

```html
text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#0A2540] mb-12 sm:mb-16
```

---

*Document généré pour l'équipe SmarticketS. Pour toute question ou mise à jour, contacter le lead design.*
