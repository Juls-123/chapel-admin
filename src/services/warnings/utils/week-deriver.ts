// src/lib/utils/warning-letters/week-deriver.ts

/**
 * Week range structure
 */
export interface WeekRange {
    startDate: string; // ISO format YYYY-MM-DD (Monday)
    endDate: string; // ISO format YYYY-MM-DD (Sunday)
    weekNumber: number;
    year: number;
  }
  
  /**
   * Week processing record to prevent overlaps
   */
  export interface WeekProcessingRecord {
    weekId: string; // Format: YYYY-WNN
    startDate: string;
    endDate: string;
    processedAt: string;
    processedBy: string;
    status: 'draft' | 'locked' | 'completed';
  }
  
  export class WeekDeriverError extends Error {
    constructor(
      message: string,
      public code: string,
      public details?: unknown
    ) {
      super(message);
      this.name = "WeekDeriverError";
    }
  }
  
  /**
   * Get the Monday of the week containing the given date
   */
  export function getMondayOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
    return new Date(d.setDate(diff));
  }
  
  /**
   * Get the Sunday of the week containing the given date
   */
  export function getSundayOfWeek(date: Date): Date {
    const monday = getMondayOfWeek(date);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return sunday;
  }
  
  /**
   * Format date to YYYY-MM-DD
   */
  export function formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
  
  /**
   * Get ISO week number
   */
  export function getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }
  
  /**
   * Derive week range from a given date
   */
  export function deriveWeekRange(date: Date | string): WeekRange {
    const inputDate = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(inputDate.getTime())) {
      throw new WeekDeriverError(
        'Invalid date provided',
        'INVALID_DATE',
        { date }
      );
    }
  
    const monday = getMondayOfWeek(inputDate);
    const sunday = getSundayOfWeek(inputDate);
    const weekNumber = getWeekNumber(inputDate);
    const year = monday.getFullYear();
  
    return {
      startDate: formatDate(monday),
      endDate: formatDate(sunday),
      weekNumber,
      year,
    };
  }
  
  /**
   * Generate unique week identifier
   */
  export function generateWeekId(weekRange: WeekRange): string {
    return `${weekRange.year}-W${String(weekRange.weekNumber).padStart(2, '0')}`;
  }
  
  /**
   * Check if two week ranges overlap
   */
  export function weeksOverlap(week1: WeekRange, week2: WeekRange): boolean {
    return !(
      new Date(week1.endDate) < new Date(week2.startDate) ||
      new Date(week1.startDate) > new Date(week2.endDate)
    );
  }
  
  /**
   * Validate that a week hasn't been processed already
   */
  export function validateWeekNotProcessed(
    weekRange: WeekRange,
    processedWeeks: WeekProcessingRecord[]
  ): boolean {
    const weekId = generateWeekId(weekRange);
    
    return !processedWeeks.some(record => {
      // Check exact week ID match
      if (record.weekId === weekId) {
        return true;
      }
      
      // Check for any overlap with completed weeks
      const recordWeek: WeekRange = {
        startDate: record.startDate,
        endDate: record.endDate,
        weekNumber: 0,
        year: 0,
      };
      
      return record.status === 'completed' && weeksOverlap(weekRange, recordWeek);
    });
  }
  
  /**
   * Get all dates in a week range
   */
  export function getDatesInWeek(weekRange: WeekRange): string[] {
    const dates: string[] = [];
    const current = new Date(weekRange.startDate);
    const end = new Date(weekRange.endDate);
  
    while (current <= end) {
      dates.push(formatDate(current));
      current.setDate(current.getDate() + 1);
    }
  
    return dates;
  }
  
  /**
   * Check if a date falls within a week range
   */
  export function isDateInWeek(date: string | Date, weekRange: WeekRange): boolean {
    const checkDate = typeof date === 'string' ? new Date(date) : date;
    const start = new Date(weekRange.startDate);
    const end = new Date(weekRange.endDate);
    
    return checkDate >= start && checkDate <= end;
  }