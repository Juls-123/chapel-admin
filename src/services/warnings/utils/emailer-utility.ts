// src/lib/utils/warning-letters/emailer-utility.ts

import type { WarningRecord } from './storage-utility';

/**
 * Email template variables
 */
export interface EmailTemplate {
  subject: string;
  body: string;
  attachPDF?: boolean;
}

/**
 * Email sending result
 */
export interface EmailResult {
  studentId: string;
  success: boolean;
  error?: string;
  sentAt?: string;
}

/**
 * Email batch result
 */
export interface EmailBatchResult {
  total: number;
  sent: number;
  failed: number;
  results: EmailResult[];
}

/**
 * Email configuration
 */
export interface EmailConfig {
  from: string;
  replyTo?: string;
  schoolName: string;
  departmentName: string;
  authorityName?: string;
  authorityTitle?: string;
}

export class EmailError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "EmailError";
  }
}

/**
 * Generate email subject for warning letter
 */
export function generateEmailSubject(
  record: WarningRecord,
  config: EmailConfig
): string {
  return `${config.schoolName} - Attendance Warning Letter`;
}

/**
 * Generate email body for warning letter
 */
export function generateEmailBody(
  record: WarningRecord,
  config: EmailConfig
): string {
  const { schoolName, departmentName, authorityName, authorityTitle } = config;
  
  const servicesList = record.services
    .map((s: { meta: { label: any; date: any; }; }, i: number) => `${i + 1}. ${s.meta.label} - ${s.meta.date}`)
    .join('\n');
  
  return `
Dear ${record.studentName},

This is to inform you that our records indicate you were absent from ${record.missCount} mandatory service(s) between ${record.startDate} and ${record.endDate}.

The following services were missed:
${servicesList}

Attendance at all scheduled services is mandatory. Continued absence may result in disciplinary action. Please ensure you attend all future services.

If you have any valid reasons for your absence, please report to the ${departmentName} office immediately with supporting documentation.

${authorityName && authorityTitle ? `
Sincerely,

${authorityName}
${authorityTitle}
${departmentName}
` : ''}

---
${schoolName}
${departmentName}

This is an automated message. Please do not reply to this email.
`.trim();
}

/**
 * Send warning letter email to a single student
 * NOTE: This is a placeholder - implement with your email service (Resend, SendGrid, etc.)
 */
export async function sendWarningEmail(
  record: WarningRecord,
  config: EmailConfig,
  template?: EmailTemplate
): Promise<EmailResult> {
  try {
    // Validate email
    if (!record.email && !record.parentEmail) {
      return {
        studentId: record.studentId,
        success: false,
        error: 'No email address available',
      };
    }
    
    const recipients = [record.email, record.parentEmail].filter(Boolean) as string[];
    const subject = template?.subject || generateEmailSubject(record, config);
    const body = template?.body || generateEmailBody(record, config);
    
    // TODO: Implement actual email sending
    // Example with Resend:
    // const { data, error } = await resend.emails.send({
    //   from: config.from,
    //   to: recipients,
    //   subject,
    //   text: body,
    //   reply_to: config.replyTo,
    // });
    
    console.log(`Sending email to ${recipients.join(', ')}`, { subject, body });
    
    // Simulated success
    return {
      studentId: record.studentId,
      success: true,
      sentAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      studentId: record.studentId,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send warning emails in batch
 */
export async function sendWarningEmailsBatch(
  warningList: WarningRecord[],
  config: EmailConfig,
  options?: {
    batchSize?: number;
    delayBetweenBatches?: number;
    template?: EmailTemplate;
  }
): Promise<EmailBatchResult> {
  const { batchSize = 10, delayBetweenBatches = 1000, template } = options || {};
  const results: EmailResult[] = [];
  
  // Process in batches to avoid rate limits
  for (let i = 0; i < warningList.length; i += batchSize) {
    const batch = warningList.slice(i, i + batchSize);
    
    const batchResults = await Promise.all(
      batch.map(record => sendWarningEmail(record, config, template))
    );
    
    results.push(...batchResults);
    
    // Delay between batches (except for last batch)
    if (i + batchSize < warningList.length) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }
  
  const sent = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  return {
    total: warningList.length,
    sent,
    failed,
    results,
  };
}

/**
 * Send test email
 */
export async function sendTestEmail(
  testEmail: string,
  config: EmailConfig
): Promise<boolean> {
  try {
    const mockRecord: WarningRecord = {
      studentId: 'test-id',
      studentName: 'Test Student',
      matricNumber: 'TEST/2024/001',
      level: '400',
      email: testEmail,
      services: [
        {
          uid: 'test-service',
          meta: {
            label: 'Test Service',
            date: '2025-01-01',
          },
        },
      ],
      missCount: 1,
      startDate: '2025-01-01',
      endDate: '2025-01-07',
      status: 'not_sent',
    };
    
    const result = await sendWarningEmail(mockRecord, config);
    return result.success;
  } catch (error) {
    console.error('Test email failed:', error);
    return false;
  }
}

/**
 * Validate email configuration
 */
export function validateEmailConfig(config: EmailConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!config.from) {
    errors.push('From email address is required');
  }
  
  if (!config.schoolName) {
    errors.push('School name is required');
  }
  
  if (!config.departmentName) {
    errors.push('Department name is required');
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (config.from && !emailRegex.test(config.from)) {
    errors.push('Invalid from email format');
  }
  
  if (config.replyTo && !emailRegex.test(config.replyTo)) {
    errors.push('Invalid reply-to email format');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}