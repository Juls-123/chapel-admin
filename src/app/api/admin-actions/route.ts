import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Action templates for consistency
const ACTION_TEMPLATES = {
  // Exeat actions
  APPROVE_EXEAT: (studentName: string) => `Approved Exeat for ${studentName}`,
  REJECT_EXEAT: (studentName: string) => `Rejected Exeat for ${studentName}`,
  
  // Service actions  
  CREATE_SERVICE: (serviceName: string) => `Created Service ${serviceName}`,
  CANCEL_SERVICE: (serviceName: string) => `Cancelled Service ${serviceName}`,
  UPDATE_SERVICE: (serviceName: string) => `Updated Service ${serviceName}`,
  
  // Student actions
  MANUALLY_CLEAR: (studentName: string) => `Manually Cleared ${studentName}`,
  MARK_PRESENT: (studentName: string) => `Marked Present ${studentName}`,
  MARK_ABSENT: (studentName: string) => `Marked Absent ${studentName}`,
  
  // Warning actions
  GENERATE_WARNINGS: (week: string, count: number) => `Generated ${count} warning letters for week ${week}`,
  SEND_WARNING: (studentName: string) => `Sent warning letter to ${studentName}`,
  BULK_SEND_WARNINGS: (count: number) => `Sent ${count} pending warning letters`,
  GENERATE_WARNING_PDF: (studentName: string) => `Generated PDF warning letter for ${studentName}`,
  UPDATE_WARNING: (studentName: string) => `Updated warning letter for ${studentName}`,
  
  // Generic actions
  CUSTOM: (action: string) => action
} as const;

const createAdminActionSchema = z.object({
  // Use template key for consistency
  action_template: z.string().optional(),
  
  // Or allow custom action (fallback)
  action: z.string().min(1, 'Action is required'),
  
  object_type: z.enum(['exeat', 'service', 'student', 'admin', 'system', 'warning']).optional(),
  object_id: z.string().optional(),
  object_label: z.string().optional(),
  
  // Structured details for better formatting
  details: z.object({
    reason: z.string().optional(),
    description: z.string().optional(),
    metadata: z.record(z.any()).optional(),
  }).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { data: admin, error: adminError } = await supabaseAdmin
      .from('admins')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single();

    if (adminError || !admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Enhanced query with better formatting
    const { data, error } = await supabaseAdmin
      .from('admin_actions')
      .select(`
        id,
        action,
        object_type,
        object_id,
        object_label,
        details,
        created_at,
        admins!admin_actions_admin_id_fkey(
          first_name,
          last_name
        )
      `)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching admin actions:', error);
      return NextResponse.json({ error: 'Failed to fetch admin actions' }, { status: 500 });
    }

    // Transform data for better display
    const transformedData = data?.map((item: any) => ({
      id: item.id,
      action: item.action,
      object_type: item.object_type,
      object_id: item.object_id,
      object_label: item.object_label,
      details: item.details,
      created_at: item.created_at,
      admin_name: item.admins ? 
        `${item.admins.first_name} ${item.admins.last_name}` : 
        'System',
      // Format for display
      display_text: formatActionForDisplay(item),
      formatted_date: formatDateForDisplay(item.created_at),
    })) || [];

    return NextResponse.json(transformedData);
  } catch (error) {
    console.error('Admin actions API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { data: admin, error: adminError } = await supabaseAdmin
      .from('admins')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single();

    if (adminError || !admin) {
      return NextResponse.json({ error: 'Admin profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const validationResult = createAdminActionSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: validationResult.error.errors 
      }, { status: 400 });
    }

    const { action_template, action, object_type, object_id, object_label, details } = validationResult.data;

    // Use template if provided, otherwise use custom action
    let finalAction = action;
    if (action_template && ACTION_TEMPLATES[action_template as keyof typeof ACTION_TEMPLATES]) {
      const template = ACTION_TEMPLATES[action_template as keyof typeof ACTION_TEMPLATES];
      if (typeof template === 'function') {
        // Handle templates that need different arguments
        const templateName = action_template as keyof typeof ACTION_TEMPLATES;
        if (templateName === 'GENERATE_WARNINGS') {
          // GENERATE_WARNINGS needs week and count
          const count = details?.metadata?.count || 0;
          const week = details?.metadata?.week || object_label || '';
          finalAction = (template as any)(week, count);
        } else if (templateName === 'BULK_SEND_WARNINGS') {
          // BULK_SEND_WARNINGS needs only count
          const count = details?.metadata?.count || 0;
          finalAction = (template as any)(count);
        } else {
          // Standard single argument templates
          finalAction = template(object_label || '');
        }
      } else {
        finalAction = template;
      }
    }

    const { data: newAction, error: insertError } = await supabaseAdmin
      .from('admin_actions')
      .insert({
        admin_id: admin.id,
        action: finalAction,
        object_type,
        object_id,
        object_label,
        details,
      })
      .select(`
        id,
        action,
        object_type,
        object_id,
        object_label,
        details,
        created_at,
        admins!admin_actions_admin_id_fkey(first_name, last_name)
      `)
      .single();

    if (insertError) {
      console.error('Error creating admin action:', insertError);
      return NextResponse.json({ 
        error: 'Failed to create admin action'
      }, { status: 500 });
    }

    const transformedData = {
      ...newAction,
      admin_name: (newAction as any).admins ? 
        `${(newAction as any).admins.first_name} ${(newAction as any).admins.last_name}` : 
        'System',
      display_text: formatActionForDisplay(newAction),
      formatted_date: formatDateForDisplay((newAction as any).created_at),
      admins: undefined,
    };

    return NextResponse.json(transformedData, { status: 201 });
  } catch (error) {
    console.error('Admin action creation API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper functions for formatting
function formatActionForDisplay(action: any): string {
  const reason = action.details?.reason;
  if (reason) {
    return `${action.action}\n${reason}`;
  }
  
  const description = action.details?.description;
  if (description) {
    return `${action.action}\n${description}`;
  }
  
  return action.action;
}

function formatDateForDisplay(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric'
  });
}

// Export helper function for easy logging from other parts of your app
export class AdminActionLogger {
  static async logExeatApproval(studentName: string, reason: string, adminToken: string) {
    return this.logAction({
      action_template: 'APPROVE_EXEAT',
      object_type: 'exeat',
      object_label: studentName,
      details: { reason: `Approved for '${reason}'` }
    }, adminToken);
  }
  
  static async logServiceCreation(serviceName: string, description: string, adminToken: string) {
    return this.logAction({
      action_template: 'CREATE_SERVICE',
      object_type: 'service', 
      object_label: serviceName,
      details: { description }
    }, adminToken);
  }
  
  static async logManualClear(studentName: string, reason: string, adminToken: string) {
    return this.logAction({
      action_template: 'MANUALLY_CLEAR',
      object_type: 'student',
      object_label: studentName, 
      details: { reason: `Cleared for ${reason}` }
    }, adminToken);
  }
  
  static async logServiceCancellation(serviceName: string, reason: string, adminToken: string) {
    return this.logAction({
      action_template: 'CANCEL_SERVICE',
      object_type: 'service',
      object_label: serviceName,
      details: { reason: `Cancelled due to ${reason}` }
    }, adminToken);
  }
  
  private static async logAction(payload: any, adminToken: string) {
    const response = await fetch('/api/admin-actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify(payload)
    });
    
    return response.json();
  }
}