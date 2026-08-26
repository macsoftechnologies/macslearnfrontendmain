#  LMS — Frontend

A complete, multi-role Learning Management System frontend built with **Vite + React** and **plain CSS** (no Tailwind, no UI kit) — matching your `LMS_Frontend_Implementation_Plan.md` and the Postman collection's API surface.

## What's included

- **Auth**: organization login, super-admin login, student self-registration, silent refresh-token flow, role-based route guards.
- **Super Admin portal**: dashboard, organizations (create/view/activate), subscription plans (CRUD), audit logs.
- **Org Admin portal**: dashboard, students (active/pending + approve/reject), faculty (create/deactivate), courses (CRUD), course detail with content/students/assignments/exams tabs, categories, enrollments, payments, reports (overview, course performance, student activity with charts), organization settings.
- **Faculty portal**: dashboard, my courses, course hub (content builder: modules/lessons, assignments, exams, enrolled students).
- **Student portal**: dashboard, browse/enroll in courses, my courses, a full course player (video/PDF/text lessons, progress tracking, mark-complete), results, certificates, payments.
- **Shared**: notifications (bell dropdown + full page), profile + change password.
- A small design system (`src/styles/tokens.css`) — ink-navy / warm-amber "" identity, Fraunces + Inter type — plus a reusable component library (Button, Input, DataTable, Modal, Tabs, Pagination, StatusBadge, FileUploader, etc.) all in plain CSS.

## Setup

1. Copy the `src`, `index.html`, and `.env` from this delivery into your existing `lms-frontend` project (overwrite your current `src/`).
2. Install the extra dependencies used here:
   ```bash
   npm install react-router-dom axios lucide-react react-hot-toast date-fns recharts react-dropzone @headlessui/react
   ```
3. Set your API URL in `.env`:
   ```
   VITE_API_BASE_URL=http://localhost:5000/api/v1
   VITE_STATIC_BASE_URL=http://localhost:5000
   ```
4. Run it:
   ```bash
   npm run dev
   ```

## Notes / assumptions

- The `/upload` endpoint is assumed to accept `multipart/form-data` with a `file` field and return `{ data: { url } }`. Adjust `src/api/upload.js` if your backend differs.
- Report endpoints (`/reports/overview`, `/reports/course-performance`, `/reports/student-activity`) are assumed to return arrays/objects shaped as used in `src/pages/org-admin/Reports*.jsx` — tweak the field names there if your backend's payload differs slightly.
- Access tokens are kept in memory only (never localStorage) and refresh tokens live in `sessionStorage`, per the plan's security notes.
- Discussion boards and detailed exam-taking/grading screens (question builder, timed attempts, short-answer grading UI) are wired at the API layer (`src/api/discussion.js`, `src/api/exams.js`) but don't yet have dedicated pages — say the word and I'll build those next.

## Design system quick reference

- Colors, spacing, radii, fonts: `src/styles/tokens.css` (CSS custom properties — change once, updates everywhere).
- Global resets + page layout helpers (`.page`, `.page-head`, `.grid-stats`, `.form-grid`, etc.): `src/styles/base.css`.
- Every component's styles live next to it (`Button.jsx` + `Button.css`), so nothing is scattered.
