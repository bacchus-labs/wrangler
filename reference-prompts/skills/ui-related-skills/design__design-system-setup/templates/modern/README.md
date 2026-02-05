# Modern Design System Template

A comprehensive, professional design system with full color scales, multiple typography options, and an extensive component library.

## Overview

The Modern template provides a complete design foundation suitable for enterprise applications, SaaS products, and professional web applications. It emphasizes consistency, accessibility, and scalability.

## What's Included

### Color System
- **Primary Scale**: 9 shades of blue (50-900)
- **Secondary Scale**: 9 shades of purple (50-900)
- **Neutral Scale**: 11 shades from white to black
- **Semantic Colors**: Full scales for success (green), warning (amber), error (red), info (blue)

### Typography
- **Font Families**:
  - Display: Inter (headings, UI elements)
  - Body: Inter (paragraphs, content)
  - Code: JetBrains Mono (code blocks, technical content)
- **Font Sizes**: 9 sizes from xs (12px) to 4xl (48px)
- **Font Weights**: 5 weights (light, regular, medium, semibold, bold)
- **Line Heights**: 5 options (tight, snug, normal, relaxed, loose)

### Spacing System
- **12-step scale**: From 1px to 128px
- Consistent increments for layout harmony
- Based on 4px baseline grid

### Border Radius
- **5 options**: none, sm (2px), md (6px), lg (12px), full (9999px)
- Suitable for various component styles

### Shadows
- **5 levels**: xs, sm, md, lg, xl
- Layered depth system for UI hierarchy

### Components (20+)
- **Buttons**: Primary, Secondary, Ghost, Outline, Destructive variants
- **Inputs**: Default, Error, Disabled states
- **Cards**: Default, Bordered, Elevated variants
- **Badges**: Success, Warning, Error, Info variants
- **Alerts**: Success, Warning, Error, Info variants
- **Tooltips**: Dark and light variants
- **Modals**: Standard modal structure
- **Navigation**: Navbar component
- **Tabs**: Tab navigation component
- **Checkboxes & Radio Buttons**: Form controls
- **Select Dropdowns**: Styled select elements
- **Progress Bars**: Linear progress indicators
- **Avatars**: User avatar components
- **Breadcrumbs**: Navigation breadcrumbs
- **Pagination**: Page navigation
- **Tables**: Data table styling
- **Dropdowns**: Menu dropdowns
- **Switches**: Toggle switches
- **Chips**: Tag/chip components
- **Dividers**: Section dividers

## Design Principles

1. **Consistency**: Every component follows the same token system
2. **Accessibility**: WCAG AA compliant color contrasts
3. **Scalability**: Token-based architecture allows easy theming
4. **Professional**: Clean, modern aesthetic suitable for business applications
5. **Comprehensive**: Complete component coverage for most UI needs

## Usage

This template is ideal for:
- Enterprise applications
- SaaS products
- Admin dashboards
- Professional web applications
- Multi-page websites requiring consistency

## Customization

All tokens are defined in `tokens.json` and can be easily customized. The component definitions in `components.json` reference these tokens, so changing a token value will update all components that use it.

## Figma Integration

Import `figma-template.json` into Figma using the Tokens Studio plugin to create:
- Color styles for all shades
- Text styles for all typography combinations
- Effect styles for all shadows
- Component variants matching the design system
