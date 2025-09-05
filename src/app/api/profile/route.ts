import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/auth/supabase';
import { adminSchema } from '@/lib/validation/admins.schema';

export async function GET(request: NextRequest) {
  try {
    // Get the current user from the session
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get admin profile from database
    const { data: admin, error: adminError } = await supabase
      .from('admins')
      .select('*')
      .eq('auth_user_id', user.id)
      .single();

    if (adminError) {
      console.error('Error fetching admin profile:', adminError);
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Validate the admin data
    const validationResult = adminSchema.safeParse(admin);
    if (!validationResult.success) {
      console.error('Invalid admin data:', validationResult.error);
      return NextResponse.json({ error: 'Invalid profile data' }, { status: 500 });
    }

    return NextResponse.json(validationResult.data);
  } catch (error) {
    console.error('Profile API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get current admin to check permissions
    const { data: currentAdmin, error: currentAdminError } = await supabase
      .from('admins')
      .select('role, id')
      .eq('auth_user_id', user.id)
      .single();

    if (currentAdminError || !currentAdmin) {
      return NextResponse.json({ error: 'Admin profile not found' }, { status: 404 });
    }

    // Only superadmins can update profiles
    if (currentAdmin.role !== 'superadmin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    
    // Validate the update data
    const allowedFields = ['first_name', 'middle_name', 'last_name'];
    const updateData: any = {};
    
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Update the admin profile
    const { data: updatedAdmin, error: updateError } = await supabase
      .from('admins')
      .update(updateData)
      .eq('id', currentAdmin.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating admin profile:', updateError);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    // Validate the updated admin data
    const validationResult = adminSchema.safeParse(updatedAdmin);
    if (!validationResult.success) {
      console.error('Invalid updated admin data:', validationResult.error);
      return NextResponse.json({ error: 'Invalid updated profile data' }, { status: 500 });
    }

    return NextResponse.json(validationResult.data);
  } catch (error) {
    console.error('Profile update API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
