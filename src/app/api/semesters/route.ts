import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Use service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const createSemesterSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
}).refine(data => new Date(data.start_date) < new Date(data.end_date), {
  message: 'Start date must be before end date',
  path: ['end_date']
});

export async function GET(request: NextRequest) {
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

    // Fetch semesters ordered by start_date desc (most recent first)
    const { data, error } = await supabaseAdmin
      .from('semesters')
      .select('*')
      .order('start_date', { ascending: false });

    if (error) {
      console.error('Error fetching semesters:', error);
      return NextResponse.json({ error: 'Failed to fetch semesters' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Semesters API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

    // Verify admin role and require superadmin for creation
    const { data: admin, error: adminError } = await supabaseAdmin
      .from('admins')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single();

    if (adminError || !admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    if (admin.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden: Superadmin access required' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = createSemesterSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: validationResult.error.errors 
      }, { status: 400 });
    }

    const { name, start_date, end_date } = validationResult.data;

    // Check for overlapping semesters
    const { data: existingSemesters, error: checkError } = await supabaseAdmin
      .from('semesters')
      .select('id, name, start_date, end_date')
      .or(`and(start_date.lte.${end_date},end_date.gte.${start_date})`);

    if (checkError) {
      console.error('Error checking for overlapping semesters:', checkError);
      return NextResponse.json({ error: 'Failed to validate semester dates' }, { status: 500 });
    }

    if (existingSemesters && existingSemesters.length > 0) {
      return NextResponse.json({ 
        error: 'Semester dates overlap with existing semester(s)',
        overlapping: existingSemesters.map((s: any) => s.name)
      }, { status: 409 });
    }

    // Create new semester
    const { data: newSemester, error: insertError } = await supabaseAdmin
      .from('semesters')
      .insert({
        name,
        start_date,
        end_date,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating semester:', insertError);
      if (insertError.code === '23505') { // Unique constraint violation
        return NextResponse.json({ error: 'Semester name already exists' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Failed to create semester' }, { status: 500 });
    }

    return NextResponse.json(newSemester, { status: 201 });
  } catch (error) {
    console.error('Semester creation API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
