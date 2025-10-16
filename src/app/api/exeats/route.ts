import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/auth/supabase';

// Validation schema for creating exeats (based on actual DB schema)
const exeatSchema = z.object({
  student_id: z.string().uuid(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().optional(),
}).refine((data) => {
  return new Date(data.end_date) >= new Date(data.start_date)
}, {
  message: "End date must be on or after start date",
  path: ["end_date"]
});

// Validation schema for querying exeats
const exeatQuerySchema = z.object({
  page: z.string().optional().default('1').transform(val => parseInt(val, 10)),
  limit: z.string().optional().default('10').transform(val => parseInt(val, 10)),
  status: z.enum(['active', 'ended', 'canceled']).optional(),
  student_id: z.string().uuid().optional(),
  search: z.string().optional(),
  start_date_from: z.string().optional(),
  start_date_to: z.string().optional(),
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
    const { error } = await supabase
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

    if (error) {
      console.error('Failed to log admin action:', error);
    }
  } catch (error) {
    console.error('Admin action logging error:', error);
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate admin
    const authResult = await getAdminFromRequest(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    const validation = exeatQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid query parameters',
        details: validation.error.errors
      }, { status: 400 });
    }

    const params = validation.data;

    // Get total count first
    let countQuery = supabase
      .from('exeats')
      .select('*', { count: 'exact', head: true });

    // Apply same filters for count
    if (params.status) {
      countQuery = countQuery.eq('status', params.status);
    }
    if (params.student_id) {
      countQuery = countQuery.eq('student_id', params.student_id);
    }
    if (params.start_date_from) {
      countQuery = countQuery.gte('start_date', params.start_date_from);
    }
    if (params.start_date_to) {
      countQuery = countQuery.lte('start_date', params.start_date_to);
    }

    const { count, error: countError } = await countQuery;
    
    if (countError) {
      return NextResponse.json({ 
        error: 'Database error',
        details: countError.message 
      }, { status: 500 });
    }

    // Build main query with student information
    let query = supabase
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
      `);

    // Apply filters
    if (params.status) {
      query = query.eq('status', params.status);
    }
    if (params.student_id) {
      query = query.eq('student_id', params.student_id);
    }
    if (params.start_date_from) {
      query = query.gte('start_date', params.start_date_from);
    }
    if (params.start_date_to) {
      query = query.lte('start_date', params.start_date_to);
    }
    if (params.search) {
      query = query.or(`students.first_name.ilike.%${params.search}%,students.last_name.ilike.%${params.search}%,students.matric_number.ilike.%${params.search}%`);
    }

    // Apply pagination and ordering
    const offset = (params.page - 1) * params.limit;
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + params.limit - 1);


    const { data: exeats, error: exeatsError } = await query;

    if (exeatsError) {
      return NextResponse.json({ 
        error: 'Database error',
        details: exeatsError.message 
      }, { status: 500 });
    }


    // Transform exeats for response
    const transformedExeats = (exeats || []).map((exeat: any) => {
      const student = Array.isArray(exeat.students) ? exeat.students[0] : exeat.students;
      const level = Array.isArray(student?.levels) ? student.levels[0] : student?.levels;
      
      // Calculate duration
      const startDate = new Date(exeat.start_date);
      const endDate = new Date(exeat.end_date);
      const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      // Calculate derived status
      const today = new Date().toISOString().split('T')[0];
      let derivedStatus = exeat.status;
      if (exeat.status === 'active') {
        if (today < exeat.start_date) derivedStatus = 'upcoming';
        else if (today > exeat.end_date) derivedStatus = 'past';
      }

      return {
        id: exeat.id,
        student_id: exeat.student_id,
        student_name: `${student?.first_name || ''} ${student?.middle_name || ''} ${student?.last_name || ''}`.trim(),
        matric_number: student?.matric_number || '',
        level: level?.code || '',
        level_name: level?.name || '',
        start_date: exeat.start_date,
        end_date: exeat.end_date,
        reason: exeat.reason,
        status: exeat.status,
        created_by: exeat.created_by,
        created_at: exeat.created_at,
        duration_days: durationDays,
        derived_status: derivedStatus
      };
    });

    // Calculate pagination
    const totalPages = count ? Math.ceil(count / params.limit) : 0;
    const pagination = {
      page: params.page,
      limit: params.limit,
      total: count || 0,
      totalPages,
      hasNext: params.page < totalPages,
      hasPrev: params.page > 1
    };

    const response = {
      data: transformedExeats,
      pagination
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Exeats API - Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: 'An unexpected error occurred while fetching exeats'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate admin
    const authResult = await getAdminFromRequest(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { admin } = authResult;

    // Parse and validate request body
    const body = await request.json();
    
    const validation = exeatSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: validation.error.errors 
      }, { status: 400 });
    }

    const exeatData = validation.data;

    // Check if student exists and is active
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, first_name, last_name, matric_number, status')
      .eq('id', exeatData.student_id)
      .single();

    if (studentError || !student) {
      return NextResponse.json({ 
        error: 'Student not found',
        details: 'The specified student does not exist'
      }, { status: 404 });
    }

    if (student.status !== 'active') {
      return NextResponse.json({ 
        error: 'Invalid student',
        details: 'Cannot create exeat for inactive student'
      }, { status: 400 });
    }

    // Check for overlapping exeats using the period column
    const { data: overlappingExeats, error: overlapError } = await supabase
      .from('exeats')
      .select('id, start_date, end_date')
      .eq('student_id', exeatData.student_id)
      .neq('status', 'canceled')
      .overlaps('period', `[${exeatData.start_date},${exeatData.end_date}]`);

    if (overlapError) {
      // Fallback to manual overlap check if period column doesn't work
      const { data: fallbackCheck } = await supabase
        .from('exeats')
        .select('id, start_date, end_date')
        .eq('student_id', exeatData.student_id)
        .neq('status', 'canceled')
        .or(`start_date.lte.${exeatData.end_date},end_date.gte.${exeatData.start_date}`);

      if (fallbackCheck && fallbackCheck.length > 0) {
        return NextResponse.json({ 
          error: 'Overlapping exeat exists',
          details: 'Student already has an active exeat for this period'
        }, { status: 409 });
      }
    }

    if (overlappingExeats && overlappingExeats.length > 0) {
      return NextResponse.json({ 
        error: 'Overlapping exeat exists',
        details: 'Student already has an active exeat for this period'
      }, { status: 409 });
    }

    // Create the exeat
    const { data: newExeat, error: exeatError } = await supabase
      .from('exeats')
      .insert({
        student_id: exeatData.student_id,
        start_date: exeatData.start_date,
        end_date: exeatData.end_date,
        reason: exeatData.reason,
        status: 'active',
        created_by: admin.id
      })
      .select()
      .single();

    if (exeatError) {
      return NextResponse.json({ 
        error: 'Failed to create exeat',
        details: exeatError.message 
      }, { status: 500 });
    }

    // Log admin action
    await logAdminAction(
      admin.id,
      'created_exeat',
      'exeat',
      newExeat.id,
      `${student.first_name} ${student.last_name} (${student.matric_number})`,
      { 
        start_date: exeatData.start_date, 
        end_date: exeatData.end_date,
        reason: exeatData.reason 
      }
    );

    // Transform exeat for response
    const transformedExeat = {
      id: newExeat.id,
      student_id: newExeat.student_id,
      student_name: `${student.first_name} ${student.last_name}`,
      matric_number: student.matric_number,
      start_date: newExeat.start_date,
      end_date: newExeat.end_date,
      reason: newExeat.reason,
      status: newExeat.status,
      created_at: newExeat.created_at
    };

    return NextResponse.json({
      data: transformedExeat,
      message: 'Exeat created successfully'
    }, { status: 201 });

  } catch (error) {
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: error.errors 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      error: 'Internal server error',
      details: 'An unexpected error occurred while creating exeat'
    }, { status: 500 });
  }
}
