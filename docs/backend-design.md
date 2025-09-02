📘 Chapel Attendance System – Architecture Decisions

# 🏗️ 1. Backend

Framework: Next.js (using API routes as backend).

Pattern: All database access goes through API routes (no direct frontend ↔ DB communication).

Security:

- Supabase service key stored as server-only environment variables.
- Students/users only interact with your system through your API endpoints.

# 🔑 2. Authentication Approach

Phase 1 (Development):

- Use a stubbed clearance service that returns fake but realistic values:
  - clearance
  - user
  - role
- All API routes and frontend components consume this stub.

Phase 2 (Production):

- Replace the stub with real JWT-based Supabase Auth.
- No refactoring needed in routes/components — only swap the auth service implementation.

# 🗄️ 3. Database Schema (Supabase)

- users
  - id (uuid, PK)
  - name (text)
  - email (text, unique)
  - role (enum: student, staff, admin)
  - auth_user_id (uuid, FK → auth.users.id, nullable now, enforced later)
  - created_at (timestamptz, default now)

- students
  - id (uuid, PK)
  - user_id (uuid, FK → users.id)
  - matric_no (text, unique)
  - created_at (timestamptz, default now)

- staff
  - id (uuid, PK)
  - user_id (uuid, FK → users.id)
  - created_at (timestamptz, default now)

- attendance
  - id (uuid, PK)
  - student_id (uuid, FK → students.id)
  - date (date)
  - status (enum: present, absent, late)
  - marked_by (uuid, FK → users.id, nullable now)
  - created_at (timestamptz, default now)

# 🔐 4. Security Model

- No RLS (Row Level Security):
  - All database queries happen through API routes using the Supabase service key.
  - API routes enforce permissions and clearance logic.
- Why safe?
  - Students cannot directly query Supabase.
  - Even if they replay API calls, they cannot bypass clearance/auth checks.
  - Supabase service key never exposed to frontend.

# 🔄 5. Migration Path (Final Lap)

- Backfill users.auth_user_id with matching records from auth.users.id (e.g., via email).
- Enforce NOT NULL + FK constraint on auth_user_id.
- Swap the stub clearance service with Supabase Auth middleware.
- Done — system fully auth-enabled without refactoring.

# ✅ Final Summary

- Stack: Next.js (API + frontend) + Supabase (DB).
- No RLS needed (backend-only DB access).
- Stub auth now, real auth later — only one file swap required.
- Custom users table ensures system works independently of Supabase Auth.
- Secure design: students can’t hack via frontend or network replay.