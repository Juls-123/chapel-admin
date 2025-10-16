# Absentees Module Documentation

## Overview

The Absentees Module provides a complete workflow for viewing and managing student attendance records. It follows the established Chapel-Admin architecture patterns with clean separation of concerns.

## Architecture

```
Client Layer (React)
    ↓
Hooks Layer (React Query)
    ↓
API Layer (Next.js Routes)
    ↓
Service Layer (Business Logic)
    ↓
Utility Layer (Helpers & Storage)
    ↓
Database & Storage (Supabase)
```

## File Structure

```
/src/app/api/absentees/
├── services/route.ts              # GET services by date with counts
└── [serviceId]/route.ts           # GET paginated absentees

/src/services/
└── AbsenteesService.ts            # Core business logic

/src/lib/utils/
├── storage.ts                     # Storage operations
├── absentees-helpers.ts          # Data transformation
└── validators.ts                  # Zod validation schemas

/src/hooks/
└── useAbsentees.ts                # React Query hooks
```

## API Endpoints

### 1. Get Services with Absentee Counts

**Endpoint:** `GET /api/absentees/services?date=YYYY-MM-DD`

**Query Parameters:**

- `date` (required): Date in YYYY-MM-DD format

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Morning Devotion - 07:00",
      "service_type": "devotion",
      "devotion_type": "morning",
      "service_date": "2025-10-05",
      "service_time": "07:00:00",
      "status": "completed",
      "levels": [{ "id": "level-uuid" }],
      "absentee_counts": {
        "total": 45,
        "by_level": {
          "100": 10,
          "200": 15,
          "300": 8,
          "400": 7,
          "500": 5
        }
      }
    }
  ],
  "meta": {
    "date": "2025-10-05",
    "count": 3
  }
}
```

### 2. Get Absentees for Service

**Endpoint:** `GET /api/absentees/[serviceId]?page=1&pageSize=20`

**Path Parameters:**

- `serviceId` (required): UUID of the service

**Query Parameters:**

- `page` (optional, default: 1): Page number
- `pageSize` (optional, default: 20, max: 100): Items per page

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "matric_number": "CS/2021/001",
      "student_name": "John Doe",
      "level": "300",
      "student_id": "uuid"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalCount": 45,
    "totalPages": 3
  },
  "summary": {
    "totalAbsentees": 45,
    "byLevel": {
      "100": 10,
      "200": 15,
      "300": 8,
      "400": 7,
      "500": 5
    }
  }
}
```

## React Hooks Usage

### Fetch Services with Counts

```typescript
import { useServicesWithCounts } from "@/hooks/useAbsentees";

function MyComponent() {
  const { data, isLoading, error } = useServicesWithCounts("2025-10-05");

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {data.map((service) => (
        <div key={service.id}>
          {service.name} - {service.absentee_counts.total} absentees
        </div>
      ))}
    </div>
  );
}
```

### Fetch Paginated Absentees

```typescript
import { useAbsentees } from "@/hooks/useAbsentees";

function MyComponent() {
  const [page, setPage] = useState(1);
  const serviceId = "service-uuid";

  const { data, isLoading } = useAbsentees(serviceId, page, 20);

  return (
    <div>
      <table>
        {data?.data.map((absentee) => (
          <tr key={absentee.student_id}>
            <td>{absentee.matric_number}</td>
            <td>{absentee.student_name}</td>
            <td>{absentee.level}</td>
          </tr>
        ))}
      </table>

      <button onClick={() => setPage((p) => p - 1)} disabled={page === 1}>
        Previous
      </button>
      <button
        onClick={() => setPage((p) => p + 1)}
        disabled={page === data?.pagination.totalPages}
      >
        Next
      </button>
    </div>
  );
}
```

## Service Layer

### AbsenteesService Methods

```typescript
import { AbsenteesService } from "@/services/AbsenteesService";

// Get services with absentee counts
const services = await AbsenteesService.getServicesWithCounts("2025-10-05");

// Get paginated absentees for a service
const result = await AbsenteesService.getAbsenteesForService(
  "service-uuid",
  1, // page
  20 // pageSize
);
```

## Utility Functions

### Storage Operations

```typescript
import {
  generateAttendancePath,
  downloadJsonFile,
  downloadMultipleJsonFiles,
} from "@/lib/utils/storage";

// Generate file path
const path = generateAttendancePath(
  "2025-10-05",
  "service-uuid",
  "300",
  "absentees.json"
);
// Returns: "attendance/2025-10-05/service-uuid/300/absentees.json"

// Download single file (returns null if not found)
const data = await downloadJsonFile(path);

// Download multiple files in parallel
const results = await downloadMultipleJsonFiles([path1, path2, path3]);
```

### Absentee Helpers

```typescript
import {
  parseAbsenteeRecords,
  mergeAbsenteeRecords,
  toConsolidatedFormat,
  sortAbsentees,
  paginateAbsentees,
} from "@/lib/utils/absentees-helpers";

// Parse and validate records
const records = parseAbsenteeRecords(rawData, "300");

// Merge records from multiple levels (deduplicates by student_id)
const merged = mergeAbsenteeRecords(levelData);

// Convert to simplified format
const consolidated = toConsolidatedFormat(merged);

// Sort by level then matric number
const sorted = sortAbsentees(consolidated);

// Paginate results
const paginated = paginateAbsentees(sorted, 1, 20);
```

## Error Handling

### Custom Error Types

```typescript
// AbsenteeError - Business logic errors
try {
  await AbsenteesService.getServicesWithCounts(date);
} catch (error) {
  if (error instanceof AbsenteeError) {
    console.error(`Error Code: ${error.code}`);
    console.error(`Details:`, error.details);
  }
}

// StorageError - File operation errors
try {
  await downloadJsonFile(path);
} catch (error) {
  if (error instanceof StorageError) {
    console.error(`Storage Error: ${error.code}`);
  }
}
```

### Error Codes

| Code                    | Description                            |
| ----------------------- | -------------------------------------- |
| `FETCH_SERVICES_FAILED` | Failed to fetch services from database |
| `SERVICE_NOT_FOUND`     | Service ID doesn't exist               |
| `GET_ABSENTEES_FAILED`  | Failed to retrieve absentees           |
| `DOWNLOAD_FAILED`       | Storage file download failed           |
| `INVALID_JSON`          | File contains invalid JSON             |
| `STORAGE_ERROR`         | General storage operation error        |

## Data Flow

### Step 1: Select Date → Get Services

```
User selects date
    ↓
useServicesWithCounts("2025-10-05")
    ↓
GET /api/absentees/services?date=2025-10-05
    ↓
AbsenteesService.getServicesWithCounts()
    ↓
For each service:
  - Fetch from services table
  - Download absentees.json for all levels (100-500)
  - Count absentees per level
    ↓
Return services with counts
```

### Step 2: Select Service → Get Absentees

```
User selects service
    ↓
useAbsentees(serviceId, page, pageSize)
    ↓
GET /api/absentees/[serviceId]?page=1&pageSize=20
    ↓
AbsenteesService.getAbsenteesForService()
    ↓
1. Fetch service to get date
2. Download all level files (100-500) in parallel
3. Parse and merge records
4. Remove duplicates by student_id
5. Convert to consolidated format
6. Sort by level and matric number
7. Paginate results
    ↓
Return paginated data with summary
```

## Key Features

### ✅ Silent Level Skipping

If a level's `absentees.json` file doesn't exist, it's silently skipped without errors.

### ✅ Deduplication

Students appearing in multiple level files are deduplicated by `student_id`.

### ✅ Pagination

Large absentee lists are paginated for performance (max 100 per page).

### ✅ Level Breakdown

Summary provides counts broken down by level for quick insights.

### ✅ Parallel Downloads

All level files are downloaded concurrently for optimal performance.

### ✅ Type Safety

Full TypeScript types throughout the stack with Zod validation.

### ✅ Consistent Sorting

Results are always sorted by level (100→500) then matric number.

## Architecture Patterns Used

1. **Service Layer Pattern** - Business logic in dedicated service class
2. **Repository Pattern** - Data access abstraction
3. **Factory Pattern** - Utility function factories
4. **Middleware Pattern** - Authentication and validation
5. **Error Handling Pattern** - Custom error types with codes
6. **Validation First** - Zod schemas at API boundaries
7. **Separation of Concerns** - Clear layer responsibilities
8. **Type Safety** - Generated types + runtime validation

## Testing Recommendations

```typescript
// API Route Tests
describe("GET /api/absentees/services", () => {
  it("returns services with absentee counts", async () => {
    // Test implementation
  });

  it("validates date format", async () => {
    // Test validation
  });
});

// Service Layer Tests
describe("AbsenteesService", () => {
  it("merges absentees from multiple levels", () => {
    // Test business logic
  });

  it("handles missing files gracefully", () => {
    // Test error handling
  });
});

// Utility Tests
describe("storage utils", () => {
  it("generates correct file paths", () => {
    // Test path generation
  });
});
```

## Performance Considerations

- **Parallel Downloads**: All 5 level files downloaded simultaneously
- **React Query Caching**: Services cached for 2 minutes, absentees for 5 minutes
- **Pagination**: Limits data transfer and rendering load
- **keepPreviousData**: Shows previous page while fetching new page
- **Prefetching**: Can prefetch next page for smoother navigation

## Future Enhancements

- [ ] Export absentees to CSV/Excel
- [ ] Filter by level
- [ ] Search by matric number or name
- [ ] Bulk clearance from absentees list
- [ ] Real-time updates via Supabase subscriptions
- [ ] Absentee trends and analytics
