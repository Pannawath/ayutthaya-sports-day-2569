# Design Spec: Remove Student Self-Registration & Unify Pink Jersey Studio 2026 into `/shop`

- **Date:** 2026-11-25
- **Repository:** `Pannawath/ayutthaya-sports-day-2569` (`d:\antigravity\ayutthaya-sports-day-2569`)
- **Target Domain:** `ayutthaya.shop`

## 1. Intent & Why
Make `ayutthaya.shop` land directly on the Pink Team (คณะอยุธยา 2569) Figma Home Page, serving purely as:
1. The gateway to the **Jersey Pre-order Studio (`/shop`)** (the original `Pink Jersey Studio 2026` 3D WebGL app migrated 1:1 into this repository).
2. A **Department Directory (`/departments` & Home tabs)** showing all 8 departments, central committee positions, sports rosters, and member names.
3. A **Classroom Directory (`/classrooms` & Home tabs)** showing all 21 classrooms across ม.1–ม.6 in Pink Team and their members.
4. A standalone **Admin Portal (`/admin`, PIN `2569`)** with full editing capabilities (Add, Edit, Move Classroom/Department/Role/Sport, Delete students, Check-in, Duplicate cleanup, Department Quotas, and Excel Import/Export).

All student-facing self-registration flows (`/register`, "ลงทะเบียน" buttons, and registration prompts) are removed.

## 2. Approaches Considered for `/shop`
- **Approach 1 (Selected):** Serve the original `Pink Jersey Studio 2026` (`index.html`, `css/`, `js/`, `assets/`, WebGL `stage3d.js`) 1:1 at `/shop` within `ayutthaya-sports-day-2569`, with a clean back-to-home navigation link (`/`).
- **Approach 2:** Rewrite the 2,600-line `app.js` + `stage3d.js` WebGL viewer into React components. Rejected due to risk of regressions in 3D canvas rendering and screen-print coordinate math.

## 3. Scope of Changes
1. **1:1 Migration of `Pink Jersey Studio 2026` to `/shop`:**
   - Copy `assets/`, `css/`, and `js/` from `d:\antigravity\pink` into `public/jersey-studio/` (and `/shop` route/rewrite) so `/shop` renders the exact 3D WebGL Pink Jersey Studio 2026 with zero broken asset paths and a top link back to `/` (`หน้าหลักคณะสี`).
2. **Complete Removal of Student Self-Registration:**
   - Bottom mobile 3-slot torn-paper navigation becomes: `ฝ่ายงาน (/departments) | หน้าหลัก (/) | ห้องเรียน (/classrooms)` with the sliding pink active indicator.
   - Desktop header & mobile drawer navigation: `หน้าหลัก (/)`, `สั่งจองเสื้อ (/shop)`, `ฝ่ายงาน (/departments)`, `ห้องเรียน (/classrooms)`, `สถิติข้อมูล (/statistics)`, `ประกาศ (/announcements)`.
   - `/register` redirects permanently to `/`.
   - Remove all "ลงทะเบียน" buttons and wordings from `HomeLegacyTabs.tsx`, `ClassroomsBrowser.tsx`, `DepartmentsBrowser.tsx`, and `StatisticsDashboard.tsx`.
   - Enhance the Home Page (`HomeLegacyTabs.tsx`) so users can also expand and inspect individual member names per department and per classroom directly from the home page or jump to `/departments` and `/classrooms`.
3. **Full Admin Management (`/admin`):**
   - Add "+ เพิ่มรายชื่อนักเรียน" modal and full edit modal in `StandaloneAdminApp.tsx` supporting: Prefix, First Name, Last Name, Nickname, Phone, Grade & Classroom (`ม.1`–`ม.6`), Number (`1 ก`–`20 ข`), Role Category (`คณะกรรมการกลาง` / `คณะทำงานฝ่าย`), Central Position, Department, Role Type (`ประธานฝ่าย` / `สตาฟฝ่าย` / `สมาชิกฝ่าย`), and Sport Type, syncing with `/api/students` and Google Sheets (`LEGACY_GAS_API_URL`).
