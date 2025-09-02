// Generated from /docs/schemas/schema-v1.sql — review types for precision
// PHASE 2: Replace src/services/authService.ts with Supabase wrapper - no other changes to callsites required.

import { z } from 'zod';

export const adminActionSchema = z.object({
  id: z.string().uuid(),
  admin_id: z.string().uuid().optional(),
  action: z.string(), // "created_service", "sent_warning", "approved_exeat"
  object_type: z.string().optional(), // "student", "service", "exeat"
  object_id: z.string().uuid().optional(),
  object_label: z.string().optional(), // denormalized name/identifier for display
  details: z.record(z.any()).optional(), // additional context - jsonb field
  created_at: z.string().refine(s => !isNaN(Date.parse(s)), { message: 'Invalid datetime' })
});

export const adminActionCreateSchema = adminActionSchema.omit({ 
  id: true, 
  created_at: true 
});

export const adminActionUpdateSchema = adminActionCreateSchema.partial();

export type AdminAction = z.infer<typeof adminActionSchema>;
export type AdminActionCreate = z.infer<typeof adminActionCreateSchema>;
export type AdminActionUpdate = z.infer<typeof adminActionUpdateSchema>;

// Validation test
if (require.main === module) {
  const testAction = {
    id: 'a0345678-dddd-eeee-ffff-0123456789cc',
    admin_id: 'ae1f2345-dddd-eeee-ffff-0123456789ab',
    action: 'created_service',
    object_type: 'service',
    object_label: 'Sunday Morning Service',
    details: { service_type: 'morning', date: '2024-01-07' },
    created_at: new Date().toISOString()
  };
  console.log('Admin action schema validation:', adminActionSchema.safeParse(testAction));
}
