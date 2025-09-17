# 📘 Services Management Workflow Doc

---

## 1. Fetch Service Table (on `/service` mount)

**Workflow**

- On page load, fetch services list from DB.
- Cache results to avoid repeat queries.
- Display in table with filters/sorting.

**Service Function**

```ts
getServices(): Promise<Service[]>
```

**State**

- **TanStack Query** → `useQuery(['services'], getServices)`
- Handles cache, refetch, loading/error states.

**Input/Output**

- Input: none
- Output JSON:

```json
[
  {
    "id": "svc_123",
    "type": "normal",
    "date": "2025-09-10T10:00:00Z",
    "status": "scheduled",
    "levels": ["100L", "200L"]
  }
]
```

**Edge Cases**

- No services found → show empty state.
- DB/network error → show retry option.

---

## 2. Sorting & Filters (Client-Side)

**Workflow**

- Admin filters services by type/date/status.
- Apply quick sort headers (date ascending/descending).
- Clear filters resets table.

**State**

- **Redux** → keep `filters` object (so filters persist across page reloads).
- Example:

```ts
{
  type: "normal",
  status: "scheduled",
  dateRange: { start: "2025-09-01", end: "2025-09-30" }
}
```

**Input/Output**

- Input: filters object
- Output: filtered list of services (subset of getServices result).

**Edge Cases**

- Invalid date range → ignore filter.
- Multiple filters combined → still client-side only.

---

## 3. Create Service

**Workflow**

- Admin clicks "Create Service".
- Modal opens → fill form (type, date, time, levels, constraints).
- Special service → includes service name.
- Submit → DB insert + audit log.

**Service Function**

```ts
createService(data: {
  type: "normal" | "special",
  name?: string,
  date: string,
  levels: string[],
  constraints: string[]
}, createdBy: string): Promise<Service>
```

**State**

- **React State** → form inputs (temporary).
- **TanStack Mutation** → call `createService`.
- On success → `invalidateQueries(['services'])`.

**Input/Output**

- Input:

```json
{
  "type": "special",
  "name": "Special Thanksgiving Service",
  "date": "2025-10-05T09:00:00Z",
  "levels": ["300L", "400L"],
  "constraints": ["all_present"]
}
```

- Output: created service record with ID.

**Edge Cases**

- Missing required fields → frontend validation.
- Duplicate service (same type/date) → reject with error.

**Notes to self**

- Fix UI: constraints & level selector apply to both normal and special.
- Constraints dropdown should be clean.

---

## 4. Edit Service

**Workflow**

- Admin selects a service.
- Modal opens pre-filled with data.
- Save changes → update DB + log.

**Service Function**

```ts
updateService(id: string, updates: Partial<Service>): Promise<Service>
```

**State**

- **React State** → modal + form inputs.
- **TanStack Mutation** → call `updateService`.

**Input/Output**

- Input: `{ date: "2025-10-06T10:00:00Z" }`
- Output: updated service record.

**Edge Cases**

- Service already completed/cancelled → editing disabled.

---

## 5. Mark Service as Complete or Cancel

**Workflow**

- Admin sets service status → complete/cancel.
- Update DB.

**Service Function**

```ts
updateServiceStatus(id: string, status: "completed" | "canceled"): Promise<Service>
```

**State**

- **React State** → confirm modal.
- **TanStack Mutation** → update status.

**Edge Cases**

- Already marked complete → reject with warning.

---

## 6. View Attendance of a Service

**Workflow**

- Admin selects service.
- Fetch attendance summary (total present, absent, exempted).
- Table of attendees/absentees shown.

**Service Function**

```ts
getAttendanceByService(serviceId: string): Promise<AttendanceSummary>
```

**State**

- **TanStack Query** → fetch attendance summary.
- **React State** → filters for table (unless you want persistence → Redux).

**Output JSON**

```json
{
  "service_id": "svc_123",
  "total_students": 200,
  "total_present": 180,
  "total_absent": 15,
  "total_exempted": 5
}
```

---

## 7. Export Attendance

**Workflow**

- Admin clicks export.
- Request attendance data in Excel/CSV.
- File downloaded in browser.

**Service Function**

```ts
exportAttendance(serviceId: string, format: "csv" | "excel"): Promise<Blob>
```

**State**

- **TanStack Mutation** → trigger export.
- File saving = browser API, no state management.

**Edge Cases**

- Large file export → show progress/loading state.

---

## 8. Date Picker (Sort + Filter)

**Workflow**

- Admin sets date range.
- Services list filtered accordingly.

**State**

- **Redux** → unify into `filters`.
- Example:

```ts
filters.dateRange = { start: "2025-09-01", end: "2025-09-30" };
```

---

## 9. Clear Filters

**Workflow**

- Admin clicks clear.
- Reset filters → refresh table.

**State**

- **Redux action** → `resetFilters()`.

---

## 📝 Reminder Notes

- Fix UI on service form:

  - Constraints + level selector → apply to all services.
  - Constraints should be dropdown form.
  - modal to confirm quick actions

- Add template picker later if needed.

---

## ⚡ State Summary (Cheat Sheet)

- **TanStack Query/Mutation** → anything touching Supabase (fetch services, attendance, create/edit/export).
- **React State** → local UI (forms, modals, toggles).
