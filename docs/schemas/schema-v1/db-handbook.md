# 📖 Database Handbook – Chapel Attendance System

## 🎯 Purpose

This database is the single source of truth for chapel attendance.
It tracks students, services, absences, exeats, overrides, warning letters, and admin activity within defined semesters.

---

## 👥 Main Entities

* **Students** → Who attends (or misses) services.
* **Services** → Each chapel gathering (e.g., Sunday Worship, Midweek Service).
* **Admins** → Staff managing attendance, rules, and uploads.
* **Semesters** → Academic timeframes (start and end dates).

---

## 🗂️ Core Tables

### `students`

* Stores student info (`id`, `full_name`, `matric_no`, `gender`, `level_id`).
* **Every attendance record links to a student.**
* `full_name` auto-updates via trigger.

### `services`

* Each service (`id`, `name`, `service_date`, `levels_allowed`, `constraints`).
* Defines who is expected to attend.

### `attendance_records`

* **Heart of the system.**
* Each row = 1 student’s status for 1 service.
* `status` = `"present"` / `"absent"` / `"exempted"` / `"unmatched"`.
* Basis for absences, reports, and summaries.

### `exeats`

* Official permissions to miss a service.
* Inclusive of the **last day** in the date range.

### `semesters`

* Defines academic boundaries.
* All reporting and letters are tied to semester\_id.

### `constraint_definitions`

* Global service rules (e.g., `"Males Only"`, `"Final Year Only"`).
* Can be overridden in a service’s JSON field.

### `warning_letters`

* Formal warnings tied to `student_id`, `semester_id`, and warning type.
* Logged for accountability (audit trail preserved).

### `semester_absences`

* Aggregated table: how many absences per student per semester.
* Auto-updated by triggers whenever `attendance_records` change.

### `attendance_summary`

* Stores per-service & per-level totals:

  * total\_students, total\_present, total\_absent, total\_exempted, total\_unmatched.
* Speeds up reporting without scanning all raw rows.

### `issues`

* Logs irregularities, e.g.:

  * unmatched scans (student not registered)
  * missing uploads
* Helps admins resolve data integrity problems.

### `manual_overrides`

* Admin-applied corrections to attendance.
* Linked to `override_reason_definitions` (e.g., “Scanner Failure”, “Late Upload”).

### `upload_history`

* Records metadata of bulk attendance uploads.
* Tracks who uploaded, when, and for which service(s).

---

## 🔄 How Things Flow

1. **Admin defines a service** → attaches constraints & levels.
2. **Attendance scans uploaded** → each student-service pair logged.
3. **Exeats applied** → convert absences into “exempted”.
4. **Semester\_absences auto-updates** → fast tally per student.
5. **Attendance\_summary built** → totals per service & level.
6. **Issues flagged** → unmatched scans / irregularities logged.
7. **Manual overrides** → admins correct anomalies with reasons.
8. **Warning letters issued** → recorded in `warning_letters`.
9. **Reports generated** → by semester, student, or service.

---

## 🔍 How to Find Data

* **Was a student absent last Sunday?**
  → `attendance_records` filtered by `student_id + service_id`.

* **How many absences has a student this semester?**
  → `semester_absences`.

* **Which services did 300 level attend in October?**
  → Query `services` (date range + level filter) + join `attendance_records`.

* **Who got warning letters this semester?**
  → `warning_letters` filtered by `semester_id`.

* **What global rules exist?**
  → `constraint_definitions`.

* **Which scans didn’t match a student?**
  → `issues`.

* **Who uploaded attendance for Service X?**
  → `upload_history`.

* **Where were attendance corrections made?**
  → `manual_overrides` + `override_reason_definitions`.

---

## 📌 Notes

* **Audit-first** → no silent deletions, everything is logged.
* **Status column in `attendance_records`** → retained for transparency.
* **Semester boundaries are strict** → only super admins define them.
* **Exeats are inclusive** → last day always counts.
* **Views (`vw_daily_attendance_totals`, `vw_monthly_top_absentees`)**
  → provide quick insights without deep querying.

---
