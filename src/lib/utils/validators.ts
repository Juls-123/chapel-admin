// src/lib/utils/validators.ts
import { z } from "zod";

/**
 * Date validation schema (YYYY-MM-DD format)
 */
export const DateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Use YYYY-MM-DD");

/**
 * UUID validation schema
 */
export const UuidSchema = z.string().uuid("Invalid UUID format");

/**
 * Level code validation schema (100, 200, 300, 400, 500)
 */
export const LevelCodeSchema = z
  .string()
  .regex(/^[1-5]00$/, "Level must be 100, 200, 300, 400, or 500");

/**
 * Pagination parameters schema
 */
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Query schema for services by date
 */
export const ServicesQuerySchema = z.object({
  date: DateSchema,
});

/**
 * Query schema for absentees by service
 */
export const AbsenteesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Service ID parameter schema
 */
export const ServiceIdParamSchema = z.object({
  serviceId: UuidSchema,
});