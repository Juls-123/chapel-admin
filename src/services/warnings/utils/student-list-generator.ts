// src/lib/utils/warning-letters/student-list-generator.ts

import type { AbsenteeRecord } from '@/lib/utils/absentees-helpers';
import type { ServiceMetadata } from './date-collector';
import type { WarningListRecord } from './storage-utility';

/**
 * Student contact information
 */
export interface StudentContactInfo {
  studentId: string;
  email?: string;
  parentEmail?: string;
  phoneNumber?: string;
  parentPhoneNumber?: string;
}

/**
 * Extended absentee record with services
 */
export interface AbsenteeWithServices extends AbsenteeRecord {
  services: ServiceMetadata[];
}

export class StudentListError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "StudentListError";
  }
}

/**
 * Generate warning list records from absentee data
 */
export function generateWarningList(
  absentees: AbsenteeWithServices[],
  dateRange: { startDate: string; endDate: string },
  contactInfoMap?: Map<string, StudentContactInfo>
): WarningListRecord[] {
  return absentees.map(absentee => {
    const contactInfo = contactInfoMap?.get(absentee.student_id);
    
    return {
      studentId: absentee.student_id,
      studentName: absentee.student_name,
      matricNumber: absentee.matric_number,
      level: absentee.level,
      email: contactInfo?.email,
      parentEmail: contactInfo?.parentEmail,
      services: absentee.services.map(service => ({
        uid: service.serviceId,
        meta: {
          label: service.label,
          date: service.date,
        },
      })),
      missCount: absentee.services.length,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      status: 'not_sent',
    };
  });
}

/**
 * Fetch student contact information from database
 * NOTE: This is a placeholder - implement actual DB query based on your schema
 */
export async function fetchStudentContacts(
  studentIds: string[]
): Promise<Map<string, StudentContactInfo>> {
  // TODO: Implement actual database query
  // Example using Supabase:
  // const { data, error } = await supabase
  //   .from('students')
  //   .select('id, email, parent_email, phone_number, parent_phone_number')
  //   .in('id', studentIds);
  
  // For now, return empty map
  console.warn('fetchStudentContacts not implemented - returning empty contacts');
  return new Map();
}

/**
 * Enrich warning list with contact information
 */
export async function enrichWithContactInfo(
  warningList: WarningListRecord[]
): Promise<WarningListRecord[]> {
  const studentIds = warningList.map(record => record.studentId);
  const contactMap = await fetchStudentContacts(studentIds);
  
  return warningList.map(record => {
    const contact = contactMap.get(record.studentId);
    
    if (contact) {
      return {
        ...record,
        email: contact.email,
        parentEmail: contact.parentEmail,
      };
    }
    
    return record;
  });
}

/**
 * Group warning list by level
 */
export function groupByLevel(
  warningList: WarningListRecord[]
): Map<string, WarningListRecord[]> {
  const grouped = new Map<string, WarningListRecord[]>();
  
  for (const record of warningList) {
    const existing = grouped.get(record.level) || [];
    existing.push(record);
    grouped.set(record.level, existing);
  }
  
  return grouped;
}

/**
 * Sort warning list by miss count (descending) and name
 */
export function sortWarningList(
  warningList: WarningListRecord[]
): WarningListRecord[] {
  return [...warningList].sort((a, b) => {
    // First by miss count (descending)
    if (a.missCount !== b.missCount) {
      return b.missCount - a.missCount;
    }
    
    // Then by level
    if (a.level !== b.level) {
      return a.level.localeCompare(b.level);
    }
    
    // Finally by name
    return a.studentName.localeCompare(b.studentName);
  });
}

/**
 * Filter warning list by minimum miss count
 */
export function filterByMinMissCount(
  warningList: WarningListRecord[],
  minCount: number
): WarningListRecord[] {
  return warningList.filter(record => record.missCount >= minCount);
}

/**
 * Get summary statistics for warning list
 */
export interface WarningListSummary {
  totalStudents: number;
  byLevel: Record<string, number>;
  byMissCount: Record<number, number>;
  averageMissCount: number;
  maxMissCount: number;
  minMissCount: number;
}

export function getWarningListSummary(
  warningList: WarningListRecord[]
): WarningListSummary {
  const byLevel: Record<string, number> = {};
  const byMissCount: Record<number, number> = {};
  let totalMissCount = 0;
  let maxMissCount = 0;
  let minMissCount = Infinity;
  
  for (const record of warningList) {
    // Count by level
    byLevel[record.level] = (byLevel[record.level] || 0) + 1;
    
    // Count by miss count
    byMissCount[record.missCount] = (byMissCount[record.missCount] || 0) + 1;
    
    // Update totals
    totalMissCount += record.missCount;
    maxMissCount = Math.max(maxMissCount, record.missCount);
    minMissCount = Math.min(minMissCount, record.missCount);
  }
  
  return {
    totalStudents: warningList.length,
    byLevel,
    byMissCount,
    averageMissCount: warningList.length > 0 ? totalMissCount / warningList.length : 0,
    maxMissCount: warningList.length > 0 ? maxMissCount : 0,
    minMissCount: warningList.length > 0 ? minMissCount : 0,
  };
}