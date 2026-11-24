# AYUTTHAYA SPORTS DAY 2569 · PINK TEAM

Full-stack Student Attendance & Sports Team Management Web Application (Next.js App Router + TypeScript + Tailwind CSS + Supabase PostgreSQL/Auth/Storage).

- **Design Language:** Extracted directly from `หน้าหลัก.svg` (`440 x 956 px` Mobile Editorial Pink + Dark Charcoal torn-stone overlays + 3-slot Bottom Navigation).
- **8 Pages Included:**
  1. `/` — Home (Figma Hero, Featured Jersey Card linking to `/shop`, Real-time Stats, Quick Menus, Announcements)
  2. `/check-in` — Student Check-in (Fast Search, Camera QR Scanner with HMAC verification, Paper-Sync Bulk Tick + Printable A4 Sheet)
  3. `/register` — Student Registration (All legacy rules preserved + Optional Student Code + Immediate QR Pass)
  4. `/classrooms` — Classroom Directory (`ม.1`–`ม.6`, 21 Rooms, A4 Print)
  5. `/departments` — Departments Directory (All 8 Legacy Departments + 6 Central Positions)
  6. `/statistics` — Real-time Recharts Analytics & Room Breakdown
  7. `/admin` & `/login` — RBAC Admin Center (Students CRUD, Duplicate Resolver, Quotas, Policies, Sessions, Excel `.xlsx` Import/Export, Users, Audit Logs)
  8. `/announcements` — News & Schedule Board (+ Supabase Storage Image Upload)

---

## 1. Local Installation

```bash
npm install
```

## 2. Environment Variables (`.env.local`)

Copy `.env.example` to `.env.local` and fill in your Supabase project credentials:

```bash
cp .env.example .env.local
```

Required keys:
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase Anon Public Key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase Service Role Key (server-side only)
- `QR_SIGNING_SECRET` — Any strong 32+ char random string for HMAC QR tokens
- `NEXT_PUBLIC_SHOP_URL` — `/shop` (or `https://www.ayutthaya.shop/shop`)
- `LEGACY_GAS_API_URL` — Read-only legacy Google Apps Script URL for 181-record migration

## 3. Supabase Database Setup

1. Open **Supabase Dashboard -> SQL Editor**.
2. Paste and execute the entire contents of `supabase/migrations/001_init.sql`.
   - Creates all 8 tables (`profiles`, `departments`, `students`, `check_in_sessions`, `check_ins`, `announcements`, `system_settings`, `audit_logs`), RLS policies, Storage bucket `announcements`, and seeds the 8 legacy departments + default active session.

## 4. Migrate All 181 Legacy Records (Safe & Read-Only on Google Sheets)

```bash
npm run migrate:legacy
```

- Reads live records from the legacy Google Apps Script endpoint without modifying or deleting anything in Google Sheets.
- Upserts every student into Supabase `students` with signed `qr_token`.

## 5. Create Initial Admin Account

```bash
npm run create:admin -- admin@ayutthaya.shop YourStrongPassword "ผู้ดูแลระบบหลัก" ADMIN
```

For Staff accounts:

```bash
npm run create:admin -- staff1@ayutthaya.shop StaffPassword "พี่สตาฟเช็คชื่อ" STAFF
```

## 6. Run Locally

```bash
npm run dev
```

Open `http://localhost:3000`.

## 7. Production Deployment Notes (Vercel)

When ready to deploy on Vercel with `www.ayutthaya.shop`:
1. Deploy this Next.js repo to Vercel with the environment variables from `.env.local`.
2. Add custom domain `www.ayutthaya.shop` to this project (`/` serves the Sports Day & Attendance system).
3. Configure a Vercel rewrite in `next.config.ts` (or Vercel dashboard) routing `/shop` and `/shop/:path*` to the legacy Pink Jersey Store deployment.
