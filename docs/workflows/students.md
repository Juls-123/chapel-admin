# 📘 Student Management Workflow Doc

> **Scope**: Student management workflows.
> **Access**: Only available to **Superadmins** (so **no logging needed** for actions).

---

## 🔹 Workflows

### 1. Bulk Upload Students

**Steps**

- Admin uploads an Excel file.
- System parses and shows a preview table.
- Admin confirms upload via modal.
- On confirmation, student records are inserted into the DB.

**JSON Input Example** (parsed from Excel row)

```json
{
  "fname": "John",
  "mname": "A.",
  "lname": "Doe",
  "matric_no": "CSC1234",
  "level": "300",
  "gender": "Male",
  "department": "Computer Science",
  "student_email": "john.doe@school.edu",
  "parent_email": "parent.doe@gmail.com",
  "parent_phone": "+2348012345678"
}
```

**JSON Output (Success)**

```json
{
  "status": "success",
  "inserted_count": 120,
  "errors": []
}
```

**Edge Cases**

- Duplicate matric number → flagged in preview.
- Missing required field → row skipped with error in preview.
- File too large → reject and show error message.

---

### 2. Add Student Manually

**Steps**

- Click **Add Student** button.
- Fill form: `fname, mname, lname, matric_no, level, gender, department, student_email, parent_email, parent_phone`.
- Confirm via modal.
- Insert into DB.

**JSON Input Example**

```json
{
  "fname": "Mary",
  "mname": "B.",
  "lname": "Smith",
  "matric_no": "ENG5678",
  "level": "200",
  "gender": "Female",
  "department": "Mechanical Engineering",
  "student_email": "mary.smith@school.edu",
  "parent_email": "parent.smith@gmail.com",
  "parent_phone": "+2348098765432"
}
```

**JSON Output**

```json
{
  "status": "success",
  "student_id": "stu_12345"
}
```

**Edge Cases**

- Duplicate matric → error returned.
- Invalid email → reject at client-side validation.

---

### 3. Fetch Student Table

**Steps**

- Fetch students list from DB.
- Display table.
- Client-side filtering by `name, email, department, matric_no`.
- Reset filters available.

**JSON Output Example**

```json
[
  {
    "id": "stu_12345",
    "fname": "Mary",
    "lname": "Smith",
    "matric_no": "ENG5678",
    "level": "200",
    "department": "Mechanical Engineering",
    "status": "active"
  }
]
```

**Edge Cases**

- Empty DB → show "No students found".
- Large dataset → enable pagination.

---

### 4. Quick Actions (Per Student Row)

- **View Profile** → navigate to student profile page.
- **Edit Student** → open edit modal.
- **Resume Paused Student** → toggle status to "active".

---

### 5. Edit Student

**Steps**

- Click **Edit**.
- Modal shows editable fields:
  `fname, mname, lname, email, parent_email, parent_phone, department, level, gender, status`.
- Save changes → update DB.

**JSON Input Example**

```json
{
  "student_id": "stu_12345",
  "fname": "Mary",
  "lname": "Smith",
  "department": "Mechanical Engineering",
  "status": "active"
}
```

**JSON Output Example**

```json
{
  "status": "success",
  "updated_fields": ["department", "status"]
}
```

---

### 6. View Student Profile

**Steps**

- Opens profile page.
- Shows student details + tabs for:

  - Attendance records
  - Exeat records
  - Absence records

**JSON Output Example**

```json
{
  "student_id": "stu_12345",
  "details": {
    "fname": "Mary",
    "lname": "Smith",
    "matric_no": "ENG5678",
    "level": "200",
    "department": "Mechanical Engineering",
    "status": "active"
  },
  "attendance": [...],
  "exeats": [...],
  "absences": [...]
}
```

---

### 7. Upload History & Issues Tabs

- **Upload History Tab** → shows all bulk upload attempts (file name, date, inserted count, errors).
- **Issues Tab** → shows problematic student records (duplicate matric, missing data, etc.).

---

## 🔹 Tool Highlights

- **React state** → form fields, confirm modals.
- **TanStack Table** → student list table, sorting, filtering, pagination.
- **Redux** → student table state across filters and quick actions.
- **Supabase** → DB fetch + mutations.
- **Excel Parsing (SheetJS or Papaparse)** → for bulk upload preview.

---

## 📝 Reminder Notes

- Implement **confirm action modals** for destructive/important actions.
- Ensure **clear all filters** works without breaking.
- For **upload preview**, validate duplicates and required fields before insert.
- Large dataset? → paginate on client, but keep option for server-side pagination in the future.
