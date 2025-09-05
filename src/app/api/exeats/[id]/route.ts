import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Validation schemas
const updateExeatSchema = z.object({
  start_date: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid start date').optional(),
  end_date: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid end date').optional(),
  reason: z.string().optional(),
  status: z.enum(['active', 'ended', 'cancelled']).optional(),
}).refine((data) => {
  if (data.start_date && data.end_date) {
    const startDate = new Date(data.start_date);
    const endDate = new Date(data.end_date);
    return endDate >= startDate;
  }
  return true;
}, {
  message: 'End date must be on or after start date',
  path: ['end_date'],
});

// Helper function to get authenticated admin from request
async function getAdminFromRequest(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return { error: 'Unauthorized', status: 401 };
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return { error: 'Invalid token', status: 401 };
    }

    // Get admin record with role information
    const { data: admin, error: adminError } = await supabase
      .from('admins')
      .select('id, role, first_name, last_name, email')
      .eq('auth_user_id', user.id)
      .single();

    if (adminError || !admin) {
      return { error: 'Admin access required', status: 403 };
    }

    return { admin };
  } catch (error) {
    return { error: 'Authentication failed', status: 500 };
  }
}

// Helper function to log admin actions
async function logAdminAction(
  adminId: string, 
  action: string, 
  objectType: string | null = null,
  objectId: string | null = null,
  objectLabel: string | null = null,
  details: Record<string, any> = {}
) {
  try {
    await supabase
      .from('admin_actions')
      .insert({
        admin_id: adminId,
        action,
        object_type: objectType,
        object_id: objectId,
        object_label: objectLabel,
        details,
        created_at: new Date().toISOString(),
      });
  } catch (error) {
    console.error('Admin action logging error:', error);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate admin
    const authResult = await getAdminFromRequest(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const exeatId = params.id;

    // Get exeat with student information
    const { data: exeat, error: exeatError } = await supabase
      .from('exeats')
      .select(`
        id,
        student_id,
        start_date,
        end_date,
        reason,
        status,
        created_by,
        created_at,
        students!inner(
          id,
          matric_number,
          first_name,
          middle_name,
          last_name,
          email,
          level_id,
          levels(
            code,
            name
          )
        )
      `)
      .eq('id', exeatId)
      .single();

    if (exeatError || !exeat) {
      return NextResponse.json({ 
        error: 'Exeat not found',
        details: exeatError?.message || 'No exeat found with this ID'
      }, { status: 404 });
    }

    // Transform exeat for response
    const student = Array.isArray(exeat.students) ? exeat.students[0] : exeat.students;
    const level = Array.isArray(student?.levels) ? student.levels[0] : student?.levels;
    
    // Calculate duration and derived status
    const startDate = new Date(exeat.start_date);
    const endDate = new Date(exeat.end_date);
    const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    const today = new Date().toISOString().split('T')[0];
    let derivedStatus = exeat.status;
    if (exeat.status === 'active') {
      if (today < exeat.start_date) derivedStatus = 'upcoming';
      else if (today > exeat.end_date) derivedStatus = 'past';
    }
    
    const transformedExeat = {
      id: exeat.id,
      student_id: exeat.student_id,
      student_name: `${student?.first_name || ''} ${student?.middle_name || ''} ${student?.last_name || ''}`.trim(),
      matric_number: student?.matric_number || '',
      start_date: exeat.start_date,
      end_date: exeat.end_date,
      reason: exeat.reason,
      status: exeat.status,
      created_by: exeat.created_by,
      created_at: exeat.created_at,
      duration_days: durationDays,
      derived_status: derivedStatus
    };

    return NextResponse.json({
      data: transformedExeat
    });

  } catch (error) {
    return NextResponse.json({ 
      error: 'Internal server error',
      details: 'An unexpected error occurred while fetching exeat'
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate admin
    const authResult = await getAdminFromRequest(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { admin } = authResult;
    const exeatId = params.id;

    // Parse and validate request body
    const body = await request.json();
    const validationResult = updateExeatSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validationResult.error.errors
      }, { status: 400 });
    }

    const updateData = validationResult.data;

    // Check if exeat exists first
    const { data: existingExeat, error: fetchError } = await supabase
      .from('exeats')
      .select(`
        id,
        student_id,
        start_date,
        end_date,
        reason,
        status,
        students!inner(
          first_name,
          middle_name,
          last_name,
          matric_number
        )
      `)
      .eq('id', exeatId)
      .single();

    if (fetchError || !existingExeat) {
      return NextResponse.json({ 
        error: 'Exeat not found',
        details: fetchError?.message || 'No exeat found with this ID'
      }, { status: 404 });
    }

    // Check for overlapping exeats if dates are being updated
    if (updateData.start_date || updateData.end_date) {
      const newStartDate = updateData.start_date || existingExeat.start_date;
      const newEndDate = updateData.end_date || existingExeat.end_date;
      
      // Check for overlaps with other active exeats for the same student
      const { data: overlappingExeats, error: overlapError } = await supabase
        .from('exeats')
        .select('id, start_date, end_date')
        .eq('student_id', existingExeat.student_id)
        .eq('status', 'active')
        .neq('id', exeatId);

      if (overlapError) {
        return NextResponse.json({
          error: 'Failed to check for overlapping exeats',
          details: overlapError.message
        }, { status: 500 });
      }

      // Manual overlap check
      const hasOverlap = overlappingExeats?.some(exeat => {
        const existingStart = new Date(exeat.start_date);
        const existingEnd = new Date(exeat.end_date);
        const newStart = new Date(newStartDate);
        const newEnd = new Date(newEndDate);
        
        return newStart <= existingEnd && newEnd >= existingStart;
      });

      if (hasOverlap) {
        return NextResponse.json({
          error: 'Exeat dates overlap with existing active exeat',
          details: 'Student already has an active exeat during this period'
        }, { status: 409 });
      }
    }

    // Update the exeat
    const { data: updatedExeat, error: updateError } = await supabase
      .from('exeats')
      .update(updateData)
      .eq('id', exeatId)
      .select(`
        id,
        student_id,
        start_date,
        end_date,
        reason,
        status,
        created_by,
        created_at,
        students!inner(
          first_name,
          middle_name,
          last_name,
          matric_number
        )
      `)
      .single();

    if (updateError) {
      return NextResponse.json({
        error: 'Failed to update exeat',
        details: updateError.message
      }, { status: 500 });
    }

    // Log admin action
    const student = Array.isArray(updatedExeat.students) ? updatedExeat.students[0] : updatedExeat.students;
    const studentName = `${student?.first_name || ''} ${student?.middle_name || ''} ${student?.last_name || ''}`.trim();
    
    await logAdminAction(
      admin.id,
      'update_exeat',
      'exeat',
      exeatId,
      `Exeat for ${studentName} (${student?.matric_number || 'N/A'})`,
      { updated_fields: Object.keys(updateData), ...updateData }
    );

    // Transform response
    const startDate = new Date(updatedExeat.start_date);
    const endDate = new Date(updatedExeat.end_date);
    const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    const today = new Date().toISOString().split('T')[0];
    let derivedStatus = updatedExeat.status;
    if (updatedExeat.status === 'active') {
      if (today < updatedExeat.start_date) derivedStatus = 'upcoming';
      else if (today > updatedExeat.end_date) derivedStatus = 'past';
    }

    const transformedExeat = {
      id: updatedExeat.id,
      student_id: updatedExeat.student_id,
      student_name: studentName,
      matric_number: student?.matric_number || '',
      start_date: updatedExeat.start_date,
      end_date: updatedExeat.end_date,
      reason: updatedExeat.reason,
      status: updatedExeat.status,
      created_by: updatedExeat.created_by,
      created_at: updatedExeat.created_at,
      duration_days: durationDays,
      derived_status: derivedStatus
    };

    return NextResponse.json({
      data: transformedExeat,
      message: 'Exeat updated successfully'
    });

  } catch (error) {
    return NextResponse.json({ 
      error: 'Internal server error',
      details: 'An unexpected error occurred while updating exeat'
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate admin
    const authResult = await getAdminFromRequest(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { admin } = authResult;
    const exeatId = params.id;

    // Check if exeat exists
    const { data: existingExeat, error: fetchError } = await supabase
      .from('exeats')
      .select(`
        id,
        student_id,
        status,
        students!inner(
          first_name,
          middle_name,
          last_name,
          matric_number
        )
      `)
      .eq('id', exeatId)
      .single();

    if (fetchError || !existingExeat) {
      return NextResponse.json({ 
        error: 'Exeat not found',
        details: fetchError?.message || 'No exeat found with this ID'
      }, { status: 404 });
    }

    // Soft delete by setting status to cancelled
    const { error: deleteError } = await supabase
      .from('exeats')
      .update({ status: 'cancelled' })
      .eq('id', exeatId);

    if (deleteError) {
      return NextResponse.json({
        error: 'Failed to cancel exeat',
        details: deleteError.message
      }, { status: 500 });
    }

    // Log admin action
    const student = Array.isArray(existingExeat.students) ? existingExeat.students[0] : existingExeat.students;
    const studentName = `${student?.first_name || ''} ${student?.middle_name || ''} ${student?.last_name || ''}`.trim();
    
    await logAdminAction(
      admin.id,
      'cancel_exeat',
      'exeat',
      exeatId,
      `Exeat for ${studentName} (${student?.matric_number || 'N/A'})`,
      { previous_status: existingExeat.status }
    );

    return NextResponse.json({
      message: 'Exeat cancelled successfully'
    });

  } catch (error) {
    return NextResponse.json({ 
      error: 'Internal server error',
      details: 'An unexpected error occurred while cancelling exeat'
    }, { status: 500 });
  }
}
