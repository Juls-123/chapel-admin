import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    // Fetch all levels from the database
    const { data: levels, error: levelsError } = await supabaseAdmin
      .from('levels')
      .select('id, code, name, created_at')
      .order('code', { ascending: true });

    if (levelsError) {
      console.error('Error fetching levels:', levelsError);
      return NextResponse.json({ 
        error: 'Failed to fetch levels',
        details: levelsError.message
      }, { status: 500 });
    }

    // Return data matching database schema exactly
    return NextResponse.json(levels || []);

  } catch (error) {
    console.error('Levels API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: 'An unexpected error occurred while fetching levels'
    }, { status: 500 });
  }
}