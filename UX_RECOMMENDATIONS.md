# UX Recommendations – Edura Notes

This document lists **changes and logic improvements** that can improve user experience and smoothen the flow of the project. Recommendations are organised by **cross-cutting themes** and **by page**, so the team can prioritise and implement incrementally.

**How to use:** Pick recommendations by page or by theme. Implement in any order unless a dependency is noted (e.g. a global toast system enables success messages on multiple pages).

**Status:** Items marked *“(already in place)”* in the document reflect current behaviour. The rest are proposed improvements.

---

## Table of contents

1. [Cross-cutting recommendations](#1-cross-cutting-recommendations)
2. [Recommendations by page](#2-recommendations-by-page)
3. [Shared components](#3-shared-components)
4. [Implementation priority](#4-implementation-priority)
5. [Reference: key file paths](#5-reference-key-file-paths)

---

## 1. Cross-cutting recommendations

### Error handling and feedback

- **Toast / notification system:** Replace or supplement inline alerts with a small toast or notification system (e.g. success after upload, save, delete) so the page is not dominated by alert boxes. Use toasts for transient success and non-blocking errors.
- **NoteCard delete errors:** In `client/src/components/NoteCard.jsx`, delete and visibility-toggle errors are currently swallowed in `catch` with no user feedback. Surface errors via a toast or inline message and keep the list in sync (e.g. do not call `onDeleted` on failure).

### Confirmations

- **Replace `window.confirm`:** Use in-app modals for destructive actions instead of `window.confirm` in:
  - `client/src/components/NoteCard.jsx` (delete note)
  - `client/src/pages/EditNote.jsx` (delete note)
  Align with the pattern used in `client/src/pages/admin/AdminUserDetail.jsx` (delete user / delete notes modals) for better accessibility and layout control.

### Loading and empty states

- **Skeleton loaders:** Consider skeleton loaders on Homepage, Manage, Explore, and Admin list pages instead of (or in addition to) a single spinner, so layout and content type are visible sooner.
- **Empty states:** Standardise copy and primary CTA across pages (e.g. “Upload your first note” on Manage; “No results” with “Clear filters” or “Go to Explore” where relevant).

### Navigation and wayfinding

- **Breadcrumbs:** Add optional breadcrumbs on EditNote (Manage > Edit note), PublicProfile (Explore > [Name]), and AdminUserDetail (Admin > Users > [User name]) so users know where they are and can jump back one level.
- **Back behaviour:** Unify “Back” / “Close” behaviour. FullScreenPdfView “Close” could return to the previous route (from Home vs Manage) when the user opened the viewer from a list; PublicNoteView “Back” already goes to profile—document and keep consistent.

### Search and filters

- **Consistency:** Search applies on button click and Enter on Homepage, Manage, Explore, and AdminUsers. Either document “apply on submit” as the standard and keep placeholder/labels consistent, or add optional “search as you type” with debounce for list-heavy pages.
- **Clear search:** Where there is a search input, consider a “Clear search” control when the input is non-empty to reset filters in one click.
- **Explore:** Search bar is modernised (pill-style, icon, filter dropdown, Search button); logic unchanged (submit applies search, resets to page 1).

### Forms and unsaved changes

- **EditNote and long forms:** Add a warning when the user tries to leave (route change or refresh) with unsaved changes, e.g. `beforeunload` plus React Router `useBlocker` or prompt.

### Accessibility

- **Focus management:** After closing modals (e.g. Admin delete modals), move focus back to the trigger or a safe region; after form submit (e.g. EditNote Save), ensure focus is not lost.
- **Destructive actions:** Ensure all destructive actions have clear `aria-label`s and, where applicable, confirmation text that is read by screen readers.

### Mobile and responsiveness

- **Admin tables:** Review AdminUsers and AdminUserDetail files table on small screens—use horizontal scroll or a card layout so content is not clipped.
- **Sidebar and filters:** Ensure the folder sidebar (Homepage, Manage) and the filter bar (Explore) collapse or stack cleanly on narrow viewports.

---

## 2. Recommendations by page

### SignIn  
**File:** `client/src/pages/SignIn.jsx`

**Current behaviour:** Sign-in and sign-up tabs (email/password) plus optional Google; errors shown inline; redirect to `from` or `/home` after success.

**Recommendations:**

- Show password rules (e.g. “At least 6 characters”) before or alongside the sign-up form so users see requirements before submitting.
- Optional “Remember me” or session-length hint so users understand how long they stay signed in.
- Clear the error message when switching between sign-in and sign-up tabs to avoid showing a stale error.
- Ensure redirect `from` is preserved when the token expires and the user re-authenticates (already stored in location state; verify after session expiry).

---

### Homepage  
**File:** `client/src/pages/Homepage.jsx`

**Current behaviour:** Folder sidebar (read-only), search (button + Enter), sort, view mode (grid/list), pagination; notes grouped by folder; empty state with “Go to Manage”.

**Recommendations:**

- Persist view mode and sort (e.g. in `localStorage`) so they survive refresh and feel consistent across visits.
- Add a “Clear search” control when `searchInput` is non-empty to reset the query in one click.
- Empty state CTA “Go to Manage” is present; ensure the link is clear and, if desired, that navigating from Home to Manage scrolls or focuses the upload area when the list is empty.

---

### Manage  
**File:** `client/src/pages/Manage.jsx`

**Current behaviour:** Upload form (dropzone, title, folder, description, visibility), folder sidebar (editable), notes list with View/Edit/Delete, search, sort, view mode, pagination, storage bar.

**Recommendations:**

- After successful upload, show brief success feedback (toast or inline message) and optionally scroll to the new note or keep the upload form visible with an “Add another” emphasis.
- When at storage limit, disable the upload control and make the limit message more prominent (e.g. alert or banner).
- Optionally align search bar styling with Explore for visual consistency across the app.

---

### Explore  
**File:** `client/src/pages/Explore.jsx`

**Current behaviour:** Hero; modernised pill-style search bar with filter (All / Profiles / Notes) and Search button *(already in place)*; Top Contributors and Public Files sections with pagination; Public Files sort by **Name**, **Size**, or **Newest first** *(already in place)*; search applies on submit and Enter.

**Recommendations:**

- Empty states for “No profiles” / “No files” could add “Try different filters” or “Clear search” to help users recover.
- Persist filter (All/Profiles/Notes) and sort in URL query params so sharing or refreshing keeps the same view and deep-linking works.

---

### EditNote  
**File:** `client/src/pages/EditNote.jsx`

**Current behaviour:** Form to edit title, description, folder, visibility, optional file replace; Save / Cancel / Delete note; delete uses `window.confirm`.

**Recommendations:**

- Replace `window.confirm` for delete with an in-app confirmation modal (aligned with Admin delete modals).
- Add unsaved-changes warning on route change or refresh (e.g. `beforeunload` + React Router blocker).
- Add breadcrumb “Manage > Edit note” at the top for wayfinding.
- When replacing the file, show selected file name/size/type so the user knows what will be uploaded before saving.

---

### ViewNote  
**File:** `client/src/pages/ViewNote.jsx`

**Current behaviour:** Redirects to `/notes/:id/view` (FullScreenPdfView). No user-facing logic on this route.

**Recommendations:**

- No logic change required. This route exists only to redirect to the viewer so links to `/notes/:id` still work.

---

### FullScreenPdfView  
**File:** `client/src/pages/FullScreenPdfView.jsx`

**Current behaviour:** Loads note by id, shows SecureNoteViewer with zoom; “Close” links to `/home`; loading and error states shown.

**Recommendations:**

- “Close” / “Back” could use `useLocation().state?.from` or the referring route so the user returns to Home or Manage depending on where they opened the viewer.
- Add keyboard shortcut (e.g. Escape) to close the viewer for faster navigation.

---

### PublicProfile  
**File:** `client/src/pages/PublicProfile.jsx`

**Current behaviour:** Fetches public profile by `userId`; shows user info, folders, and public notes with search, sort, view mode; error state has “Home” link to `/`.

**Recommendations:**

- The error “Home” link goes to `/` (which redirects to Explore). Consider labelling it “Back to Explore” or linking directly to `/explore` for clarity.
- Add an empty state when the user has no public notes (friendly message and link to Explore or home).

---

### PublicNoteView  
**File:** `client/src/pages/PublicNoteView.jsx`

**Current behaviour:** Full-screen public note viewer with zoom; “Back to profile” links to the profile or `/`; no auth required.

**Recommendations:**

- Align with FullScreenPdfView: add Escape key to close or go back.
- Keep “Back to profile” label consistent; already good for context.

---

### AdminLogin  
**File:** `client/src/pages/AdminLogin.jsx`

**Current behaviour:** Google Sign-In only; error shown if not admin; redirects to `/admin` on success.

**Recommendations:**

- Add a link “Back to main site” or “Sign in as user” to `/signin` or `/explore` so admins can return without needing to know the URL.
- Optional short hint that only Google accounts with admin access are accepted.

---

### AdminDashboard  
**File:** `client/src/pages/admin/AdminDashboard.jsx`

**Current behaviour:** Fetches stats (total users, notes, storage); shows three cards and “View all users” link; loading and error states.

**Recommendations:**

- On error, add a “Retry” button so the user can re-fetch without refreshing the page.
- Optional quick links (e.g. last 5 users, recent notes) for faster navigation into Admin Users or user detail.

---

### AdminUsers  
**File:** `client/src/pages/admin/AdminUsers.jsx`

**Current behaviour:** User list with search (button), per-page selector, pagination, table with “View files” link.

**Recommendations:**

- Trigger search on Enter as well as button click for consistency with other search bars.
- Improve table responsiveness on small screens (horizontal scroll or card layout)—see cross-cutting.
- Add empty state when no users match the search (message + optional “Clear search”).

---

### AdminUserDetail  
**File:** `client/src/pages/admin/AdminUserDetail.jsx`

**Current behaviour:** User detail with storage limit, profile/note listing toggles, notes table with select/delete, modals for delete user and delete selected notes.

**Recommendations:**

- Add breadcrumb “Users > [User name]” at the top.
- After bulk delete of notes, refetch user data (or at least storage and note count) so “storage used” and note count stay in sync.
- Ensure focus returns to the trigger or a safe element after closing delete modals (accessibility).

---

### AdminNoteView  
**File:** `client/src/pages/admin/AdminNoteView.jsx`

**Current behaviour:** Full-screen note viewer with “List on Explore” toggle; “Back to user” link; loading and error states.

**Recommendations:**

- “Back to user” link is clear; keep as is.
- Optional Escape key to close or go back.
- “List on Explore” toggle errors are shown inline; if a global toast is added, use it here for consistency.

---

## 3. Shared components

### Layout  
**File:** `client/src/components/Layout.jsx`

- Ensure nav order is consistent (e.g. Home, Manage, Explore, Public profile) and that “Public profile” and auth links are visible.
- Footer could explicitly include “Explore” and “Sign In” where relevant for guests.

### NoteCard  
**File:** `client/src/components/NoteCard.jsx`

- Use an in-app confirmation modal for delete instead of `window.confirm`.
- Show delete and visibility-toggle errors (toast or inline) instead of failing silently.

### FolderList / FolderTreeSelect  
**Files:** `client/src/components/FolderList.jsx`, `client/src/components/FolderTreeSelect.jsx`

- Optional keyboard navigation (arrow keys, Enter to select) for power users.
- Ensure expanded/collapsed state is clear for screen readers (e.g. `aria-expanded`).

### ProtectedRoute / AdminRoute  
**Files:** `client/src/components/ProtectedRoute.jsx`, `client/src/components/AdminRoute.jsx`

- Loading spinner is consistent. Unauthenticated users are sent to `/` (then `/explore`); non-admin users hitting admin routes go to `/admin/login`. Use this when choosing “Back” / “Home” links across the app.

---

## 4. Implementation priority

Suggested order for implementing recommendations (optional):

| Priority | Area | Notes |
|----------|------|--------|
| 1 | Error feedback and confirmations | Toast system + modal confirmations + NoteCard error surfacing. Unblocks success messages and consistent delete UX. |
| 2 | Breadcrumbs and back links | EditNote, PublicProfile, AdminUserDetail; FullScreenPdfView “Close” to previous route. Improves wayfinding. |
| 3 | Unsaved changes and form UX | EditNote (and other long forms) prompt on leave. Reduces accidental data loss. |
| 4 | Skeleton loaders and empty states | Homepage, Manage, Explore, Admin lists; standardise empty copy and CTAs. Improves perceived performance and guidance. |
| 5 | URL state for Explore | Persist filter and sort in query params. Enables sharing and refresh without losing view. |
| 6 | Accessibility and keyboard | Focus management after modals and submit; Escape to close viewers; aria-labels and keyboard nav for FolderList. |

---

## 5. Reference: key file paths

| Area | Path |
|------|------|
| Pages | `client/src/pages/*.jsx`, `client/src/pages/admin/*.jsx` |
| Layout, auth | `client/src/components/Layout.jsx`, `ProtectedRoute.jsx`, `AdminRoute.jsx` |
| Note list / viewer | `NoteCard.jsx`, `SecureNoteViewer.jsx`, `SecureNoteViewerLazy.jsx` |
| Folders | `FolderList.jsx`, `FolderTreeSelect.jsx`, `client/src/utils/folderTree.js` |
| API / auth context | `client/src/api/client.js`, `client/src/context/AuthContext.jsx` |

---

*End of UX_RECOMMENDATIONS.md*
