// src/lib/utils/warning-letters/date-collector.ts

import { generateAttendancePath, downloadJsonFile } from '@/lib/utils/storage';
import type { AbsenteeRecord } from '@/lib/utils/absentees-helpers';

/**
 * Service metadata structure
 */
export interface ServiceMetadata {
  serviceId: string;
  date: string;
  label: string;
  time?: string;
  type?: string;
}

/**
 * Attendance data for a specific service
 */
export interface ServiceAttendanceData {
  service: ServiceMetadata;
  absenteesByLevel: Map<string, AbsenteeRecord[]>;
  totalAbsentees: number;
}

/**
 * Date range for batch or weekly processing
 */
export interface DateRange {
  startDate: string;
  endDate: string;
  dates: string[];
}

export class DateCollectorError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "DateCollectorError";
  }
}

/**
 * Collect all dates between start and end (inclusive)
 */
export function collectDateRange(startDate: string, endDate: string): DateRange {
  const dates: string[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  if (current > end) {
    throw new DateCollectorError(
      'Start date must be before or equal to end date',
      'INVALID_DATE_RANGE',
      { startDate, endDate }
    );
  }

  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }

  return {
    startDate,
    endDate,
    dates,
  };
}

/**
 * Collect attendance data for a single service on a specific date
 */
export async function collectServiceAttendance(
  date: string,
  serviceId: string,
  serviceMeta: Omit<ServiceMetadata, 'serviceId' | 'date'>,
  levels: string[] = ['100', '200', '300', '400', '500']
): Promise<ServiceAttendanceData> {
  const absenteesByLevel = new Map<string, AbsenteeRecord[]>();
  let totalAbsentees = 0;

  await Promise.all(
    levels.map(async (level) => {
      const path = generateAttendancePath(
        date,
        serviceId,
        level,
        'absentees.json'
      );

      try {
        const data = await downloadJsonFile<AbsenteeRecord[]>(path);
        
        if (data && Array.isArray(data)) {
          const validRecords = data.map(record => ({
            ...record,
            level, // Ensure level is set
          }));
          
          absenteesByLevel.set(level, validRecords);
          totalAbsentees += validRecords.length;
        } else {
          // No data for this level - set empty array
          absenteesByLevel.set(level, []);
        }
      } catch (error) {
        console.warn(`Failed to load absentees for ${date}/${serviceId}/${level}:`, error);
        absenteesByLevel.set(level, []);
      }
    })
  );

  return {
    service: {
      serviceId,
      date,
      ...serviceMeta,
    },
    absenteesByLevel,
    totalAbsentees,
  };
}

/**
 * Collect attendance data for multiple services across multiple dates
 */
export async function collectMultiServiceAttendance(
  services: Array<{
    date: string;
    serviceId: string;
    meta: Omit<ServiceMetadata, 'serviceId' | 'date'>;
  }>,
  levels?: string[]
): Promise<ServiceAttendanceData[]> {
  const results = await Promise.all(
    services.map(({ date, serviceId, meta }) =>
      collectServiceAttendance(date, serviceId, meta, levels)
    )
  );

  return results;
}

/**
 * Collect all services within a date range
 * NOTE: This requires a service registry or database query to know which services exist
 */
export async function collectServicesInDateRange(
  dateRange: DateRange,
  serviceRegistry: Map<string, ServiceMetadata[]> // Map of date -> services on that date
): Promise<ServiceAttendanceData[]> {
  const allServices: Array<{
    date: string;
    serviceId: string;
    meta: Omit<ServiceMetadata, 'serviceId' | 'date'>;
  }> = [];

  // Collect all services that occurred in the date range
  for (const date of dateRange.dates) {
    const servicesOnDate = serviceRegistry.get(date);
    if (servicesOnDate) {
      for (const service of servicesOnDate) {
        allServices.push({
          date: service.date,
          serviceId: service.serviceId,
          meta: {
            label: service.label,
            time: service.time,
            type: service.type,
          },
        });
      }
    }
  }

  if (allServices.length === 0) {
    console.warn('No services found in date range', dateRange);
    return [];
  }

  return collectMultiServiceAttendance(allServices);
}

/**
 * Merge absentees from multiple services, removing duplicates by student_id
 */
export function mergeServiceAbsentees(
  serviceData: ServiceAttendanceData[]
): Map<string, AbsenteeRecord & { services: ServiceMetadata[] }> {
  const mergedMap = new Map<string, AbsenteeRecord & { services: ServiceMetadata[] }>();

  for (const { service, absenteesByLevel } of serviceData) {
    for (const [_level, absentees] of absenteesByLevel) {
      for (const absentee of absentees) {
        const existing = mergedMap.get(absentee.student_id);
        
        if (existing) {
          // Add service to existing record
          existing.services.push(service);
        } else {
          // Create new record
          mergedMap.set(absentee.student_id, {
            ...absentee,
            services: [service],
          });
        }
      }
    }
  }

  return mergedMap;
}

/**
 * Filter absentees by minimum miss count threshold
 */
export function filterByMissCount(
  mergedAbsentees: Map<string, AbsenteeRecord & { services: ServiceMetadata[] }>,
  minMissCount: number
): Array<AbsenteeRecord & { services: ServiceMetadata[] }> {
  return Array.from(mergedAbsentees.values())
    .filter(record => record.services.length >= minMissCount)
    .sort((a, b) => b.services.length - a.services.length);
}