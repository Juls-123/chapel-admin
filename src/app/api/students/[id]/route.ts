import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Use service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const updateStudentSchema = z.object({
  matric_number: z.string().min(1, 'Matriculation number is required').optional(),
  first_name: z.string().min(1, 'First name is required').optional(),
  middle_name: z.string().optional(),
  last_name: z.string().min(1, 'Last name is required').optional(),
  email: z.string().email('Invalid email address').optional(),
  parent_email: z.string().email('Invalid parent email address').optional(),
  parent_phone: z.string().min(1, 'Parent phone is required').optional(),
  level: z.number().int().min(100).max(500).optional(),
  gender: z.enum(['male', 'female']).optional(),
  department: z.string().min(1, 'Department is required').optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params before using
    const { id } = await params;

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

    // Fetch student with level information
    const { data: student, error } = await supabaseAdmin
      .from('students')
      .select(`
        id,
        matric_number,
        first_name,
        middle_name,
        last_name,
        full_name,
        email,
        parent_email,
        parent_phone,
        gender,
        department,
        status,
        created_at,
        updated_at,
        levels!students_level_id_fkey(code, name)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      }
      console.error('Error fetching student:', error);
      return NextResponse.json({ error: 'Failed to fetch student' }, { status: 500 });
    }

    // Transform data to include level information (consistent with main API)
    const transformedData = {
      ...student,
      level: (student as any).levels?.code ? parseInt((student as any).levels.code) : null,
      level_name: (student as any).levels?.name,
      levels: undefined, // Remove the nested object
    };

    return NextResponse.json(transformedData);
  } catch (error) {
    console.error('Student fetch API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params before using
    const { id } = await params;

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

    // Get admin profile and verify superadmin role
    const { data: admin, error: adminError } = await supabaseAdmin
      .from('admins')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single();

    if (adminError || !admin) {
      return NextResponse.json({ error: 'Admin profile not found' }, { status: 404 });
    }

    if (admin.role !== 'superadmin') {
      return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = updateStudentSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: validationResult.error.errors 
      }, { status: 400 });
    }

    const updateData = validationResult.data;

    // Handle level update with validation (no auto-creation)
    let levelId = undefined;
    if (updateData.level) {
      // Validate that level exists (don't create it)
      const { data: existingLevel, error: levelFetchError } = await supabaseAdmin
        .from('levels')
        .select('id')
        .eq('code', updateData.level.toString())
        .single();

      if (levelFetchError) {
        console.error('Error fetching level:', levelFetchError);
        return NextResponse.json({ 
          error: 'Failed to validate academic level',
          details: levelFetchError.message
        }, { status: 500 });
      }

      if (!existingLevel) {
        return NextResponse.json({ 
          error: 'Invalid academic level',
          details: `Level ${updateData.level} does not exist in the system. Please contact an administrator to add this level first.`
        }, { status: 400 });
      }

      levelId = existingLevel.id;
    }

    // Prepare update object
    const updateObject: any = {
      ...updateData,
      level: undefined, // Remove level from update object
      updated_at: new Date().toISOString(),
    };

    if (levelId) {
      updateObject.level_id = levelId;
    }

    // Update student
    const { data: updatedStudent, error: updateError } = await supabaseAdmin
      .from('students')
      .update(updateObject)
      .eq('id', id) // Now using the awaited id
      .select(`
        id,
        matric_number,
        first_name,
        middle_name,
        last_name,
        full_name,
        email,
        parent_email,
        parent_phone,
        gender,
        department,
        status,
        created_at,
        updated_at,
        levels!students_level_id_fkey(code, name)
      `)
      .single();

    if (updateError) {
      console.error('Error updating student:', updateError);
      
      if (updateError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      }

      if (updateError.code === '23505') {
        return NextResponse.json({ 
          error: 'Duplicate matriculation number',
          details: 'A student with this matriculation number already exists. Please use a different number.'
        }, { status: 409 });
      }

      return NextResponse.json({ 
        error: 'Failed to update student',
        details: 'An unexpected error occurred while updating the student. Please try again.'
      }, { status: 500 });
    }

    // Transform response data (consistent with main API and GET)
    const transformedData = {
      ...updatedStudent,
      level: (updatedStudent as any).levels?.code ? parseInt((updatedStudent as any).levels.code) : null,
      level_name: (updatedStudent as any).levels?.name,
      levels: undefined, // Remove the nested object
    };

    return NextResponse.json(transformedData);
  } catch (error) {
    console.error('Student update API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params before using
    const { id } = await params;

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

    // Get admin profile and verify superadmin role
    const { data: admin, error: adminError } = await supabaseAdmin
      .from('admins')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single();

    if (adminError || !admin) {
      return NextResponse.json({ error: 'Admin profile not found' }, { status: 404 });
    }

    if (admin.role !== 'superadmin') {
      return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 });
    }

    // Check if student exists and get their info for the response
    const { data: existingStudent, error: fetchError } = await supabaseAdmin
      .from('students')
      .select('id, full_name, matric_number')
      .eq('id', id) // Now using the awaited id
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      }
      console.error('Error fetching student for deletion:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch student' }, { status: 500 });
    }

    // Soft delete the student (set status to inactive)
    const { error: deleteError } = await supabaseAdmin
      .from('students')
      .update({ status: 'inactive', updated_at: new Date().toISOString() })
      .eq('id', id); // Now using the awaited id

    if (deleteError) {
      console.error('Error deleting student:', deleteError);
      
      // Check for foreign key constraint violations
      if (deleteError.code === '23503') {
        return NextResponse.json({ 
          error: 'Cannot delete student',
          details: 'This student has associated attendance records or other data. Please contact system administrator.'
        }, { status: 409 });
      }

      return NextResponse.json({ 
        error: 'Failed to delete student',
        details: 'An unexpected error occurred while deleting the student. Please try again.'
      }, { status: 500 });
    }

    return NextResponse.json({ 
      message: `Student "${existingStudent.full_name}" (${existingStudent.matric_number}) has been successfully deactivated.`
    });
  } catch (error) {
    console.error('Student deletion API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}