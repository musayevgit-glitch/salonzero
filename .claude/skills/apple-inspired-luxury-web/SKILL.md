---
name: apple-inspired-luxury-web
description: Apply to Salonomia public pages, authentication pages, customer booking flows, dashboards, forms, navigation, responsive layouts, and visual review.
---

# Purpose

Create a modern, luxurious, calm, simple, trustworthy beauty-platform experience.

Use Apple Human Interface Guidelines as inspiration for:

- clarity;
- hierarchy;
- consistency;
- progressive disclosure;
- comfortable spacing;
- direct manipulation;
- immediate feedback;
- accessibility;
- adaptive layouts.

Do not copy Apple pages, branding, proprietary assets, product visuals, or exact component styling.

This is a web application. Follow web conventions and WCAG requirements.

# Visual direction

The interface should feel:

- premium but not flashy;
- feminine without stereotypes;
- minimal but not empty;
- warm and trustworthy;
- clean and operationally efficient;
- consistent across public site and dashboards.

Use:

- generous whitespace;
- strong typography hierarchy;
- subtle borders;
- restrained shadows;
- rounded corners used consistently;
- a limited color system;
- one primary accent;
- calm neutral surfaces;
- high-quality salon photography;
- clear status badges;
- purposeful motion only.

Avoid:

- excessive glassmorphism;
- excessive gradients;
- glowing effects;
- giant empty hero sections;
- tiny low-contrast text;
- crowded cards;
- decorative animations;
- every section being placed in a card;
- multiple competing accent colors;
- generic AI-generated landing-page patterns;
- copying Apple's product page layouts.

# Design-system requirements

Define tokens for:

- colors;
- typography;
- spacing;
- radii;
- shadows;
- borders;
- motion;
- breakpoints;
- z-index;
- content widths.

Do not place unexplained one-off visual values throughout components.

# Typography

Use a modern web-safe or properly licensed web font selected in the design ADR.

Requirements:

- readable body size;
- comfortable line height;
- limited number of font weights;
- responsive heading sizes;
- no important information in uppercase-only text;
- tabular numbers for prices and reports where useful.

# Layout

Design mobile-first.

Required viewports:

- 320px;
- 375px;
- 768px;
- 1024px;
- 1280px;
- 1440px.

Requirements:

- no horizontal overflow;
- stable content widths;
- adaptive sidebars;
- mobile alternatives for wide tables;
- sticky actions only when they do not hide content;
- safe spacing around device edges;
- long Azerbaijani and English strings must not break layouts.

# Interaction

Every interaction must provide:

- hover where appropriate;
- active state;
- visible keyboard focus;
- disabled state;
- loading state;
- success feedback;
- error feedback.

Do not use hover as the only way to access information.

Use motion sparingly:

- fast;
- subtle;
- interruptible;
- respectful of reduced-motion settings.

# Forms

Forms must:

- use persistent visible labels;
- show required/optional state clearly;
- place validation near the field;
- preserve valid user input after recoverable errors;
- show helpful examples only when needed;
- avoid placeholder-only labels;
- group related fields;
- prevent duplicate submission;
- show server and client validation consistently;
- use appropriate autocomplete attributes;
- use input modes suitable for mobile.

# Customer booking flow

The booking flow must:

- show progress;
- keep a visible or collapsible booking summary;
- allow back navigation without losing valid choices;
- show salon, service, stylist, date, time, timezone, duration, and price;
- make "any suitable stylist" easy to select;
- explain pending versus confirmed status;
- handle a lost slot gracefully;
- place authentication after the main selection steps;
- preserve the draft through authentication.

# Dashboard UX

Dashboards must prioritize operational work.

Use:

- actionable summaries;
- clear filters;
- server-side pagination;
- mobile lists instead of compressed desktop tables;
- contextual actions;
- explicit permission-denied states;
- confirmations for destructive actions;
- empty states with a useful next action.

Do not build dashboards as collections of decorative analytics cards.

# Accessibility

Requirements:

- semantic HTML;
- logical headings;
- keyboard navigation;
- visible focus;
- accessible names;
- field-error associations;
- meaningful alt text;
- status announcements where required;
- reasonable WCAG AA contrast;
- color is not the only status signal;
- reduced motion;
- dialogs trap and restore focus correctly;
- touch targets approximately 44px where practical.

# Review output

For each UI implementation report only:

1. information hierarchy;
2. responsive behavior;
3. interaction states;
4. accessibility checks;
5. remaining design risks.

This skill is based on principles, not on imitating an Apple website.
