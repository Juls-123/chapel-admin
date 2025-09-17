# Workflow: Absentees Viewer

### Actors

- **Admin** (all admins can access)

### Trigger

- Admin opens the **Absentees Viewer tab**.

### Flow

1. **Pick Date**

   - Admin uses a **Datepicker** to select a date.

2. **Select Service**

   - Service dropdown loads all available services for that date.
   - Admin selects a service.

3. **Generate Absentees List**

   - System fetches attendance records for the selected service/date.
   - System cross-checks with the student database.
   - **Absentees = Registered students - Present students**.
   - Display a table with:

     - Student Name
     - Matric Number

4. **Export List**

   - Admin clicks **Export button**.
   - Export options:

     - CSV
     - Excel
     - PDF (optional, if needed for printing)

5. **Log Action**

   - System logs:

     - Admin ID
     - Service selected
     - Date
     - Export/download action (if triggered)

---

### Tools / Libraries

- **UI Components:**

  - Datepicker → React Datepicker / shadcn/ui Datepicker
  - Dropdown → shadcn/ui Select
  - Table → TanStack Table for sorting, searching, filtering
  - Export → libraries like `xlsx` (for CSV/Excel) or `pdfkit` (for PDF)

- **State Management:**

  - Local React state for date + service selection
  - Redux (or context) only if you want to keep absentee data across tabs

- **Backend:**

  - Endpoint: `GET /absentees?date=YYYY-MM-DD&service_id=...`
  - Export endpoints if server generates files OR client-side export with JS

---

### Notes to Self 📝

- Add **loading spinner** when generating list.
- Add **“No absentees”** message if list is empty.
