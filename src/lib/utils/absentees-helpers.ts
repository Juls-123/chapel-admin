// src/lib/utils/absentees-helpers.ts

/**
 * Absentee record structure from storage files
 */
export interface AbsenteeRecord {
  student_id: string;
  matric_number: string;
  student_name: string;
  level: string;
  gender: string;
  unique_id: string;
}

/**
 * Consolidated absentee record with level info
 */
export interface ConsolidatedAbsentee {
  matric_number: string;
  student_name: string;
  level: string;
  student_id: string;
}

/**
 * Level-specific absentee data
 */
export interface LevelAbsenteeData {
  level: string;
  count: number;
  absentees: AbsenteeRecord[];
}

/**
 * Paginated response structure
 */
export interface PaginatedAbsentees {
  data: ConsolidatedAbsentee[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
  summary: {
    totalAbsentees: number;
    byLevel: Record<string, number>;
  };
}

/**
 * Parse and validate absentee records from JSON
 */
export function parseAbsenteeRecords(
  data: unknown,
  level: string
): AbsenteeRecord[] {
  if (!Array.isArray(data)) {
    console.warn(`Invalid absentee data for level ${level}, expected array`);
    return [];
  }

  return data
    .filter((record): record is AbsenteeRecord => {
      return (
        typeof record === "object" &&
        record !== null &&
        "student_id" in record &&
        "matric_number" in record &&
        "student_name" in record
      );
    })
    .map((record) => ({
      ...record,
      level, // Ensure level is set correctly
    }));
}

/**
 * Merge absentee records from multiple levels
 * Removes duplicates based on student_id
 */
export function mergeAbsenteeRecords(
  levelData: LevelAbsenteeData[]
): AbsenteeRecord[] {
  const recordMap = new Map<string, AbsenteeRecord>();

  for (const { absentees } of levelData) {
    for (const record of absentees) {
      // Use student_id as unique key, keep first occurrence
      if (!recordMap.has(record.student_id)) {
        recordMap.set(record.student_id, record);
      }
    }
  }

  return Array.from(recordMap.values());
}

/**
 * Transform to consolidated format (matric, name, level only)
 */
export function toConsolidatedFormat(
  records: AbsenteeRecord[]
): ConsolidatedAbsentee[] {
  return records.map((record) => ({
    matric_number: record.matric_number,
    student_name: record.student_name,
    level: record.level,
    student_id: record.student_id,
  }));
}

/**
 * Sort absentees by level and matric number
 */
export function sortAbsentees(
  absentees: ConsolidatedAbsentee[]
): ConsolidatedAbsentee[] {
  return absentees.sort((a, b) => {
    // First sort by level
    const levelCompare = a.level.localeCompare(b.level);
    if (levelCompare !== 0) return levelCompare;

    // Then by matric number
    return a.matric_number.localeCompare(b.matric_number);
  });
}

/**
 * Paginate absentees list
 */
export function paginateAbsentees(
  absentees: ConsolidatedAbsentee[],
  page: number,
  pageSize: number
): PaginatedAbsentees {
  const totalCount = absentees.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  // Calculate summary by level
  const byLevel = absentees.reduce((acc, absentee) => {
    acc[absentee.level] = (acc[absentee.level] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    data: absentees.slice(startIndex, endIndex),
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages,
    },
    summary: {
      totalAbsentees: totalCount,
      byLevel,
    },
  };
}

/**
 * Calculate absentee counts by level
 */
export function calculateLevelCounts(
  levelData: LevelAbsenteeData[]
): Record<string, number> {
  return levelData.reduce((acc, { level, count }) => {
    acc[level] = count;
    return acc;
  }, {} as Record<string, number>);
}