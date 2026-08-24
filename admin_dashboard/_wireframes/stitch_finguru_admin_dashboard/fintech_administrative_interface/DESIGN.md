---
name: Fintech Administrative Interface
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#47464f'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#787680'
  outline-variant: '#c8c5d0'
  surface-tint: '#5b598c'
  primary: '#070235'
  on-primary: '#ffffff'
  primary-container: '#1e1b4b'
  on-primary-container: '#8683ba'
  inverse-primary: '#c4c1fb'
  secondary: '#006b5f'
  on-secondary: '#ffffff'
  secondary-container: '#6df5e1'
  on-secondary-container: '#006f64'
  tertiary: '#140900'
  on-tertiary: '#ffffff'
  tertiary-container: '#331d00'
  on-tertiary-container: '#c07a00'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e3dfff'
  primary-fixed-dim: '#c4c1fb'
  on-primary-fixed: '#181445'
  on-primary-fixed-variant: '#444173'
  secondary-fixed: '#71f8e4'
  secondary-fixed-dim: '#4fdbc8'
  on-secondary-fixed: '#00201c'
  on-secondary-fixed-variant: '#005048'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  title-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  container-max: 1440px
  gutter: 24px
---

## Brand & Style

This design system is engineered for a high-stakes financial environment, prioritizing **security, efficiency, and authoritative clarity**. The aesthetic follows a **Corporate Modern** approach with a focus on data density and high legibility.

The system avoids decorative flourishes in favor of functional precision. It utilizes a refined color palette and systematic white space to reduce cognitive load for administrators managing complex financial workflows. The emotional response is one of reliability and "calm control," ensuring that users feel confident navigating sensitive data and high-value transactions.

## Colors

The palette is anchored by **Deep Indigo (#1E1B4B)** to establish institutional trust. **Warm Teal (#14B8A6)** is reserved strictly for positive financial growth, success states, and primary calls to action. **Amber (#F59E0B)** serves as a high-visibility indicator for pending approvals, risks, or notifications.

The interface utilizes a "layered white" strategy using **#F8FAFC** for the primary background and pure white (#FFFFFF) for interactive cards and surfaces to create subtle contrast. Borders use **#E2E8F0** to define structure without adding visual noise.

## Typography

The design system utilizes **Inter** across all levels to ensure maximum legibility and a systematic, utilitarian feel. 

- **Headlines:** Use tighter letter spacing and semi-bold weights to create a strong visual anchor.
- **Data Points:** Use `body-md` for standard table data. For primary financial figures (balances, totals), use `title-lg` with the Deep Indigo primary color.
- **Labels:** Use uppercase for `label-md` when used in table headers or small metadata tags to differentiate them from body text.

## Layout & Spacing

This design system uses a **fixed-fluid hybrid grid**. On desktop, the main navigation sidebar is fixed (260px), while the content area fluidly expands up to a maximum width of 1440px.

- **Rhythm:** An 8px linear scale governs all padding and margins. 
- **Grid:** A 12-column system is used for dashboard layouts. Widgets typically span 3, 4, 6, or 12 columns.
- **Responsive Behavior:** On tablet, the sidebar collapses into a hamburger menu. On mobile, margins reduce to 16px and all grid columns stack vertically (12-span).

## Elevation & Depth

Depth is achieved through **Tonal Layering** and highly diffused **Ambient Shadows**. 

- **Level 0 (Background):** #F8FAFC.
- **Level 1 (Cards/Surface):** Pure White (#FFFFFF) with a 1px border of #E2E8F0.
- **Level 2 (Hover/Active):** A subtle shadow (0px 4px 6px -1px rgba(0, 0, 0, 0.05)) to indicate interactivity.
- **Level 3 (Modals/Overlays):** A more pronounced shadow (0px 20px 25px -5px rgba(0, 0, 0, 0.1)) to focus attention on critical actions.

Avoid using heavy black shadows or colored glows, as these detract from the professional fintech aesthetic.

## Shapes

The shape language is consistently **Rounded**, striking a balance between modern friendliness and professional structure. 

- **Standard Elements:** Buttons, inputs, and small widgets use a 0.5rem (8px) radius.
- **Large Containers:** Dashboard cards and main content areas use a `rounded-lg` 1rem (16px) radius to soften the high-density data layout.
- **Data Indicators:** Status chips (e.g., "Paid", "Pending") use a `rounded-xl` (24px) pill shape to distinguish them from clickable buttons.

## Components

### Buttons
- **Primary:** Deep Indigo background, white text. No gradient.
- **Success:** Warm Teal background, white text. Used for "Approve" or "Complete."
- **Ghost:** No background, #475569 text, used for secondary navigation or "Cancel" actions.

### Input Fields
- **Default:** White background, 1px #E2E8F0 border.
- **Focus:** 1px #1E1B4B border with a 2px soft Indigo outer glow. 
- **Typography:** Placeholder text in #94A3B8.

### Cards
- **Structure:** Always use a 16px padding. 
- **Header:** Include a subtle 1px bottom border if the card contains a title and an action (like "View All").

### Status Chips
- **Success:** Teal-50 background with Teal-700 text.
- **Warning:** Amber-50 background with Amber-700 text.
- **Neutral:** Gray-100 background with Gray-700 text.

### Data Tables
- Use a "Zebra-stripe" alternative: keep rows white but use a #F8FAFC hover state for the entire row to assist in horizontal scanning of financial figures.