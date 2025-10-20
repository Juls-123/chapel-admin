# Warning Letters Module - Utilities Documentation

This directory contains all utility functions for the Warning Letters workflow system. Each utility is focused, composable, and follows the established codebase patterns.

## 📁 File Structure

```
src/services/warnings/utils/
├── index.ts                    # Main export file
├── week-deriver.ts            # Week range calculations
├── storage-utility.ts         # Storage operations
├── date-collector.ts          # Date and service collection
├── student-list-generator.ts  # Warning list generation
├── export-utility.ts          # Export to CSV/PDF
├── emailer-utility.ts         # Email sending
├── batch-parser.ts            # Batch mode parsing
└── workflow-meta-manager.ts   # Workflow tracking
```

## 🔧 Utilities Overview

### 1. Week Deriver (`week-deriver.ts`)

Handles all week-related calculations and validations.

**Key Functions:**

- `deriveWeekRange(date)` - Get Monday-Sunday range for any date
- `generateWeekId(weekRange)` - Create unique week identifier (YYYY-WNN)
- `validateWeekNotProcessed()` - Prevent duplicate weekly processing
- `getDatesInWeek(weekRange)` - Get all dates in a week

**Example:**

```typescript
import { deriveWeekRange, generateWeekId } from "@/lib/utils/warning-letters";

const week = deriveWeekRange("2025-10-15");
// Returns: { startDate: '2025-10-13', endDate: '2025-10-19', weekNumber: 42, year: 2025 }

const weekId = generateWeekId(week);
// Returns: '2025-W42'
```

### 2. Storage Utility (`storage-utility.ts`)

Manages saving and loading warning lists and meta reports to Supabase storage.

**Key Functions:**

- `saveWarningList(workflowId, warningList)` - Save warning records
- `loadWarningList(workflowId)` - Load warning records
- `saveMetaReport(report)` - Save workflow metadata
- `loadMetaReport(workflowId)` - Load workflow metadata
- `updateWarningStatus()` - Update individual warning status

**Example:**

```typescript
import { saveWarningList, loadMetaReport } from "@/lib/utils/warning-letters";

// Save warning list
await saveWarningList("workflow-123", warningRecords);

// Load meta report
const report = await loadMetaReport("workflow-123");
```

### 3. Date Collector (`date-collector.ts`)

Collects and aggregates attendance data across dates and services.

**Key Functions:**

- `collectDateRange(start, end)` - Generate array of dates
- `collectServiceAttendance()` - Get attendance for one service
- `collectMultiServiceAttendance()` - Get attendance for multiple services
- `mergeServiceAbsentees()` - Merge absentees removing duplicates
- `filterByMissCount()` - Filter by minimum absences

**Example:**

```typescript
import {
  collectServiceAttendance,
  mergeServiceAbsentees,
} from "@/lib/utils/warning-letters";

// Collect attendance for a service
const serviceData = await collectServiceAttendance(
  "2025-10-15",
  "morning-devotion",
  { label: "Morning Devotion" }
);

// Merge multiple services
const merged = mergeServiceAbsentees([serviceData1, serviceData2]);
```

### 4. Student List Generator (`student-list-generator.ts`)

Generates warning list records with proper formatting and contact info.

**Key Functions:**

- `generateWarningList()` - Convert absentees to warning records
- `enrichWithContactInfo()` - Add email addresses
- `groupByLevel()` - Group warnings by student level
- `sortWarningList()` - Sort by miss count and name
- `getWarningListSummary()` - Get statistics

**Example:**

```typescript
import {
  generateWarningList,
  getWarningListSummary,
} from "@/lib/utils/warning-letters";

const warningList = generateWarningList(absenteesWithServices, {
  startDate: "2025-10-13",
  endDate: "2025-10-19",
});

const summary = getWarningListSummary(warningList);
// Returns: { totalStudents: 230, byLevel: {...}, averageMissCount: 3.2, ... }
```

### 5. Export Utility (`export-utility.ts`)

Exports warning lists to various formats.

**Key Functions:**

- `exportWarningListToCSV()` - Export to CSV
- `exportWarningListToPDF()` - Export summary PDF
- `generateIndividualWarningLetter()` - Create single letter PDF
- `exportIndividualLettersBatch()` - Batch export individual letters

**Example:**

```typescript
import { exportWarningListToPDF } from "@/lib/utils/warning-letters";

exportWarningListToPDF(warningList, {
  filename: "warning-letters-week42",
  title: "Weekly Warning Letters",
  subtitle: "Week 42 - Oct 13-19, 2025",
  groupByLevel: true,
});
```

### 6. Emailer Utility (`emailer-utility.ts`)

Handles email sending with batching and rate limiting.

**Key Functions:**

- `sendWarningEmail()` - Send to single student
- `sendWarningEmailsBatch()` - Send to multiple students
- `sendTestEmail()` - Test email configuration
- `validateEmailConfig()` - Validate email settings

**Example:**

```typescript
import { sendWarningEmailsBatch } from "@/lib/utils/warning-letters";

const config = {
  from: "attendance@school.edu",
  schoolName: "University of Example",
  departmentName: "Chapel Services",
};

const result = await sendWarningEmailsBatch(warningList, config, {
  batchSize: 10,
  delayBetweenBatches: 1000,
});

console.log(`Sent: ${result.sent}, Failed: ${result.failed}`);
```

### 7. Batch Parser (`batch-parser.ts`)

Validates and parses batch mode selections.

**Key Functions:**

- `validateBatchSelection()` - Validate date/service selection
- `parseBatchSelection()` - Parse into query structure
- `buildServiceMetadataMap()` - Build service details
- `getBatchQuerySummary()` - Get selection summary

**Example:**

```typescript
import { parseBatchSelection } from "@/lib/utils/warning-letters";

const selection = {
  dates: ["2025-10-13", "2025-10-14", "2025-10-15"],
  serviceIds: ["morning-devotion", "evening-devotion"],
};

const query = parseBatchSelection(selection, serviceRegistry);
// Returns: { combinations: [...], dateRange: {...}, totalServices: 6 }
```

### 8. Workflow Meta Manager (`workflow-meta-manager.ts`)

Manages workflow lifecycle and tracking.

**Key Functions:**

- `createWorkflow()` - Initialize new workflow
- `updateWorkflow()` - Update workflow state
- `lockWorkflow()` - Lock for processing
- `completeWorkflow()` - Mark as complete
- `isWeekProcessed()` - Check for duplicates
- `getWorkflowStatistics()` - Get stats for date range

**Example:**

```typescript
import { createWorkflow, completeWorkflow } from "@/lib/utils/warning-letters";

// Create workflow
const workflow = await createWorkflow({
  mode: "weekly",
  initiatedBy: "admin-123",
  startDate: "2025-10-13",
  endDate: "2025-10-19",
  servicesProcessed: [
    /* ... */
  ],
});

// Complete workflow
await completeWorkflow(workflow.workflowId, {
  warningsGenerated: 230,
  warningsSent: 200,
  warningsExported: 30,
});
```

## 🔄 Typical Workflow Usage

### Single Mode Workflow

```typescript
import {
  createWorkflow,
  collectServiceAttendance,
  generateWarningList,
  saveWarningList,
  completeWorkflow,
} from "@/lib/utils/warning-letters";

// 1. Create workflow
const workflow = await createWorkflow({
  mode: "single",
  initiatedBy: userId,
  startDate: date,
  endDate: date,
  servicesProcessed: [serviceInfo],
});

// 2. Collect attendance
const serviceData = await collectServiceAttendance(
  date,
  serviceId,
  serviceMeta
);

// 3. Generate warning list
const merged = mergeServiceAbsentees([serviceData]);
const absentees = filterByMissCount(merged, 1);
const warningList = generateWarningList(absentees, {
  startDate: date,
  endDate: date,
});

// 4. Save warning list
await saveWarningList(workflow.workflowId, warningList);

// 5. Complete workflow
await completeWorkflow(workflow.workflowId, {
  warningsGenerated: warningList.length,
  warningsSent: 0,
  warningsExported: 0,
});
```

### Weekly Mode Workflow

```typescript
import {
  deriveWeekRange,
  isWeekProcessed,
  createWorkflow,
  collectServicesInDateRange,
  // ... other imports
} from "@/lib/utils/warning-letters";

// 1. Derive week
const week = deriveWeekRange(selectedDate);

// 2. Check if already processed
const alreadyProcessed = await isWeekProcessed(week.startDate, week.endDate);
if (alreadyProcessed) {
  throw new Error("Week already processed");
}

// 3. Create workflow
const workflow = await createWorkflow({
  mode: "weekly",
  initiatedBy: userId,
  startDate: week.startDate,
  endDate: week.endDate,
  servicesProcessed: servicesInWeek,
});

// 4. Collect all services in week
const allServiceData = await collectServicesInDateRange(
  {
    startDate: week.startDate,
    endDate: week.endDate,
    dates: getDatesInWeek(week),
  },
  serviceRegistry
);

// 5. Process and save
// ... (similar to single mode)
```

## 🛡️ Error Handling

All utilities export custom error classes:

```typescript
try {
  await saveWarningList(workflowId, warningList);
} catch (error) {
  if (error instanceof WarningStorageError) {
    console.error("Storage error:", error.code, error.details);
  }
}
```

Error types:

- `WeekDeriverError` - Week calculation errors
- `WarningStorageError` - Storage operation failures
- `DateCollectorError` - Data collection issues
- `StudentListError` - List generation problems
- `ExportError` - Export failures
- `EmailError` - Email sending failures
- `BatchParserError` - Batch validation errors
- `WorkflowMetaError` - Workflow management errors

## 📊 Data Structures

### WarningListRecord

```typescript
{
  studentId: string;
  studentName: string;
  matricNumber: string;
  level: string;
  email?: string;
  parentEmail?: string;
  services: Array<{
    uid: string;
    meta: { label: string; date: string; };
  }>;
  missCount: number;
  startDate: string;
  endDate: string;
  status: 'not_sent' | 'sent' | 'failed' | 'exported';
}
```

### WorkflowMetaReport

```typescript
{
  workflowId: string;
  mode: "single" | "batch" | "weekly";
  initiatedBy: string;
  startDate: string;
  endDate: string;
  servicesProcessed: Array<{
    serviceId: string;
    date: string;
    label: string;
  }>;
  studentCount: number;
  warningsGenerated: number;
  warningsSent: number;
  warningsExported: number;
  generatedAt: string;
  status: "draft" | "locked" | "completed" | "failed";
}
```

## 🔍 Testing

Each utility can be tested independently:

```typescript
import { deriveWeekRange } from "@/lib/utils/warning-letters";

describe("Week Deriver", () => {
  it("should derive correct week range", () => {
    const week = deriveWeekRange("2025-10-15");
    expect(week.startDate).toBe("2025-10-13");
    expect(week.endDate).toBe("2025-10-19");
  });
});
```

## 📝 Notes

1. **Storage Paths**: All files are stored under `warning-letters/{workflowId}/` in Supabase storage
2. **Contact Info**: The `fetchStudentContacts()` function needs implementation based on your database schema
3. **Email Sending**: The emailer utility has placeholder implementation - integrate with Resend/SendGrid
4. **Rate Limiting**: Email batching includes configurable rate limiting
5. **Concurrency**: Week validation prevents overlapping weekly workflows

## 🚀 Next Steps

- Implement actual email sending (Resend/SendGrid)
- Add student contacts database integration
- Create API routes that use these utilities
- Build UI components for each workflow mode
- Add comprehensive error tracking and logging
