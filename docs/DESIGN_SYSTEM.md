# Design system

## Direction

A calm editorial workbench: dark forest navigation, warm near-white workspace, restrained green for actionable states, and small diagrammatic details. The intent is to make complex evidence readable without visual noise.

12ui draft generation was attempted during this build but returned `403 missing_scope`. No generated 12ui design assets are used. The interface was designed directly in React/CSS.

## Tokens

| Role | Value |
|---|---|
| Sidebar / deep ink | `#182f29` |
| Canvas | `#f6f7f4` |
| Surface | `#ffffff` |
| Body text | `#25312e` |
| Muted text | `#65705f` |
| Primary button | `#28583f` |
| Active navigation | `#c7e2bd` |
| Border | `#e2e7df` |
| Focus ring | `#5e9e82` |

Green communicates explicit relationships or accepted work. Amber communicates uncertainty or staleness. Text and icons carry the meaning alongside color.

## Typography and icons

- **Manrope Variable:** headings and brand; restrained negative tracking.
- **Inter Variable:** controls and readable product copy.
- **IBM Plex Mono:** requirement identifiers and version references.
- **Lucide:** consistent outlined interface icons. Decorative icons accompany text; icon-only controls have accessible names.

Latin font assets are served locally from npm packages, eliminating external font requests. Font packages retain their upstream licenses in installed dependencies. The UI uses CSS fallbacks for characters outside the packaged subset.

## Layout and components

Fixed desktop sidebar, top breadcrumb bar, project selector, and bounded main column. Overview uses four metrics, a change card, a dependency diagram, and a compact requirement table. Change review uses an explicit before/after panel, evidence cards, and a contextual help column.

Surfaces use 6–8px corners, one-pixel borders, and minimal shadows. The dependency map is generated from actual saved relationships. The screenshot/demo content is explicitly fictional, never claimed as customer usage.

Responsive breakpoints: 1150, 950, and 700px. On phones the sidebar becomes a dismissible drawer, metric cards become two columns, comparisons stack, and evidence cards occupy full width. Wide data tables scroll inside their own container.

## Accessibility

Native buttons, inputs, selects, tables, and dialog elements preserve semantics. Dialogs use the browser's modal focus behavior and Escape dismissal. Focus-visible outlines and a skip link support keyboard navigation. Loading, success, and error states are announced where relevant. Motion respects `prefers-reduced-motion`.

Automated checks cover WCAG A/AA rules available to Axe for selected states. They do not replace a full assistive-technology audit. See VALIDATION.md for actual checks.
