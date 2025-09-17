# 📘 Exeat Manager Workflow Doc

> **Scope**: Exeat management (all admins have access).
> **Logging**: Actions like **creating exeat** should be logged.

---

## 🔹 Workflows

### 1. Fetch Student Table

**Steps**

- On route mount (`/exeats`), fetch student table from DB.
- Render into JSON table.
- Refresh button re-triggers fetch.

**JSON Output Example**

```json
[
  {
    "id": "stu_12345",
    "fname": "Mary",
    "lname": "Smith",
    "matric_no": "ENG5678",
    "status": "active",
    "level": "200",
    "department": "Mechanical Engineering"
  }
]
```

**Edge Cases**

- Empty dataset → show "No students found".
- Network error → show retry button.

---

### 2. Sorting and Filtering

**Options**

- Sort by student **name**.
- Sort by **matric number**.
- Sort by **status** (dropdown).
- Quick sort headers (frontend).

**Tooling**: Client-side sorting with **TanStack Table**.

---

### 3. Quick Actions

- **View Student Profile** → opens profile page.
- **View Exeat History** → navigates to student’s exeat records.

**JSON Output Example (history)**

```json
{
  "student_id": "stu_12345",
  "exeats": [
    {
      "exeat_id": "ex_101",
      "start_date": "2025-09-01",
      "end_date": "2025-09-05",
      "reason": "Family emergency",
      "status": "approved"
    }
  ]
}
```

---

### 4. Add Exeat

**Steps**

1. Click **Add Exeat** button.
2. Search student by **name** or **matric number** (search box + dropdown list).
3. Select student.
4. Pick **start date** and **end date**.
5. Optionally enter **reason**.
6. Confirm creation via modal.
7. Insert into DB + log action.

**JSON Input Example**

```json
{
  "student_id": "stu_12345",
  "start_date": "2025-09-01",
  "end_date": "2025-09-05",
  "reason": "Medical appointment"
}
```

**JSON Output Example (Success)**

```json
{
  "status": "success",
  "exeat_id": "ex_101",
  "student_id": "stu_12345"
}
```

**Edge Cases**

- Invalid date range (end before start) → validation error.
- Overlapping exeats → reject or warn admin.
- Student not found in search → show "No match found".

---

## 🔹 Tool Highlights

- **TanStack Table** → student table with sorting and quick filters.
- **React state** → exeat form fields, modals.
- **Redux** → exeat list refresh after new creation.
- **Supabase** → fetch + insert exeats, log admin action.

---

## 📝 Reminder Notes

- Remove **cancel button** (exeats aren’t canceled, only completed or expired).
- Fix table filters.
- Confirm action modal for exeat creation.

---
