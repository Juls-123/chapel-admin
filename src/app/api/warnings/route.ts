import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { WarningActions } from '@/lib/admin-actions';

// Initialize Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Validation schemas
const warningQuerySchema = z.object({
  week_start: z.string().optional().nullable(),
  status: z.enum(['none', 'pending', 'sent']).optional().nullable(),
  page: z.string().optional().nullable(),
  limit: z.string().optional().nullable(),
}).transform((data) => ({
  week_start: data.week_start || undefined,
  status: data.status || undefined,
  page: data.page || '1',
  limit: data.limit || '10',
}));

const updateWarningSchema = z.object({
  matric_number: z.string(),
  status: z.enum(['pending', 'sent']),
});

const bulkUpdateSchema = z.object({
  week_start: z.string(),
  status: z.enum(['sent']),
});

export async function GET(request: NextRequest) {
  try {
    // Get the current user from the session
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if user is an admin
    const { data: admin, error: adminError } = await supabaseAdmin
      .from('admins')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single();

    if (adminError || !admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Parse query parameters
    const url = new URL(request.url);
    const validation = warningQuerySchema.safeParse({
      week_start: url.searchParams.get('week_start'),
      status: url.searchParams.get('status'),
      page: url.searchParams.get('page'),
      limit: url.searchParams.get('limit'),
    });

    if (!validation.success) {
      console.error('❌ Warning API validation failed:', {
        input: Object.fromEntries(url.searchParams),
        errors: validation.error.errors
      });
      return NextResponse.json({ 
        error: 'Invalid query parameters',
        details: validation.error.errors,
        received: Object.fromEntries(url.searchParams)
      }, { status: 400 });
    }

    const { week_start, status, page = '1', limit = '10' } = validation.data;
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100); // Cap at 100
    const offset = (pageNum - 1) * limitNum;

    // Build query for warning weekly snapshots with student details
    let query = supabaseAdmin
      .from('warning_weekly_snapshot')
      .select(`
        student_id,
        week_start,
        absences,
        warning_status,
        first_created_at,
        last_updated_at,
        sent_at,
        sent_by,
        students!inner(
          matric_number,
          first_name,
          middle_name,
          last_name,
          email,
          parent_email,
          parent_phone,
          gender,
          department,
          status,
          levels!students_level_id_fkey(code, name)
        )
      `, { count: 'exact' })
      .eq('students.status', 'active')
      .order('week_start', { ascending: false })
      .order('absences', { ascending: false });

    // Apply filters
    if (week_start) {
      query = query.eq('week_start', week_start);
    }

    if (status) {
      query = query.eq('warning_status', status);
    }

    // Execute query with pagination
    const { data, error, count } = await query.range(offset, offset + limitNum - 1);

    if (error) {
      console.error('Error fetching warning letters:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch warning letters',
        details: error.message 
      }, { status: 500 });
    }

    // Transform data to match UI expectations
    const transformedData = data?.map((warning: any) => {
      const student = warning.students;
      return {
        matric_number: student.matric_number,
        student_name: `${student.first_name} ${student.middle_name ? student.middle_name + ' ' : ''}${student.last_name}`,
        week_start: new Date(warning.week_start),
        miss_count: warning.absences,
        status: warning.warning_status,
        first_created_at: warning.first_created_at,
        last_updated_at: warning.last_updated_at,
        sent_at: warning.sent_at,
        sent_by: warning.sent_by,
        student_details: {
          id: warning.student_id,
          email: student.email,
          parent_email: student.parent_email,
          parent_phone: student.parent_phone,
          gender: student.gender,
          department: student.department,
          level: student.levels?.code ? parseInt(student.levels.code) : null,
          level_name: student.levels?.name,
        }
      };
    });

    return NextResponse.json({
      data: transformedData || [],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limitNum),
      },
    });

  } catch (error) {
    console.error('Warning letters API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: 'An unexpected error occurred while fetching warning letters'
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Get the current user from the session
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if user is an admin
    const { data: admin, error: adminError } = await supabaseAdmin
      .from('admins')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single();

    if (adminError || !admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    
    // Check if this is a bulk update
    if ('week_start' in body && !('matric_number' in body)) {
      const validation = bulkUpdateSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json({ 
          error: 'Invalid bulk update data',
          details: validation.error.errors 
        }, { status: 400 });
      }

      const { week_start, status } = validation.data;

      // Update all pending/failed warnings for the week
      const { data: updatedWarnings, error: updateError } = await supabaseAdmin
        .from('warning_weekly_snapshot')
        .update({
          warning_status: status,
          sent_at: new Date().toISOString(),
          sent_by: admin.id,
          last_updated_at: new Date().toISOString(),
        })
        .eq('week_start', week_start)
        .in('warning_status', ['pending', 'failed'])
        .select('student_id');

      if (updateError) {
        console.error('Error bulk updating warning letters:', updateError);
        return NextResponse.json({ 
          error: 'Failed to bulk update warning letters',
          details: updateError.message 
        }, { status: 500 });
      }

      // Log admin action using centralized system
      const updatedCount = updatedWarnings?.length || 0;
      await WarningActions.bulkSendWarnings(updatedCount, token);

      return NextResponse.json({
        message: 'Warning letters sent successfully',
        count: updatedCount,
      });
    }

    // Individual warning update
    const validation = updateWarningSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid update data',
        details: validation.error.errors 
      }, { status: 400 });
    }

    const { matric_number, status } = validation.data;

    // Get the warning record with student details
    const { data: warning, error: fetchError } = await supabaseAdmin
      .from('warning_weekly_snapshot')
      .select(`
        student_id,
        warning_status,
        students!inner(
          matric_number,
          first_name,
          last_name
        )
      `)
      .eq('students.matric_number', matric_number)
      .single();

    if (fetchError || !warning) {
      return NextResponse.json({ 
        error: 'Warning letter not found',
        details: fetchError?.message || 'No warning found for this student'
      }, { status: 404 });
    }

    // Update the warning status
    const { error: updateError } = await supabaseAdmin
      .from('warning_weekly_snapshot')
      .update({
        warning_status: status,
        sent_at: status === 'sent' ? new Date().toISOString() : null,
        sent_by: status === 'sent' ? admin.id : null,
        last_updated_at: new Date().toISOString(),
      })
      .eq('student_id', warning.student_id);

    if (updateError) {
      console.error('Error updating warning letter:', updateError);
      return NextResponse.json({ 
        error: 'Failed to update warning letter',
        details: updateError.message 
      }, { status: 500 });
    }

    // Log admin action using centralized system
    const student = warning.students as any;
    const studentName = `${student.first_name} ${student.last_name}`;
    if (status === 'sent') {
      await WarningActions.sendWarning(studentName, warning.student_id, token);
    } else {
      await WarningActions.updateWarning(studentName, warning.student_id, status, token);
    }

    return NextResponse.json({
      message: 'Warning letter updated successfully',
      data: {
        matric_number,
        status,
        updated_at: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('Warning letter update error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: 'An unexpected error occurred while updating warning letter'
    }, { status: 500 });
  }
}
