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

// Validation test
if (require.main === module) {
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
