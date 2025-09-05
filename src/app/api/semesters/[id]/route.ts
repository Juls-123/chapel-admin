import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Use service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const updateSemesterSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional(),
}).refine(data => {
  if (data.start_date && data.end_date) {
    return new Date(data.start_date) < new Date(data.end_date);
  }
  return true;
}, {
  message: 'Start date must be before end date',
  path: ['end_date']
});

export async function PUT(
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

    // Verify admin role and require superadmin for updates
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

    const { id } = params;

    // Parse and validate request body
    const body = await request.json();
    const validationResult = updateSemesterSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: validationResult.error.errors 
      }, { status: 400 });
    }

    const updateData = validationResult.data;

    // Get current semester data for overlap checking
    const { data: currentSemester, error: fetchError } = await supabaseAdmin
      .from('semesters')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !currentSemester) {
      return NextResponse.json({ error: 'Semester not found' }, { status: 404 });
    }

    // Prepare final dates for overlap checking
    const finalStartDate = updateData.start_date || currentSemester.start_date;
    const finalEndDate = updateData.end_date || currentSemester.end_date;

    // Check for overlapping semesters (excluding current semester)
    const { data: existingSemesters, error: checkError } = await supabaseAdmin
      .from('semesters')
      .select('id, name, start_date, end_date')
      .neq('id', id)
      .or(`and(start_date.lte.${finalEndDate},end_date.gte.${finalStartDate})`);

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

    // Update semester
    const { data: updatedSemester, error: updateError } = await supabaseAdmin
      .from('semesters')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating semester:', updateError);
      if (updateError.code === '23505') { // Unique constraint violation
        return NextResponse.json({ error: 'Semester name already exists' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Failed to update semester' }, { status: 500 });
    }

    return NextResponse.json(updatedSemester);
  } catch (error) {
    console.error('Semester update API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
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

    // Verify admin role and require superadmin for deletion
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

    const { id } = params;

    // Check if semester has associated data
    const { data: semesterAbsences, error: checkError } = await supabaseAdmin
      .from('semester_absences')
      .select('id')
      .eq('semester_id', id)
      .limit(1);

    if (checkError) {
      console.error('Error checking semester dependencies:', checkError);
      return NextResponse.json({ error: 'Failed to check semester dependencies' }, { status: 500 });
    }

    if (semesterAbsences && semesterAbsences.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete semester with existing attendance data' 
      }, { status: 409 });
    }

    // Delete semester
    const { error: deleteError } = await supabaseAdmin
      .from('semesters')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting semester:', deleteError);
      return NextResponse.json({ error: 'Failed to delete semester' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Semester deleted successfully' });
  } catch (error) {
    console.error('Semester deletion API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
