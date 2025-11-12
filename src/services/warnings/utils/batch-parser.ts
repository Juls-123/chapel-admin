// src/lib/utils/warning-letters/batch-parser.ts

import type { ServiceMetadata } from './date-collector';

/**
 * Batch selection input
 */
export interface BatchSelection {
  dates: string[];
  serviceIds: string[];
}

/**
 * Validated batch query
 */
export interface BatchQuery {
  combinations: Array<{
    date: string;
    serviceId: string;
  }>;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  totalServices: number;
}

/**
 * Service registry entry
 */
export interface ServiceRegistryEntry {
  serviceId: string;
  date: string;
  label: string;
  time?: string;
  type?: string;
  active: boolean;
}

export class BatchParserError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "BatchParserError";
  }
}

/**
 * Validate date format (YYYY-MM-DD)
 */
export function isValidDateFormat(date: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(date)) {
    return false;
  }
  
  const d = new Date(date);
  return !isNaN(d.getTime()) && date === d.toISOString().split('T')[0];
}

/**
 * Validate batch selection input
 */
export function validateBatchSelection(selection: BatchSelection): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Validate dates array
  if (!Array.isArray(selection.dates) || selection.dates.length === 0) {
    errors.push('At least one date must be selected');
  } else {
    // Check each date format
    for (const date of selection.dates) {
      if (!isValidDateFormat(date)) {
        errors.push(`Invalid date format: ${date}`);
      }
    }
    
    // Check for duplicate dates
    const uniqueDates = new Set(selection.dates);
    if (uniqueDates.size !== selection.dates.length) {
      errors.push('Duplicate dates found in selection');
    }
  }
  
  // Validate service IDs array
  if (!Array.isArray(selection.serviceIds) || selection.serviceIds.length === 0) {
    errors.push('At least one service must be selected');
  } else {
    // Check for duplicate service IDs
    const uniqueServices = new Set(selection.serviceIds);
    if (uniqueServices.size !== selection.serviceIds.length) {
      errors.push('Duplicate service IDs found in selection');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Parse and construct batch query from selection
 */
export function parseBatchSelection(
  selection: BatchSelection,
  serviceRegistry: Map<string, ServiceRegistryEntry[]>
): BatchQuery {
  // Validate input
  const validation = validateBatchSelection(selection);
  if (!validation.valid) {
    throw new BatchParserError(
      'Invalid batch selection',
      'VALIDATION_FAILED',
      { errors: validation.errors }
    );
  }
  
  // Sort dates to get range
  const sortedDates = [...selection.dates].sort();
  const startDate = sortedDates[0];
  const endDate = sortedDates[sortedDates.length - 1];
  
  // Build combinations of date + service
  const combinations: Array<{ date: string; serviceId: string }> = [];
  const missingServices: string[] = [];
  
  for (const date of selection.dates) {
    const servicesOnDate = serviceRegistry.get(date);
    
    if (!servicesOnDate) {
      console.warn(`No services found for date: ${date}`);
      continue;
    }
    
    for (const serviceId of selection.serviceIds) {
      // Check if this service exists on this date
      const serviceExists = servicesOnDate.some(
        s => s.serviceId === serviceId && s.active
      );
      
      if (serviceExists) {
        combinations.push({ date, serviceId });
      } else {
        missingServices.push(`${serviceId} on ${date}`);
      }
    }
  }
  
  // Warn about missing services
  if (missingServices.length > 0) {
    console.warn('Some services not found:', missingServices);
  }
  
  // Validate we have at least one valid combination
  if (combinations.length === 0) {
    throw new BatchParserError(
      'No valid date-service combinations found',
      'NO_VALID_COMBINATIONS',
      { selection, missingServices }
    );
  }
  
  return {
    combinations,
    dateRange: {
      startDate,
      endDate,
    },
    totalServices: combinations.length,
  };
}

/**
 * Build service metadata map from batch query
 */
export function buildServiceMetadataMap(
  batchQuery: BatchQuery,
  serviceRegistry: Map<string, ServiceRegistryEntry[]>
): Array<{
  date: string;
  serviceId: string;
  meta: Omit<ServiceMetadata, 'serviceId' | 'date'>;
}> {
  return batchQuery.combinations.map(({ date, serviceId }) => {
    const servicesOnDate = serviceRegistry.get(date) || [];
    const service = servicesOnDate.find(s => s.serviceId === serviceId);
    
    if (!service) {
      throw new BatchParserError(
        `Service metadata not found: ${serviceId} on ${date}`,
        'METADATA_NOT_FOUND',
        { date, serviceId }
      );
    }
    
    return {
      date,
      serviceId,
      meta: {
        label: service.label,
        time: service.time,
        type: service.type,
      },
    };
  });
}

/**
 * Optimize batch query by removing redundant combinations
 */
export function optimizeBatchQuery(batchQuery: BatchQuery): BatchQuery {
  // Remove duplicate combinations
  const uniqueCombinations = Array.from(
    new Map(
      batchQuery.combinations.map(c => [
        `${c.date}-${c.serviceId}`,
        c,
      ])
    ).values()
  );
  
  return {
    ...batchQuery,
    combinations: uniqueCombinations,
    totalServices: uniqueCombinations.length,
  };
}

/**
 * Split batch query into smaller chunks for processing
 */
export function splitBatchQuery(
  batchQuery: BatchQuery,
  chunkSize: number = 10
): BatchQuery[] {
  const chunks: BatchQuery[] = [];
  
  for (let i = 0; i < batchQuery.combinations.length; i += chunkSize) {
    const chunkCombinations = batchQuery.combinations.slice(i, i + chunkSize);
    
    chunks.push({
      combinations: chunkCombinations,
      dateRange: batchQuery.dateRange,
      totalServices: chunkCombinations.length,
    });
  }
  
  return chunks;
}

/**
 * Get batch query summary
 */
export interface BatchQuerySummary {
  totalDates: number;
  totalServices: number;
  totalCombinations: number;
  dateRange: string;
  dates: string[];
  serviceIds: string[];
}

export function getBatchQuerySummary(
  batchQuery: BatchQuery,
  selection: BatchSelection
): BatchQuerySummary {
  return {
    totalDates: selection.dates.length,
    totalServices: selection.serviceIds.length,
    totalCombinations: batchQuery.combinations.length,
    dateRange: `${batchQuery.dateRange.startDate} to ${batchQuery.dateRange.endDate}`,
    dates: selection.dates,
    serviceIds: selection.serviceIds,
  };
}