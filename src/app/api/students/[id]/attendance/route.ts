import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get the current user from the session
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Verify admin role
    const { data: admin, error: adminError } = await supabaseAdmin
      .from('admins')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single();

    if (adminError || !admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // First verify the student exists
    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .select('id, matric_number, first_name, last_name')
      .eq('id', params.id)
      .single();

    if (studentError || !student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Parse query parameters
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const serviceId = url.searchParams.get('service_id');
    const status = url.searchParams.get('status'); // 'present', 'absent', 'excused'
    const startDate = url.searchParams.get('start_date');
    const endDate = url.searchParams.get('end_date');

    const offset = (page - 1) * limit;

    // Build attendance query
    let query = supabaseAdmin
      .from('attendance')
      .select(`
        id,
        student_id,
        service_id,
        status,
        marked_at,
        marked_by,
        notes,
        services!attendance_service_id_fkey(
          id,
          name,
          type,
          date,
          start_time,
          end_time
        ),
        admins!attendance_marked_by_fkey(
          id,
          first_name,
          last_name
        )
      `)
      .eq('student_id', params.id)
      .range(offset, offset + limit - 1)
      .order('marked_at', { ascending: false });

    // Apply filters
    if (serviceId) {
      query = query.eq('service_id', serviceId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (startDate) {
      query = query.gte('services.date', startDate);
    }

    if (endDate) {
      query = query.lte('services.date', endDate);
    }

    const { data: attendance, error: attendanceError } = await query;

    if (attendanceError) {
      console.error('Error fetching attendance:', attendanceError);
      return NextResponse.json({ error: 'Failed to fetch attendance records' }, { status: 500 });
    }

    // Get total count for pagination
    let countQuery = supabaseAdmin
      .from('attendance')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', params.id);

    if (serviceId) {
      countQuery = countQuery.eq('service_id', serviceId);
    }

    if (status) {
      countQuery = countQuery.eq('status', status);
    }

    const { count: totalCount } = await countQuery;

    // Transform data to flatten nested objects
    const transformedData = attendance?.map((record: any) => ({
      ...record,
      service_name: record.services?.name,
      service_type: record.services?.type,
      service_date: record.services?.date,
      service_start_time: record.services?.start_time,
      service_end_time: record.services?.end_time,
      marked_by_name: record.admins ? `${record.admins.first_name} ${record.admins.last_name}` : null,
      services: undefined, // Remove nested object
      admins: undefined, // Remove nested object
    }));

    return NextResponse.json({
      data: transformedData || [],
      student: {
        id: student.id,
        matric_number: student.matric_number,
        name: `${student.first_name} ${student.last_name}`
      },
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Student attendance API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
