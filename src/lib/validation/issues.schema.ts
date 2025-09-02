// Generated from /docs/schemas/schema-v1.sql — review types for precision
// PHASE 2: Replace src/services/authService.ts with Supabase wrapper - no other changes to callsites required.

import { z } from 'zod';

export const issueSchema = z.object({
  id: z.string().uuid(),
  service_id: z.string().uuid().optional(),
  level_id: z.string().uuid().optional(),
  issue_type: z.string(), // "student_not_registered", "duplicate_scan", etc.
  details: z.record(z.any()), // {name, matric, error_context} - jsonb field
  raised_by: z.string().uuid().optional(),
  raised_at: z.string().refine(s => !isNaN(Date.parse(s)), { message: 'Invalid datetime' }),
  resolved: z.boolean().default(false),
  resolved_at: z.string().refine(s => !isNaN(Date.parse(s)), { message: 'Invalid datetime' }).optional(),
  resolved_by: z.string().uuid().optional()
});

export const issueCreateSchema = issueSchema.omit({ 
  id: true, 
  raised_at: true 
});

export const issueUpdateSchema = issueCreateSchema.partial();

export type Issue = z.infer<typeof issueSchema>;
export type IssueCreate = z.infer<typeof issueCreateSchema>;
export type IssueUpdate = z.infer<typeof issueUpdateSchema>;

// Validation test
if (require.main === module) {
  const testIssue = {
    id: 'a4789012-dddd-eeee-ffff-0123456789fc',
    service_id: '9d0e1f23-cccc-dddd-eeee-0123456789ef',
    issue_type: 'student_not_registered',
    details: { name: 'Unknown Student', matric: 'UNK-001', error_context: 'Scanner detected unregistered student' },
    resolved: false,
    raised_at: new Date().toISOString()
  };
  console.log('Issue schema validation:', issueSchema.safeParse(testIssue));
}
