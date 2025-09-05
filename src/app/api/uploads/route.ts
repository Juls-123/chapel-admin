import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header or cookies
    const authHeader = request.headers.get('authorization');
    const cookieStore = await cookies();
    const cookieToken = cookieStore.get('sb-access-token')?.value;
    
    const token = authHeader?.replace('Bearer ', '') || cookieToken;

    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Verify token and get user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const fileType = searchParams.get('file_type');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabaseAdmin
      .from('upload_history')
      .select(`
        id,
        file_name,
        file_size,
        file_type,
        mime_type,
        upload_status,
        records_processed,
        records_failed,
        records_total,
        processing_started_at,
        processing_completed_at,
        error_summary,
        created_at,
        updated_at,
        uploaded_by:admins!upload_history_uploaded_by_fkey(
          id,
          first_name,
          last_name,
          email
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (fileType) {
      query = query.eq('file_type', fileType);
    }

    const { data: uploads, error } = await query;

    if (error) {
      console.error('Error fetching upload history:', error);
      return NextResponse.json({ error: 'Failed to fetch upload history' }, { status: 500 });
    }

    return NextResponse.json(uploads);
  } catch (error) {
    console.error('Upload history API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get token from Authorization header or cookies
    const authHeader = request.headers.get('authorization');
    const cookieStore = await cookies();
    const cookieToken = cookieStore.get('sb-access-token')?.value;
    
    const token = authHeader?.replace('Bearer ', '') || cookieToken;

    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Verify token and get user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
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

    // Only superadmins can create upload records
    if (admin.role !== 'superadmin') {
      return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 });
    }

    const body = await request.json();
    const {
      file_name,
      file_size,
      file_type,
      mime_type,
      records_total = 0
    } = body;

    // Create upload record
    const { data: upload, error } = await supabaseAdmin
      .from('upload_history')
      .insert({
        file_name,
        file_size,
        file_type,
        mime_type,
        uploaded_by: admin.id,
        records_total,
        upload_status: 'processing',
        processing_started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating upload record:', error);
      return NextResponse.json({ error: 'Failed to create upload record' }, { status: 500 });
    }

    return NextResponse.json(upload, { status: 201 });
  } catch (error) {
    console.error('Upload creation API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
