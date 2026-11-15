# VillaCorz Admin Interface

## Direction

A calm, operational ledger for hospitality administrators: prioritize reservations,
guest actions, revenue, and offer performance without competing visual chrome.
The interface should feel precise and composed, with hierarchy carried by type,
spacing, and restrained structure.

## Palette and depth

- Surfaces: white and neutral page canvas; no tinted or gradient cards.
- Text: slate/ink hierarchy.
- Accent: VillaCorz blue `#006dfc`, reserved for primary actions, focus, and links.
- State: emerald, rose, and amber only for meaningful deltas or statuses.
- Boundaries: `rgba(0,0,0,0.06)`; cards use a whisper shadow rather than heavy elevation.
- Status in tables uses a small dot and text, not a colored pill.

## Density and hierarchy

- Spacing base: 4px; dense table rows use 8px vertical padding; sections separate
  by 32px where practical.
- Labels: uppercase, 9–10px, semibold, `0.18em` tracking.
- Dynamic numeric values: tabular numerals; mono type for compact metrics and
  ledger values.
- Each admin page has one dominant metric in serif display type (`text-5xl`,
  bold); related KPIs sit below in a compact monochrome strip, not equal-weight cards.
- Keep focus rings and interactive hit areas at or above 44px.

## Shared patterns

- `AdminPageHeader`: breadcrumb eyebrow, serif page title, brief subtitle, one
  optional dominant metric and a contextual action.
- `AdminStatStrip`: compact, monochrome secondary metrics; use semantic colors
  only for deltas. KPI links should retain relevant filters in their destination.
- `AdminCard`: rounded-2xl white surface, subtle boundary, whisper shadow.
- `AdminEmptyState`: circular neutral icon treatment, serif heading, supporting
  copy, and a clear primary action.
- `AdminFilterPills`: keyboard-focusable filter controls with selected state
  communicated without colored card fills.
- `AdminTable`: semantic, keyboard-operable ledger with tabular numeric columns,
  quiet hover rows, status dots, and a mobile card alternative where needed.

## Domain signature

Lead with the action an administrator needs to take next—pending cancellations,
unpublished reviews, contact messages, and expired payments—then connect the
financial summary to its underlying ledger. The dashboard's action center and
date-preserving KPI drill-downs are the signature pattern for this hospitality
workflow.
