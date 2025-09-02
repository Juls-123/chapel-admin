// Generated from /docs/schemas/schema-v1.sql — review types for precision
// PHASE 2: Replace src/services/authService.ts with Supabase wrapper - no other changes to callsites required.

import { z } from 'zod';

export const uploadHistorySchema = z.object({
  id: z.string().uuid(),
  uploaded_by: z.string().uuid().optional(),
  filename: z.string().optional(),
  level_id: z.string().uuid().optional(),
  service_date: z.string().refine(s => !isNaN(Date.parse(s)), { message: 'Invalid date' }).optional(),
  status: z.enum(['pending', 'success', 'failed']).optional(),
  error_details: z.record(z.any()).optional(), // detailed error info for failed uploads - jsonb field
  created_at: z.string().refine(s => !isNaN(Date.parse(s)), { message: 'Invalid datetime' })
});

export const uploadHistoryCreateSchema = uploadHistorySchema.omit({ 
  id: true, 
  created_at: true 
});

export const uploadHistoryUpdateSchema = uploadHistoryCreateSchema.partial();

export type UploadHistory = z.infer<typeof uploadHistorySchema>;
export type UploadHistoryCreate = z.infer<typeof uploadHistoryCreateSchema>;
export type UploadHistoryUpdate = z.infer<typeof uploadHistoryUpdateSchema>;

// Validation test
if (require.main === module) {
  const testUpload = {
    id: 'c6901234-ffff-aaaa-bbbb-0123456789fe',
    filename: 'attendance_100L_2024-01-07.csv',
    level_id: '8c9d0eff-bbbb-cccc-dddd-0123456789cd',
    service_date: '2024-01-07',
    status: 'success' as const,
    created_at: new Date().toISOString()
  };
  console.log('Upload history schema validation:', uploadHistorySchema.safeParse(testUpload));
}
