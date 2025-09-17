# 📘 Clearance Form Workflow Doc

> **Scope**: Clearance form (all admins).
> **Logging**: Log action after successful clearance.
> **Special Notes**: Reasons can be user-defined, some require a note, enforce validation.

---

## 🔹 Workflow

### 1. Select Student

**Steps**

- Admin clicks **Select Student**.
- Opens **search box** with list of students (name + matric no).
- Searchable by **name** or **matric number**.

**JSON Output Example (search results)**

```json
[
  { "student_id": "stu_101", "name": "Ada Lovelace", "matric_no": "ENG5678" },
  { "student_id": "stu_102", "name": "Alan Turing", "matric_no": "CSC1234" }
]
```

---

### 2. Select Service

**Steps**

- After student is picked → system fetches **list of services the student was absent from**.
- Admin selects a service from that list.

**JSON Output Example (absent services)**

```json
[
  {
    "service_id": "srv_123",
    "type": "Regular",
    "date": "2025-09-01",
    "time": "08:00"
  },
  {
    "service_id": "srv_125",
    "type": "Special",
    "name": "Thanksgiving",
    "date": "2025-09-03",
    "time": "10:00"
  }
]
```

---

### 3. Select Reason

**Steps**

- Admin selects a **clearance reason** from dropdown (predefined + user-defined).
- Reasons may have **requires_note: true/false**.

**JSON Output Example (reasons)**

```json
[
  { "reason_id": "rsn_001", "label": "Medical Exeat", "requires_note": false },
  { "reason_id": "rsn_002", "label": "Faculty Duty", "requires_note": true }
]
```

---

### 4. Optional Note

**Steps**

- If selected reason has `requires_note: true` → show textarea.
- If admin tries to proceed without note → **block and show validation error**.
- If reason does not require note → skip.

**Edge Cases**

- Reason requires note but admin leaves empty → bounce back.
- Invalid service selection (student wasn’t absent) → reject with error.

---

### 5. Confirm Clearance

**Steps**

- Admin clicks **Confirm Clearance**.
- System inserts into **ManualOverride** table:

  - `student_id`, `service_id`, `reason_id`, `note`, `overridden_by`.

- Updates attendance record for that service from `"absent"` → `"exempted"`.
- Action is **logged**.

**JSON Output Example (success)**

```json
{
  "status": "success",
  "student_id": "stu_101",
  "service_id": "srv_123",
  "reason_id": "rsn_002",
  "note": "Faculty sent student on official duty",
  "cleared_by": "admin_007",
  "cleared_at": "2025-09-08T14:05:00Z"
}
```

---

## 🔹 Tool Highlights

- **Search & Select**:

  - TanStack Table / Combobox for student + service search.
  - Debounced search → Supabase query.

- **Validation**:

  - Zod schema for clearance payload:

    ```ts
    z.object({
      student_id: z.string(),
      service_id: z.string(),
      reason_id: z.string(),
      note: z
        .string()
        .optional()
        .refine(
          (val, ctx) => {
            if (ctx.parent.requires_note && !val) return false;
            return true;
          },
          { message: "Note required for this reason" }
        ),
    });
    ```

- **State Management**:

  - React state → form fields.
  - Redux → track current student/service selection + clearance history.

---

## 📝 Reminder Notes

- ✅ Clearance only applies if **student was absent**.
- ✅ Some reasons require notes, enforce validation.
- ✅ Log action with admin + service + student details.
- 🚨 Add confirm modal before finalizing clearance.
