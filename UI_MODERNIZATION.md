# UI Modernization Recommendations – Edura Notes

This document lists **visual and styling upgrades** that can make the Edura Notes app look and feel more modern. All recommendations are **UI-only**: typography, spacing, colors, shadows, icons, and micro-interactions. **No application logic or behavior changes** are suggested here; for flow, confirmations, toasts, and UX patterns see [UX_RECOMMENDATIONS.md](UX_RECOMMENDATIONS.md).

**How to use:** Pick recommendations by page or by component. Implement in any order. Most changes can be made in [client/src/styles/edura.css](client/src/styles/edura.css) or in the component JSX (class names, inline styles for one-offs). For page structure and routes, see [FRONTEND_DESIGN.md](FRONTEND_DESIGN.md).

**Quick wins** are single variable or class tweaks; **larger polish** items may involve layout or multi-element updates.

---

## Table of contents

1. [Global and theme](#1-global-and-theme)
2. [Layout and shell](#2-layout-and-shell)
3. [Auth pages](#3-auth-pages)
4. [User app pages](#4-user-app-pages)
5. [Explore and public](#5-explore-and-public)
6. [Full-screen note viewers](#6-full-screen-note-viewers)
7. [Admin pages](#7-admin-pages)
8. [Shared components](#8-shared-components)
9. [Quick reference](#9-quick-reference)

---

## 1. Global and theme

**File:** [client/src/styles/edura.css](client/src/styles/edura.css)

- **Typography:** Consider a slightly larger base font size (e.g. 16px) and a type scale (e.g. 1.25 for h2, 1.5 for h1) for clearer hierarchy. The current `--edura-font` (Inter) is fine; optionally add a distinct font for headings (e.g. same stack with different weight or a display font) for a more modern feel.
- **CSS variables:** Add or tune variables for consistent radii (e.g. `--edura-radius-sm: 6px`, `--edura-radius-lg: 12px`) and use them on cards, inputs, and buttons so the app feels cohesive.
- **Shadows:** Slightly soften and elevate card shadows: e.g. `--edura-shadow: 0 1px 3px rgba(0,0,0,0.06)`, `--edura-shadow-hover: 0 8px 24px rgba(0,0,0,0.08)` for a more premium look.
- **Focus states:** Ensure all interactive elements (links, buttons, inputs, selects) have a visible focus ring (e.g. `outline: 2px solid var(--edura-primary); outline-offset: 2px`) for accessibility and a polished feel.
- **Transitions:** Add short transitions (0.15–0.2s) on hover for buttons, nav links, and cards so interactions feel responsive without changing behavior.
- **Dark mode (optional, larger polish):** Define a second set of variables under `[data-theme="dark"]` or `@media (prefers-color-scheme: dark)` (e.g. `--edura-bg`, `--edura-card-bg`, `--edura-text`) so a future dark theme can be toggled via CSS only.

---

## 2. Layout and shell

### Main layout

**File:** [client/src/components/Layout.jsx](client/src/components/Layout.jsx)  
**Styles:** `.edura-header`, `.edura-footer` in [client/src/styles/edura.css](client/src/styles/edura.css)

- **Navbar:** Add a subtle bottom border or slightly stronger shadow to `.edura-header` to separate it from the content. Increase padding for nav links (e.g. `padding: 0.6rem 1rem`) for a more spacious, modern nav.
- **Nav links:** Add a light background or underline on hover (e.g. `background: rgba(37, 99, 235, 0.06)` or a 2px bottom border in `--edura-primary`) so the active hover state is clear.
- **Brand:** Consider a slightly larger brand icon or a small tagline under “Edura Notes” on wider screens for a stronger first impression (layout-only; no new copy required).
- **User avatar/initials:** Give `.nav-user-avatar` and `.nav-user-initials` a thin border (`1px solid var(--edura-border)`) and ensure consistent size (e.g. 32px) for a cleaner look.
- **Sign In / Sign Up buttons:** Use the same border-radius as the rest of the app (`var(--edura-radius)`) and ensure the primary Sign Up button has a bit more emphasis (e.g. slightly larger padding or shadow on hover).
- **Footer:** Add a bit more vertical padding to `.edura-footer` and consider a subtle top border or background gradient so the footer feels distinct. Ensure link hover color is consistent with the rest of the site.

### Admin layout

**File:** [client/src/components/admin/AdminLayout.jsx](client/src/components/admin/AdminLayout.jsx)  
**Styles:** `.admin-sidebar`, `.admin-topbar`, `.admin-main` in [client/src/styles/edura.css](client/src/styles/edura.css)

- **Sidebar:** Add an **active route indicator** (e.g. left border or background highlight) for the current page (Dashboard vs Users). Use `NavLink` with `className`/active class or a data attribute and style `.admin-sidebar-link.active` with a distinct background (e.g. `#333`) and white text.
- **Sidebar brand:** Slightly increase font size or add a small icon next to “Admin” for visual hierarchy.
- **Top bar:** Add a subtle shadow under `.admin-topbar` to separate it from the content. Optionally give the user name a lighter color or smaller font so it doesn’t compete with the title.
- **Logout button:** Style the logout button in `.admin-sidebar-footer` with a consistent border-radius and a hover state (e.g. background change) so it feels like a primary action in the sidebar.

---

## 3. Auth pages

### SignIn

**File:** [client/src/pages/SignIn.jsx](client/src/pages/SignIn.jsx)  
**Classes:** `.edura-auth-page`, `.edura-auth-card`, `.edura-card`

- **Card:** Use a larger border-radius (e.g. 12px) and a slightly stronger shadow (e.g. `box-shadow: 0 4px 20px rgba(0,0,0,0.08)`) on the auth card so it feels like a clear, modern focal point.
- **Tabs:** Replace default Bootstrap nav-tabs styling with pill-style tabs: rounded background for the active tab (e.g. `background: rgba(37, 99, 235, 0.12)`, `color: var(--edura-primary)`) and a neutral background for inactive. Add a smooth transition when switching tabs.
- **Form inputs:** Ensure inputs use `var(--edura-radius)` and the existing focus ring from the theme. Add a bit more padding (e.g. 0.65rem 1rem) for a more comfortable touch target.
- **Error alert:** Style the error alert with a left border in a danger color (e.g. 4px solid) and slightly rounded corners so it stands out without feeling harsh.
- **“Or” divider:** Style the “or” between Google and email with a horizontal line on both sides and muted text for a cleaner separation.
- **Link to Explore:** Give the “Explore public files and profiles” link a muted color and a hover underline or color change so it’s clearly secondary.
- **Larger polish:** Optionally add a small illustration or branded graphic above the card (e.g. in `.edura-auth-page`) to break up the layout and reinforce the product identity.

### AdminLogin

**File:** [client/src/pages/AdminLogin.jsx](client/src/pages/AdminLogin.jsx)  
**Classes:** `.admin-login-page`, `.admin-login-card`

- **Background:** Keep the dark background (`bg-dark`); optionally use a subtle gradient (e.g. dark gray to slightly darker) for depth.
- **Card:** Use the same border-radius as SignIn (e.g. 12px) and a soft shadow so the card feels consistent with the main app. Ensure the card has a light background and enough padding.
- **Error alert:** Use the same visual treatment as SignIn (left border, rounded corners) for consistency.
- **“Back to main site” link:** Style as a text link with a hover state (e.g. underline or lighter color) so it’s visible but secondary to the Google button.
- **Quick win:** Add `border-radius: 12px` and `overflow: hidden` to `.admin-login-card` in [client/src/styles/edura.css](client/src/styles/edura.css) for a consistent look.

---

## 4. User app pages

### Homepage

**File:** [client/src/pages/Homepage.jsx](client/src/pages/Homepage.jsx)  
**Classes:** `.app-with-sidebar`, `.categories-main`, `.edura-section-title`, `.search-bar`, `.edura-card`

- **Welcome heading:** Add a bit more margin below the subtitle (e.g. `mb-4` or 1.5rem) so the section breathes. Optionally use a slightly larger or bolder section title for “Welcome, {name}”.
- **Search bar:** Align the search bar with the Explore page style: use the same border-radius (e.g. pill-style or `var(--edura-radius)`) and ensure the Search and Clear buttons have consistent height and padding. Add a search icon inside the input (left side) for a more modern look (visual only; no behavior change).
- **Toolbar:** Give the row with “Per page”, Sort, and View mode a clear visual grouping (e.g. light background or border-radius) so it reads as one control strip. Use consistent spacing (`gap-3`) and align labels with controls.
- **Section headings:** Use a consistent style for “Uncategorized” and folder names (e.g. `.text-muted.small.text-uppercase`) and add a bit more margin below so note cards don’t feel cramped.
- **Loading state:** Replace or supplement the single spinner with a **skeleton loader** (e.g. placeholder cards with shimmer animation) so the layout is visible sooner. Style only; no change to when data loads.
- **Empty state card:** Increase padding (e.g. `p-5`) and use a slightly larger CTA button. Add a short, friendly illustration or icon above the text for a warmer empty state.
- **Pagination:** Use the same pagination style as Explore (numbered pills or prev/next with clear disabled state) for consistency. Ensure “Showing X–Y of Z” text is aligned and uses muted color.

### Manage

**File:** [client/src/pages/Manage.jsx](client/src/pages/Manage.jsx)  
**Classes:** Same as Homepage plus `.upload-file-section`, `.upload-file-dropzone`, `.edura-card` for storage

- **Storage bar:** Use a larger border-radius (e.g. 8px) for the progress bar and a distinct color when at limit (e.g. progress bar already uses `bg-danger`; ensure the container has padding and a clear label). Add a small icon (e.g. storage/database) next to “Storage” for quick scanning.
- **Upload section:** Give the upload card a clear heading style (icon + “Upload Note”) and ensure the two-column grid (dropzone + form) has consistent gap and alignment. On small screens, ensure the dropzone is full width and the form stacks neatly.
- **Dropzone:** Strengthen the drag-over state: e.g. darker border, slightly stronger background tint (`upload-file-dropzone-dragover`). Add a brief transition (0.2s) on border and background so the drag state feels responsive.
- **Upload form:** Align input and select styles with the rest of the app (radius, focus ring). Give the Visibility radios a bit more spacing and consider a card-like background for the selected option.
- **Toolbar and list:** Use the same toolbar and list/grid styling as Homepage so Manage and Home feel like one app. Ensure the “Clear” button in the search bar is visible when there is input (already present; style for consistency).

### EditNote

**File:** [client/src/pages/EditNote.jsx](client/src/pages/EditNote.jsx)  
**Classes:** `.edura-card`, `.edura-form`, `.edura-section-title`

- **Breadcrumb:** Style the “Manage / Edit note” breadcrumb with a separator (e.g. `/` or chevron) and muted color for the first segment, slightly darker for “Edit note”. Add a bit of margin below so the form card is clearly separated.
- **Form card:** Use the same card radius and shadow as other main cards (e.g. 12px, soft shadow). Add consistent spacing between form groups (`mb-3` or `mb-4`).
- **Labels and inputs:** Use the same `form-label` and `form-control` styling as elsewhere. Ensure the Folder select (FolderTreeSelect) and Visibility select have the same height and radius as text inputs.
- **File replace:** Style the file input area (optional replace) with a light border or dashed border so it’s clear it’s optional. Show “Current file” and “New file” text with muted styling so the user can scan quickly.
- **Action row:** Group Save and Cancel together (e.g. gap-2) and place “Delete note” on the far right with outline-danger. Use consistent button sizes and padding so the row doesn’t look cluttered.
- **Quick win:** Add a top border or background to the breadcrumb nav so it reads as navigation, not body text.

---

## 5. Explore and public

### Explore

**File:** [client/src/pages/Explore.jsx](client/src/pages/Explore.jsx)  
**Classes:** `.explore-hero-*`, `.explore-search-bar`, `.explore-contributor-card`, `.explore-file-card`, `.explore-pagination`

- **Hero:** Increase padding (e.g. `padding: 4rem 1rem 5rem`) and use a slightly larger max-width for the subtitle so the hero feels spacious. Ensure the highlight (“modern learning”) has enough contrast and optional subtle background.
- **Search bar:** Already pill-style; ensure focus state (e.g. `explore-search-bar:focus-within`) has a clear ring and that the filter dropdown and Search button align vertically. Add a transition on border and shadow.
- **Top Contributors cards:** Use consistent card radius (e.g. 12px) and hover shadow. Ensure avatar (image or initials) is centered and has a border or shadow so it doesn’t blend into the card. Style “View Profile” as a clear secondary button (outline or soft fill).
- **Public Files cards:** Keep the icon strip at the top; ensure the strip height and icon size are consistent. Style the “PUBLIC” badge with a consistent color (e.g. green tint) and letter-spacing. Ensure the footer (author + “View” link) is aligned and the “View” link has a hover state.
- **Empty states:** Use the same empty-state pattern as elsewhere: padded card, short message, optional “Clear search” or “Try different filters” button, muted text.
- **Pagination:** Use the existing `.explore-pagination-*` styles; ensure prev/next and number buttons have clear hover and disabled states and that the active page number is visually distinct.

### PublicProfile

**File:** [client/src/pages/PublicProfile.jsx](client/src/pages/PublicProfile.jsx)  
**Classes:** `.edura-card`, `.edura-section-title`, `.search-bar`, shared note card layout

- **Profile header card:** Use a single card with flex layout (avatar + name + subtitle). Give the avatar a border or soft shadow and ensure the name uses `.edura-section-title` (or similar) for hierarchy. Add a bit more padding and a larger radius (e.g. 12px) so the header feels like a clear identity block.
- **Search and toolbar:** Use the same search bar and toolbar (Sort, View mode) styling as Homepage/Manage so profile pages feel consistent with the rest of the app.
- **Note cards:** Reuse the same card style as Manage/Home (`.edura-card`): radius, shadow, hover. Ensure list view has consistent row height and alignment for title, description, and View button.
- **Folder sections:** Use the same section heading style (uppercase, muted) and spacing as Homepage so folder structure is easy to scan.
- **Empty state:** Style “No public notes yet” and “Browse Explore” consistently with other empty states (padding, CTA button, muted text).

---

## 6. Full-screen note viewers

**Files:** [client/src/pages/PublicNoteView.jsx](client/src/pages/PublicNoteView.jsx), [client/src/pages/FullScreenPdfView.jsx](client/src/pages/FullScreenPdfView.jsx), [client/src/pages/admin/AdminNoteView.jsx](client/src/pages/admin/AdminNoteView.jsx)  
**Classes:** `.fullscreen-pdf-wrapper`, `.fullscreen-pdf-bar`, `.fullscreen-pdf-zoom`, `.fullscreen-pdf-loading`

- **Top bar:** Use a consistent height (e.g. 48px or 52px) and padding so the title and controls don’t feel cramped. Ensure the title truncates with an ellipsis and has a tooltip on hover (e.g. `title={note.title}` where applicable).
- **Zoom controls:** Replace the “−” and “+” text with **icon buttons** (e.g. minus/plus SVG icons) for a more modern look. Give the zoom group a clear background (e.g. `.fullscreen-pdf-zoom`) and rounded corners; ensure disabled state is visually distinct (opacity or grayed out).
- **Back / Close button:** Use the same style across all three viewers (e.g. `btn btn-sm btn-outline-light`). Optionally add a left arrow icon for “Back to profile” / “Close” for clarity.
- **Loading screen:** Use the same loading background as the viewer (dark). Optionally add a subtle pulse or skeleton where the content will appear so the wait feels shorter. Keep the spinner; ensure it’s centered and has sufficient contrast.
- **Error screen:** Use a clear message and a single primary button (Home / Back to profile). Add a bit of spacing and ensure the button style matches the rest of the app (e.g. primary fill).
- **AdminNoteView:** Style the “List on Explore” checkbox and label so they align with the zoom and Back button (e.g. flex gap, same vertical alignment). Use a muted color for “Saving...” so it doesn’t distract.

---

## 7. Admin pages

### AdminDashboard

**File:** [client/src/pages/admin/AdminDashboard.jsx](client/src/pages/admin/AdminDashboard.jsx)  
**Classes:** `.admin-page`, `.admin-card`

- **Page title:** Use a slightly larger and bolder “Dashboard” (e.g. `h4` or custom class) and add margin below for separation.
- **Stats cards:** Add a small **icon** (e.g. users, file, storage) in each card next to the label or above the number for quick scanning. Use a consistent icon size and color (e.g. muted or primary).
- **Numbers:** Use a clear typographic hierarchy: larger font (e.g. 2rem or 1.75rem) and bold for the number; keep the label small and uppercase/muted. Add a bit more padding inside each card.
- **View all users:** Style the CTA button with primary fill and hover state; ensure it uses the same radius and padding as other primary buttons in the app.

### AdminUsers

**File:** [client/src/pages/admin/AdminUsers.jsx](client/src/pages/admin/AdminUsers.jsx)  
**Classes:** `.admin-page`, `.admin-card`, `.table`

- **Search bar:** Align with the main app: use a rounded container (e.g. same as Explore search input group), search icon optional, and a clear Search button. Ensure “Users per page” select has the same height and radius as other selects.
- **Table:** Use consistent row hover (e.g. light background) and ensure borders are subtle (e.g. `#e0e0e0`). Add a bit more padding in cells for readability. Ensure “View files” links are styled as buttons (e.g. `btn btn-sm btn-outline-primary`) and have hover state.
- **Empty state:** When there are no users (or no search results), use a centered message and optional “Clear search” button in the same style as other admin empty states.
- **Pagination:** Style prev/next and page info consistently with Homepage/Manage (e.g. same button size and disabled state).

### AdminUserDetail

**File:** [client/src/pages/admin/AdminUserDetail.jsx](client/src/pages/admin/AdminUserDetail.jsx)  
**Classes:** `.admin-page`, `.admin-card`, `.table`, inline modals

- **Breadcrumb:** Style “Users / {name}” with muted first segment and a clear separator; add margin below.
- **User summary card:** Use a single card with name, email, file count, and Delete button. Give the card a clear header area (e.g. name + email) and group the Delete button on the right. Use consistent padding and radius.
- **Explore and Storage cards:** Use the same card style; group the “List profile on Explore” checkbox and the storage limit form in separate cards with a small heading (e.g. h6). Ensure the storage input and Save button align and that success/error message is visible.
- **Files table:** Use the same table styling as AdminUsers. Ensure checkboxes are aligned and the “Delete selected” button is visually distinct (e.g. outline-danger). Style “View” and “Delete” per row consistently.
- **Modals:** Use the same modal styling as ConfirmModal (see Shared components): rounded content, soft shadow, clear header/body/footer. Ensure backdrop is semi-transparent and modal is centered. Avoid inline `style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}` by moving to a class in `edura.css` for consistency.

### AdminNoteView

**File:** [client/src/pages/admin/AdminNoteView.jsx](client/src/pages/admin/AdminNoteView.jsx)

- Apply the same full-screen bar and zoom recommendations as in [Full-screen note viewers](#6-full-screen-note-viewers). Ensure the “List on Explore” checkbox and label don’t crowd the zoom controls; use flex gap and wrap on small widths if needed.

---

## 8. Shared components

### NoteCard

**File:** [client/src/components/NoteCard.jsx](client/src/components/NoteCard.jsx)  
**Classes:** `.edura-card`, `.card-title`, `.card-text`

- **Grid card:** Use consistent padding (e.g. `p-3`) and ensure the card has the same radius and hover lift as other `.edura-card` instances. Give the title a single-line truncation and the description a two-line clamp with muted color.
- **Button group:** Keep View, Edit, Delete in a row with small gap; use `btn-sm` and outline variants. Ensure Delete (outline-danger) has a hover state. Optionally use icon-only or icon+text for a denser look on small screens.
- **List row:** Ensure the list layout has consistent vertical alignment (title, optional filename, folder badge, description, buttons). Use flex and `min-w-0` so long text truncates. Add a subtle bottom border or spacing between rows if multiple cards are stacked.
- **Visibility select:** When shown, style the select to match other small selects (radius, height) and place it so it doesn’t break the row alignment.

### FolderList

**File:** [client/src/components/FolderList.jsx](client/src/components/FolderList.jsx)  
**Classes:** `.folders-categories`, `.folder-list-item`, `.folder-chevron`, `.folder-icon`

- **Categories title:** Use the same underline accent (`.folders-categories-underline::before`) and ensure the title and hint text are readable. Add a bit more margin below the underline.
- **Folder rows:** Ensure selected state (`.folder-list-item.selected`) has a clear background and text color (e.g. primary). Add a smooth transition on background and color. Indentation for depth (e.g. `.folder-depth-1`, `.folder-depth-2`) should be consistent and easy to scan.
- **Chevrons:** Use the same size and color as in the theme; ensure hover state is clear. Optionally use SVG icons instead of “▶”/“▼” for a sharper look.
- **Add folder form:** Style the input and parent select with the same radius and border as other form controls. Place the “Add Folder” button with consistent margin and use the primary button style (e.g. `btn-edura`).

### ViewModeToggle

**File:** [client/src/components/ViewModeToggle.jsx](client/src/components/ViewModeToggle.jsx)

- **Quick win:** Use the same border-radius as other button groups (e.g. `var(--edura-radius)` or 8px) so the toggle doesn’t look boxy. Ensure the active button (Grid or List) has a clear filled state and the inactive has an outline.
- **Larger polish:** Replace text with **icons** (e.g. grid and list SVGs) or icon+text for a more compact, modern control. Keep the same `aria-label` and `aria-pressed` for accessibility.

### SortBySelect

**File:** [client/src/components/SortBySelect.jsx](client/src/components/SortBySelect.jsx)

- **Quick win:** Give the select the same height and border-radius as other small selects (e.g. `form-select-sm` with `border-radius: var(--edura-radius)`). Ensure the label is aligned vertically with the select and uses muted color.
- Use the same `minWidth` or `width: auto` so the select doesn’t jump when the selected option changes.

### ConfirmModal

**File:** [client/src/components/ConfirmModal.jsx](client/src/components/ConfirmModal.jsx)

- **Backdrop:** Use a single class (e.g. `.modal-backdrop-custom`) in `edura.css` with `background-color: rgba(0,0,0,0.5)` and optional blur for a modern overlay. Avoid inline styles for the backdrop so it can be reused.
- **Modal content:** Use a larger border-radius (e.g. 12px) and a soft shadow (e.g. `box-shadow: 0 8px 32px rgba(0,0,0,0.12)`) so the modal feels elevated. Ensure header has a clear title style and the close button is aligned.
- **Footer:** Use consistent spacing between Cancel and Confirm buttons; ensure the danger variant (Confirm) has a clear hover state. Add a focus ring on the close and primary action buttons for keyboard users.

---

## 9. Quick reference

| Page or component        | Primary file(s)                                      | Main CSS classes / notes                                      |
|--------------------------|------------------------------------------------------|---------------------------------------------------------------|
| Global theme             | `client/src/styles/edura.css`                        | `:root` variables, `body`, focus/transitions                  |
| Main layout              | `client/src/components/Layout.jsx`                  | `.edura-header`, `.edura-footer`, `.navbar-*`                  |
| Admin layout             | `client/src/components/admin/AdminLayout.jsx`       | `.admin-sidebar`, `.admin-topbar`, `.admin-main`              |
| SignIn                   | `client/src/pages/SignIn.jsx`                        | `.edura-auth-page`, `.edura-auth-card`, `.edura-card`         |
| AdminLogin               | `client/src/pages/AdminLogin.jsx`                    | `.admin-login-page`, `.admin-login-card`                     |
| Homepage                 | `client/src/pages/Homepage.jsx`                     | `.app-with-sidebar`, `.categories-main`, `.search-bar`       |
| Manage                   | `client/src/pages/Manage.jsx`                        | Same as Homepage + `.upload-file-section`, `.upload-file-dropzone` |
| EditNote                 | `client/src/pages/EditNote.jsx`                     | `.edura-card`, `.edura-form`                                  |
| Explore                  | `client/src/pages/Explore.jsx`                      | `.explore-hero-*`, `.explore-search-bar`, `.explore-*`       |
| PublicProfile            | `client/src/pages/PublicProfile.jsx`                | `.edura-card`, `.edura-section-title`, `.search-bar`          |
| PublicNoteView           | `client/src/pages/PublicNoteView.jsx`               | `.fullscreen-pdf-*`, `.secure-note-viewer`                    |
| FullScreenPdfView        | `client/src/pages/FullScreenPdfView.jsx`            | Same as PublicNoteView                                       |
| AdminDashboard           | `client/src/pages/admin/AdminDashboard.jsx`          | `.admin-page`, `.admin-card`                                 |
| AdminUsers               | `client/src/pages/admin/AdminUsers.jsx`             | `.admin-page`, `.admin-card`, `.table`                        |
| AdminUserDetail          | `client/src/pages/admin/AdminUserDetail.jsx`        | `.admin-page`, `.admin-card`, `.table`, modal classes         |
| AdminNoteView            | `client/src/pages/admin/AdminNoteView.jsx`           | `.fullscreen-pdf-*`                                           |
| NoteCard                 | `client/src/components/NoteCard.jsx`                | `.edura-card`, `.card-title`, `.card-text`                   |
| FolderList               | `client/src/components/FolderList.jsx`               | `.folders-categories`, `.folder-list-item`, `.folder-*`       |
| ViewModeToggle           | `client/src/components/ViewModeToggle.jsx`          | `.btn-group`, `.btn-primary`, `.btn-outline-primary`          |
| SortBySelect             | `client/src/components/SortBySelect.jsx`             | `.form-select`, `.form-label`                                |
| ConfirmModal             | `client/src/components/ConfirmModal.jsx`            | Bootstrap `.modal`, `.modal-dialog`, `.modal-content`         |

Use this table to locate the right file and class names when implementing a recommendation. For route and feature context, see [FRONTEND_DESIGN.md](FRONTEND_DESIGN.md).
