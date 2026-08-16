# Edura Notes — UI Modernization Upgrade Plan

> A comprehensive, page-by-page guide to modernize every screen in the Edura Notes application.
> **No logic or backend changes required** — all upgrades are purely visual (CSS/JSX structure).

---

## Table of Contents

1. [Global Design System](#1-global-design-system)
2. [Layout — Header & Footer](#2-layout--header--footer)
3. [Sign In / Sign Up Page](#3-sign-in--sign-up-page)
4. [Admin Login Page](#4-admin-login-page)
5. [Explore Page](#5-explore-page)
6. [Homepage (Dashboard)](#6-homepage-dashboard)
7. [Manage Page](#7-manage-page)
8. [Edit Note Page](#8-edit-note-page)
9. [Public Profile Page](#9-public-profile-page)
10. [Document Viewers (FullScreenPdfView, PublicNoteView, AdminNoteView)](#10-document-viewers)
11. [Admin Dashboard](#11-admin-dashboard)
12. [Admin Users List](#12-admin-users-list)
13. [Admin User Detail](#13-admin-user-detail)
14. [Shared Components](#14-shared-components)
15. [Animations & Micro-Interactions](#15-animations--micro-interactions)

---

## 1. Global Design System

### 1.1 Typography

| Current | Upgrade |
|---|---|
| `Inter` for everything | Keep `Inter` for body. Use **Plus Jakarta Sans** (weight 700–800) for all headings (`h1`–`h3`). Import via Google Fonts. |
| `h1: 1.5rem`, `h2: 1.25rem` | Bump to `h1: 2rem`, `h2: 1.5rem` for stronger page hierarchy. |
| Muted text at `#6b7280` | Lighten slightly to `#94a3b8` for better contrast ratio on white backgrounds. |

### 1.2 Color Palette

| Token | Current | Upgrade |
|---|---|---|
| `--edura-primary` | `#2563eb` (flat) | CSS gradient: `linear-gradient(135deg, #3b82f6, #1d4ed8)` on buttons; keep `#2563eb` for text links. |
| `--edura-bg` | `#f9fafb` | `#f8fafc` (slightly cooler, Tailwind Slate-50) |
| `--edura-shadow` | `0 1px 3px rgba(0,0,0,0.06)` | Tinted shadow: `0 4px 14px -2px rgba(37,99,235,0.08)` |
| `--edura-shadow-hover` | `0 8px 24px rgba(0,0,0,0.08)` | `0 12px 32px -4px rgba(37,99,235,0.12)` |
| `--edura-radius` | `8px` | `14px` for cards, `10px` for buttons/inputs |
| `--edura-radius-lg` | `12px` | `20px` |
| Dark mode vars | Basic grays | Deep OLED: `--edura-bg: #0a0f1a`, `--edura-card-bg: #111827`, `--edura-border: #1e293b` |

### 1.3 Glassmorphism

- Add a new utility class `.glass` with `backdrop-filter: blur(12px); background: rgba(255,255,255,0.72); border: 1px solid rgba(255,255,255,0.18);`
- Apply to: sticky header, floating toolbars, dropdown menus, modal backdrops.

### 1.4 Icons

- **Current:** Inline `<svg>` with varying styles/weights across pages.
- **Upgrade:** Adopt a single icon library — **Lucide React** (`lucide-react`). Consistent 1.5px stroke, 24×24 grid. Replace every inline SVG with the corresponding Lucide component.

---

## 2. Layout — Header & Footer

### Header (`Layout.jsx` — lines 14–98)

| Area | Current | Upgrade |
|---|---|---|
| Position | Static at top | `position: sticky; top: 0; z-index: 100` with `.glass` effect. Border-bottom appears only after scrolling (JS: add class `scrolled` on `window.scrollY > 10`). |
| Brand logo | Plain SVG + text | Add subtle color transition on hover. Enlarge icon to `32×32`. |
| Nav links | Background-color swap on active | Animated sliding pill: a `::after` pseudo-element that slides behind the active link with `transition: left 0.3s, width 0.3s`. |
| User avatar section | Avatar + name stacked inline | Wrap in a **popover dropdown** (click to open). Show user name, email, "My Profile" link, and "Sign Out" button inside a floating `.glass` card. |
| Sign In / Sign Up buttons | Standard Bootstrap outline/primary | Pill-shaped (`border-radius: 9999px`). Sign Up gets the gradient background. |
| Mobile toggler | Bootstrap default | Use a modern hamburger animation (three lines → X on open). |

### Footer (`Layout.jsx` — lines 102–129)

| Area | Current | Upgrade |
|---|---|---|
| Background | Dark gradient `#0f172a → #111827` | Keep, but add a subtle top-border glow: `box-shadow: 0 -1px 20px rgba(37,99,235,0.05)` inset. |
| Links | Plain `<a>` tags | Add hover underline animation (slide-in from left). |
| Layout | 3-column `row g-4` | Add a 4th column for social icons (GitHub, LinkedIn, Twitter) using Lucide icons. |
| Copyright | Thin `border-top` | Add Edura logo (small, white, inline) before the copyright text. |

---

## 3. Sign In / Sign Up Page

**File:** `SignIn.jsx` (265 lines) — currently a centered card on neutral background.

| Area | Current | Upgrade |
|---|---|---|
| **Layout** | Single centered card | **Split-screen**: Left 50% = auth form on white. Right 50% = full-height gradient panel (`linear-gradient(135deg, #1d4ed8, #7c3aed)`) with abstract SVG shapes or a floating 3D book illustration. Responsive: collapses to full-width card on mobile. |
| **Title** | "Sign in / Sign up" plain `h2` | Larger, bolder display heading. Add a small animated wave emoji 👋 or greeting text. |
| **Tab switcher** | Pill-style tabs (good) | Add a sliding background indicator that smoothly transitions between Sign In and Sign Up with `transition: transform 0.3s`. |
| **Input fields** | Standard `form-control` | Floating labels (label animates from placeholder position to top-left on focus/filled). Add left-side icons (Mail, Lock, User) inside input via `padding-left` + absolutely positioned icon. |
| **Google button** | Raw Google SDK render | Wrap in a styled container matching the app's pill-button style. |
| **Error alerts** | Bootstrap `alert-danger` | Slide-down animation with left red border (partially done: `.edura-auth-error`). Add shake micro-animation on error. |
| **"Explore" link** | Plain text link at bottom | Style as a subtle banner with an arrow icon → "Browse public notes without signing in →" |
| **Social proof** | None | Add a small "Trusted by X students" or animated counter near the form. |

---

## 4. Admin Login Page

**File:** `AdminLogin.jsx` (97 lines) — full-screen dark background, centered white card.

| Area | Current | Upgrade |
|---|---|---|
| Background | Plain dark gradient | Add subtle animated grid dots or a radial spotlight effect centered behind the card. |
| Card | Standard Bootstrap `.card shadow-lg` | Use `.glass` effect over the dark background. Increase `border-radius` to `20px`. |
| Title | Plain "Admin Login" | Add a shield icon (🛡️ or Lucide `Shield`) next to the title. |
| Error alert | Bootstrap alert | Same shake animation as main SignIn. |
| "Back to main site" link | Muted small text | Arrow-left icon + text, hover underline slide animation. |

---

## 5. Explore Page

**File:** `Explore.jsx` (391 lines) — hero + search + contributors grid + notes grid.

### Hero Section (lines 120–129)

| Current | Upgrade |
|---|---|
| Light gradient background `rgba(37,99,235,0.06)` | **Animated mesh gradient** using CSS `@property` and keyframes (shifting between blue/purple/indigo). Alternatively, a subtle particle canvas effect. |
| Static title text | Add CSS `text-shadow` glow. Animate the "modern learning" highlight with a gradient text color shift (CSS `background-clip: text` with animated gradient). |
| Subtitle below title | Add a small animated "scroll down" chevron at the bottom of the hero. |

### Search Bar (lines 136–173)

| Current | Upgrade |
|---|---|
| Pill-shaped bar (good foundation) | Enlarge to `min-height: 56px`. Add a soft **pulsating glow** ring on `:focus-within` (keyframe between `box-shadow: 0 0 0 4px` and `0 0 0 8px`). |
| Filter dropdown inside bar | Replace with segmented pill toggle buttons (All | Profiles | Notes) sitting just below the bar. |
| "Search" button inside bar | Use a gradient background matching primary. Add search icon inside the button. |

### Top Contributors Section (lines 176–261)

| Current | Upgrade |
|---|---|
| Static 4-column grid | **Horizontal scroll carousel** with snap-scroll (`overflow-x: auto; scroll-snap-type: x mandatory`). Add left/right arrow navigation overlays. |
| Contributor cards (avatar + name + button) | Add a subtle gradient border ring around avatars (CSS `border-image` or `outline`). On hover, scale avatar up 5% and add glow. |
| "View Profile" button | Pill-shaped, add right-arrow icon on hover (slide in from right). |
| Pagination below | Replace numbered pagination with infinite scroll or "Load more" button for a smoother experience. |

### Public Files Section (lines 264–387)

| Current | Upgrade |
|---|---|
| File cards with icon strip (128px gray) | Replace gray strip with a **gradient strip** that varies by file type (blue for PDF, green for images). Add a subtle animated shimmer on load. |
| "PUBLIC" badge | Make pill-shaped with `border-radius: 9999px`. Add a tiny dot indicator (green pulsing dot). |
| File card hover | Currently increases shadow — add `transform: translateY(-4px)` and smooth transition. |
| Author avatar at bottom | Add a tooltip showing full author name on hover. |
| "View →" link | Make it a full-width bottom bar that appears on hover (slides up from bottom of card). |
| Pagination | Keep numbered, but style as sleek rounded pills with gradient active state. |

---

## 6. Homepage (Dashboard)

**File:** `Homepage.jsx` (365 lines) — sidebar + main content area.

### Welcome Area (lines 147–150)

| Current | Upgrade |
|---|---|
| Plain "Welcome, {name}" `h1` | Add a personalized greeting based on time ("Good morning/afternoon/evening, {name}"). Add a subtle wave animation next to the name. |
| Subtitle text | Show quick stats inline: "You have X notes in Y folders". |

### Search Bar (lines 152–191)

| Current | Upgrade |
|---|---|
| `max-width: 400px` input group | Full-width search bar (up to `600px`). Add search icon inside with left padding. |
| Clear button separate | Integrate clear (×) as an icon inside the input, appearing only when text is present. |

### Toolbar Strip (lines 193–221)

| Current | Upgrade |
|---|---|
| Background `var(--edura-bg)` with border | Use `.glass` backdrop effect for a floating feel. |
| View mode toggle (Grid/List text buttons) | **Segmented control** with a sliding pill indicator behind the active option (iOS-style). Replace text with Grid icon (⊞) and List icon (☰). |
| Sort select & Per page select | Style as sleek mini pill-dropdowns. |

### Notes Grid/List (lines 230–358)

| Current | Upgrade |
|---|---|
| Section headings ("Uncategorized", folder names) — uppercase muted small text | Add a small colored dot (matching folder color if available) before each heading. Add a thin accent line below. |
| Empty state — plain text | Add an illustrated SVG (empty folder / floating papers) with muted colors. Animate it with a gentle float (translateY keyframe). |
| Pagination (Previous/Next buttons) | Add page number pills between Previous/Next. Highlight active page. |

---

## 7. Manage Page

**File:** `Manage.jsx` (622 lines) — sidebar + upload form + notes grid.

### Storage Card (lines 254–281)

| Current | Upgrade |
|---|---|
| Flat progress bar, 10px height | **Rounded gradient progress bar** (blue → purple gradient fill). Animate the width on page load with CSS transition. Height → 12px. |
| Text "X MB / Y MB used" | Show as a circular radial gauge (donut chart) alongside the bar for visual emphasis. |
| Storage limit warning | Add an animated ⚠️ pulse icon. |

### Upload Section (lines 288–413)

| Current | Upgrade |
|---|---|
| Dashed border dropzone (`2px dashed`) | Upgrade to an animated dashed border (CSS `stroke-dasharray` animation or `background-image` repeating gradient trick). |
| Dropzone icon | Animate the cloud-upload icon: on idle, gentle float; on drag-over, the arrow animates upward. |
| Drag-over state | `border-width: 3px` only → Add `transform: scale(1.01)`, a pulsating glow ring, and the background shifts to a stronger blue tint. |
| File selected text | Show a mini file preview card (file icon + name + size) instead of plain text. Add a remove (×) button. |
| Title/Folder/Visibility fields | Use floating labels. Group Visibility as a toggle switch instead of radio buttons. |
| Upload & Clear buttons | Make "Upload" a gradient pill button with upload icon. "Clear" as a ghost button. Add a loading spinner inside the Upload button while submitting. |

### Notes Grid (same as Homepage)

- Apply all Homepage grid upgrades here too.

---

## 8. Edit Note Page

**File:** `EditNote.jsx` (244 lines) — breadcrumb + form card.

| Area | Current | Upgrade |
|---|---|---|
| Breadcrumb | Plain text with `/` separator | Styled breadcrumb with chevron `›` separators and hover highlight. Each segment gets a subtle rounded background on hover. |
| Form card | `edura-card-lg p-4` | Add a semi-transparent left-side accent bar (4px wide, gradient blue). |
| Inputs | Standard `form-control` | Floating labels with focus animations. |
| Visibility dropdown | Basic `<select>` | Replace with a toggle switch: "Private 🔒 ↔ Public 🌐". |
| File replace input | Basic HTML `file` input | Style as a mini dropzone (similar to Manage upload area but compact). Show current file as a chip with file icon. |
| Action buttons row | Horizontal button group | Right-align "Delete note" as a red ghost button. Make "Save Changes" gradient primary and "Cancel" outline. Add spacing divider between save/cancel and delete. |
| Delete confirmation modal | Reuses `ConfirmModal` | Apply modal upgrades from §14. |

---

## 9. Public Profile Page

**File:** `PublicProfile.jsx` (260 lines) — profile header + notes organized by folder.

| Area | Current | Upgrade |
|---|---|---|
| Profile header card | Flat card with avatar + name inline | **Hero banner**: Full-width gradient strip (subtle blue-to-purple) behind the profile info. Larger avatar (`80px`), centered with a white ring border. Name as bold display text. Add a "📝 X public notes" stat badge. |
| Avatar fallback | Colored circle with initials | Gradient background circle (blue → purple) with animated ring on hover. |
| Search bar | Same as Homepage | Apply same upgrades. |
| Toolbar (Sort/View) | Same as Homepage | Apply same upgrades. |
| Note cards | `edura-card p-3` with View button | Apply NoteCard upgrades from §14. |
| Folder section headings | `text-muted small text-uppercase` | Match homepage heading style with dot + accent line. |
| Empty state | Plain "No public notes yet." | Add an illustrated SVG and a CTA button "Check back later" or "Explore other profiles →". |

---

## 10. Document Viewers

**Files:** `FullScreenPdfView.jsx`, `PublicNoteView.jsx`, `AdminNoteView.jsx` — all share the same structure: fixed full-screen overlay with top bar + content area.

| Area | Current | Upgrade |
|---|---|---|
| Top bar | `#111` solid background | `.glass` effect with `backdrop-filter: blur(16px)` over `rgba(0,0,0,0.7)`. |
| Title text | Plain white truncated text | Add a subtle background pill behind the title for better readability. |
| Zoom controls | `#222` background box with `+`/`−` buttons | Redesign as a floating pill in the **bottom-center** of the screen (like a media player control). Add a "Fit to width" reset button. |
| Close/Back button | `btn-outline-light` | Circular icon-only button (×) positioned at top-right corner. Tooltip on hover. |
| Background | `#1a1a1a` solid | Very dark blue-gray `#0c111d` for a more premium theater feel. |
| Loading state | Full-screen spinner | Skeleton placeholder matching document shape. |
| **Theater mode (new)** | N/A | Auto-hide the top bar after 3 seconds of mouse inactivity. Show on mouse movement. CSS: `transition: opacity 0.4s; opacity: 0` when hidden. |
| AdminNoteView — "List on Explore" checkbox | Inline in the top bar | Move into a small floating settings popover (gear icon on bar → opens popup). |

---

## 11. Admin Dashboard

**File:** `AdminDashboard.jsx` (85 lines) — 3 stat cards + "View all users" button.

| Area | Current | Upgrade |
|---|---|---|
| Stat cards | Plain `card` with muted label + large number | Each card gets a unique left-border accent color (Users = blue, Notes = green, Storage = amber). Add a subtle related icon (Users, FileText, HardDrive from Lucide) in the top-right corner with 20% opacity. |
| Numbers | Plain `h3` | **Animated count-up** on page load (JS: animate from 0 to the actual number over 1 second). |
| Layout | 3-column grid | Add a quick-action bar below: "Recent activity" list or a mini chart (sparkline) showing uploads over time. |
| "View all users" button | Standard primary button | Gradient pill with right-arrow icon. |

---

## 12. Admin Users List

**File:** `AdminUsers.jsx` (191 lines) — search + table + pagination.

| Area | Current | Upgrade |
|---|---|---|
| Table | Bootstrap `table-hover table-striped` | Custom table design: remove stripes, add subtle row dividers (`border-bottom: 1px solid var(--edura-border)`). Round the table card corners. Header row with bold text and a very light blue-gray background. |
| Row hover | Bootstrap default | Smooth highlight: `background: rgba(37,99,235,0.03)` with `transition: background 0.2s`. |
| "View files" action button | `btn-outline-primary` | Icon-only button (Eye icon) with tooltip "View files". Reduces visual clutter. |
| Storage column | Plain text "X MB / Y MB" | Mini inline progress bar (thin, 4px height) below the text. |
| Search input | Basic Bootstrap input-group | Style to match the Explore search bar (pill-shaped, icon inside). |
| Pagination | Previous/Next text buttons | Match Explore pagination style (numbered pills). |

---

## 13. Admin User Detail

**File:** `AdminUserDetail.jsx` (505 lines) — breadcrumb + user card + explore toggle + storage limit + file table.

| Area | Current | Upgrade |
|---|---|---|
| User info card | Plain card with name + email + "Delete user" button | Add user avatar (fetched or initials). Gradient accent bar at the top of the card. Stats row: Notes count, Storage used, Member since — as mini stat chips. |
| "Delete user" button | Red `btn-danger` in the header | Move to a dropdown menu (⋮ More actions → Delete user). Prevents accidental clicks. |
| Explore toggle card | Checkbox + label | Redesign as a toggle switch with "Listed on Explore" label and a green/gray state. |
| Storage limit card | Input + Save button inline | Add a visual gauge (same style as Manage storage bar). Make the input field wider and add "MB" suffix label. |
| File table | Same as Admin Users table | Apply same table modernization. Add mini file-type icon (PDF icon / Image icon) in a new first column. |
| Bulk actions | "Delete selected (N)" button appears when items selected | Show a floating action bar at the bottom of the page when items are selected (sticky, with glass effect). Include count and Delete button. |
| Delete modals | Raw `<div className="modal">` with inline styles | Replace with the reusable `ConfirmModal` component. Apply modal upgrades from §14. |

---

## 14. Shared Components

### NoteCard (`NoteCard.jsx` — 184 lines)

| Area | Current | Upgrade |
|---|---|---|
| Grid card | `edura-card p-3` with title + description + action buttons | Add a **narrow color strip** at the top (4px, colored by file type). |
| Card hover | `translateY(-2px)` + shadow (good) | Increase lift to `-4px`. Add a subtle border-color shift to primary on hover. |
| Action buttons (View/Edit/Delete) | Always visible | **Overlay on hover**: buttons appear in a semi-transparent bottom bar that slides up. In idle state, only show a mini "⋮" icon in the top-right. |
| Description | Truncated to 80 chars | Use CSS `-webkit-line-clamp: 2` (already done in CSS). Add a tooltip showing full description. |
| Folder badge | `badge bg-light text-dark` | Pill-shaped with translucent colored background matching the folder theme. |
| List mode | Basic horizontal row | Add a slight left-border accent (2px, blue) on hover. Better spacing. |

### FolderList (`FolderList.jsx` — 324 lines)

| Area | Current | Upgrade |
|---|---|---|
| Selected folder | Blue bg-tint + bold text | Add an animated left-border accent bar (3px, slides in). Pill-shaped highlight with smooth transition. |
| Tree lines | Only `border-left` on depth-1/depth-2 | Use dashed vertical connector lines (`border-left: 1px dashed var(--edura-border)`) from parent to child. Add small horizontal connection ticks at each child item. |
| Chevron (▶/▼) | Plain Unicode arrows | Replace with Lucide `ChevronRight`/`ChevronDown` icons. Animate the rotation with `transform: rotate(90deg)` transition. |
| Folder icon | Static inline SVG | Color-code by depth: root = blue, level-1 = indigo, level-2 = slate. |
| "Add folder" form | Stacked input + select + button | Collapse into a compact inline row. Show on click of a "+ New Folder" pill button. |
| Rename/Delete actions | Opacity-based show-on-hover | Keep, but use icon-only buttons (Pencil for rename, Trash for delete) with tooltips. |

### FolderTreeSelect (`FolderTreeSelect.jsx` — custom dropdown)

| Current | Upgrade |
|---|---|
| Custom dropdown with plain rows | Add smooth open/close animation (`max-height` transition or `transform: scaleY`). |
| Option hover | Light blue background | Add left-border accent on hover. |
| Chevron | Plain Unicode | Lucide icon with rotation animation. |

### ConfirmModal (`ConfirmModal.jsx` — 91 lines)

| Current | Upgrade |
|---|---|
| Portal-rendered Bootstrap modal | Keep portal. Upgrade backdrop to `backdrop-filter: blur(4px)`. |
| Modal content | `edura-modal-content` with `border-radius-lg` | Increase to `24px`. Add a colored top-bar accent (red for danger, blue for info). |
| Header | Standard modal-header | Add a relevant icon (AlertTriangle for danger, Info for info) next to the title. |
| Buttons | Bootstrap `btn-secondary` + `btn-danger` | Confirm button: gradient matching intent (red gradient for danger). Cancel: ghost outline. |
| Entry animation | None | `@keyframes modalSlideIn` — slide up + fade in over 0.25s. |

### ViewModeToggle (`ViewModeToggle.jsx` — 25 lines)

| Current | Upgrade |
|---|---|
| Bootstrap `btn-group` with text "Grid" / "List" | **Segmented control**: A container with a sliding pill background behind the active option. Replace text with icons: Grid = `LayoutGrid`, List = `List` from Lucide. |

### SortBySelect (`SortBySelect.jsx` — 30 lines)

| Current | Upgrade |
|---|---|
| Standard `form-select-sm` | Pill-shaped dropdown. Add Lucide `ArrowUpDown` icon before the label. |

### SecureNoteViewer (`SecureNoteViewer.jsx` — 213 lines)

| Current | Upgrade |
|---|---|
| Loading spinner | Bootstrap `spinner-border` | Skeleton loader matching the document viewport shape (a pulsing gray rectangle). |
| Watermark text | `rgba(0,0,0,0.25)` at bottom-right | Make slightly more transparent (`0.15`) and add a diagonal repeating watermark pattern. |
| PDF page shadows | `0 2px 8px rgba(0,0,0,0.15)` | Softer, larger: `0 4px 20px rgba(0,0,0,0.1)`. |

---

## 15. Animations & Micro-Interactions

### Page Transitions

- Add `framer-motion` (or CSS `@keyframes`) for route-level transitions.
- Default: content fades in + slides up 20px over 0.3s on route change.

### Skeleton Loaders

- Replace **every** `spinner-border` with shape-matching skeleton loaders:
  - Note cards → 3 skeleton card shapes (pulse animation).
  - User table rows → skeleton row strips.
  - Profile header → skeleton circle + skeleton text lines.
  - Stats cards → skeleton number + skeleton label.

### Toast Notifications

- **Current:** Uses `useToast()` context (likely simple alerts).
- **Upgrade:** Floating bottom-right snackbars with:
  - Slide-in from right animation.
  - `.glass` background.
  - Auto-dismiss with a smooth shrinking progress bar at the bottom.
  - Color-coded left border (green = success, red = error, blue = info).

### Button Loading States

- Every submit button (Upload, Save, Sign In, etc.) should show an inline spinner icon (replacing the text) during `submitting` state, instead of just disabling + "Saving..." text.

### Scroll-to-Top

- Add a floating circular "↑" button (bottom-right) that appears after scrolling 300px down. Smooth scroll to top on click. Gradient background, `.glass` effect.

### Dark Mode Toggle

- Add a moon/sun icon toggle in the header near the user section.
- On click, toggle `data-theme="dark"` on `<html>`.
- Animate the icon rotation/morph between sun and moon.
- Persist preference in `localStorage`.

---

## Implementation Priority

| Priority | Items | Impact |
|---|---|---|
| 🔴 High | Global colors/shadows/radii, Header glass effect, Skeleton loaders, NoteCard hover upgrades | Immediate modern feel across all pages |
| 🟡 Medium | SignIn split-screen, Explore hero animation, Upload dropzone animation, View mode segmented control, Admin table redesign | Key pages feel premium |
| 🟢 Low | Page transitions, Dark mode toggle, Theater mode for viewers, Animated stat counters, Social proof on auth | Polish and delight |
