// Generated from /docs/schemas/schema-v1.sql — review types for precision
// PHASE 2: Replace src/services/authService.ts with Supabase wrapper - no other changes to callsites required.

import { z } from 'zod';

// Enums from database
export const serviceTypeEnum = z.enum(['morning', 'evening', 'special']);
export const serviceStatusEnum = z.enum(['scheduled', 'active', 'completed', 'canceled']);

export const serviceSchema = z.object({
  id: z.string().uuid(),
  type: serviceTypeEnum,
  name: z.string().optional(), // required for special services
  service_date: z.string().refine(s => !isNaN(Date.parse(s)), { message: 'Invalid date' }),
  status: serviceStatusEnum.default('scheduled'),
  created_by: z.string().uuid().optional(),
  created_at: z.string().refine(s => !isNaN(Date.parse(s)), { message: 'Invalid datetime' }),
  locked_after_ingestion: z.boolean().default(false)
});

export const serviceCreateSchema = serviceSchema.omit({ 
  id: true, 
  created_at: true 
});

export const serviceUpdateSchema = serviceCreateSchema.partial();

export type Service = z.infer<typeof serviceSchema>;
export type ServiceCreate = z.infer<typeof serviceCreateSchema>;
export type ServiceUpdate = z.infer<typeof serviceUpdateSchema>;
export type ServiceType = z.infer<typeof serviceTypeEnum>;
export type ServiceStatus = z.infer<typeof serviceStatusEnum>;

// Enhanced schemas for API operations
export const serviceQuerySchema = z.object({
  page: z.string().transform(Number).optional().default('1'),
  limit: z.string().transform(Number).optional().default('10'),
  type: serviceTypeEnum.optional(),
  status: serviceStatusEnum.optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  search: z.string().optional(),
});

export const serviceCreateRequestSchema = z.object({
  type: serviceTypeEnum,
  name: z.string().optional(),
  service_date: z.string().refine(s => !isNaN(Date.parse(s)), { message: 'Invalid date' }),
  applicable_levels: z.array(z.string()).optional(), // Level codes like ["100", "200"]
  constraints: z.record(z.any()).optional(), // JSON constraints
}).refine((data) => {
  if (data.type === 'special') {
    return !!data.name && data.name.length > 0;
  }
  return true;
}, {
  message: 'A name is required for special services.',
  path: ['name'],
});

export type ServiceQuery = z.infer<typeof serviceQuerySchema>;
export type ServiceCreateRequest = z.infer<typeof serviceCreateRequestSchema>;

// Validation test (Node.js only - skip in browser/Next.js)
if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  const testService = {
    id: '9d0e1f23-cccc-dddd-eeee-0123456789ef',
    type: 'morning' as const,
    name: 'Sunday Morning Service',
    service_date: '2024-01-07',
    status: 'scheduled' as const,
    created_at: new Date().toISOString(),
    locked_after_ingestion: false
  };
  console.log('Service schema validation:', serviceSchema.safeParse(testService));
}
