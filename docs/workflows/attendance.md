# 📘 Attendance Upload Workflow Doc (Finalized)

> **Scope**: Attendance upload (all admins).
> **Logging**: Log action after confirm + ingest.
> **Special Notes**: Ingestion is **uploading file → Supabase Storage → parsing → comparing against student JSON**.

---

## 🔹 Workflow

### 1. Select Service

**Steps**

- Admin opens **Datepicker** → picks a date.
- System fetches services for that day.
- Admin selects service from **Service dropdown**.

**JSON Output Example (services list)**

```json
[
  {
    "id": "srv_123",
    "type": "Regular",
    "name": null,
    "date": "2025-09-08",
    "time": "08:00"
  },
  {
    "id": "srv_124",
    "type": "Special",
    "name": "Thanksgiving",
    "date": "2025-09-08",
    "time": "10:00"
  }
]
```

---

### 2. Upload Attendance CSV

**Steps**

- Admin uploads `.csv` file.
- File is sent to **Supabase Storage** (raw archive).
- Background service parses the file:

  - Convert CSV → JSON.
  - Compare against **student JSON** for the selected service + level(s).
  - Separate into **matched** and **unmatched** records.

**Preview Card shows:**

- Selected service details (type + name, date, time).
- Records parsed from CSV.
- Counts of matched vs unmatched.

**JSON Input Example (parsed CSV row)**

```json
{
  "matric_no": "ENG5678",
  "scan_time": "2025-09-08T08:10:00"
}
```

**JSON Output Example (preview)**

```json
{
  "matched": [
    {
      "student_id": "stu_101",
      "matric_no": "ENG5678",
      "student_name": "Ada Lovelace"
    }
  ],
  "unmatched": [
    {
      "raw_data": {
        "matric_no": "ENG9999",
        "scan_time": "2025-09-08T08:12:00"
      },
      "reason": "Not found in student records"
    }
  ],
  "summary": {
    "total_records": 200,
    "matched_count": 185,
    "unmatched_count": 15
  }
}
```

**Edge Cases**

- Wrong file format → reject with error.
- Empty file → “No records found.”
- Invalid headers → “File format invalid.”

---

### 3. Confirm or Cancel Batch

**Steps**

- Admin sees preview.
- Buttons: **Cancel** (discard file), **Confirm & Ingest**.
- On confirm:

  - Show **loading spinner** while ingestion runs.
  - Upload is **idempotent**:

    - If same file uploaded again for same service, it will **skip duplicate ingestion**.

  - Store file in **ScanArchive** table (with metadata).
  - Insert **AttendanceBatchVersion** with parsed records.
  - Create **AttendanceRecord(s)** for matched scans.
  - Raise **Issues** for unmatched scans (auto, no manual step).
  - Log action: `admin_id`, `service_id`, `records_ingested`, `unmatched_count`.

**JSON Output Example (after ingestion)**

```json
{
  "status": "success",
  "service_id": "srv_123",
  "records_ingested": 200,
  "unmatched_records": 15,
  "batch_id": "batch_789"
}
```

---

## 🔹 Tool Highlights

- **CSV Parsing**:

  - [PapaParse](https://www.papaparse.com/) → quick CSV → JSON conversion.
  - Or process server-side in Supabase Edge Function for consistency.

- **Storage**:

  - Supabase Storage → archive uploaded files (good for audits).
  - Store metadata (file name, size, mimetype, uploaded by).

- **UI Handling**:

  - **TanStack Table** → preview matched/unmatched.
  - **React Query** → handle ingest mutation + optimistic updates.
  - **Zod** → validate file schema before sending to server.

- **State Management**:

  - React state → file picker + date/service selection.
  - Redux → batch ingestion progress + global notifications.

---

## 📝 Reminder Notes

- ✅ Make ingestion **idempotent** (skip duplicate file/service combo).
- ✅ Store unmatched scans as **Issues** automatically.
- ✅ Show **loading spinner** during ingestion.
- ✅ Ingestion = **upload to storage → parse → match/unmatch → insert records → log action**.
- 🚨 Add file size limit (e.g., max 2MB).
- 🚨 Save unmatched Issues with raw scan data for debugging.
