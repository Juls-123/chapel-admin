import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function addAuditContext(request: NextRequest): Promise<NextRequest> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const authHeader = request.headers.get('authorization');
  const cookieToken = request.cookies.get('sb-access-token')?.value;
  
  const token = authHeader?.replace('Bearer ', '') || cookieToken;

  if (!token) {
    return request;
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) return request;

    const { data: admin } = await supabase
      .from('admins')
      .select('id, first_name, last_name, role')
      .eq('auth_user_id', user.id)
      .single();

    if (admin) {
      // Add admin context to headers
      const newHeaders = new Headers(request.headers);
      newHeaders.set('x-admin-id', admin.id);
      newHeaders.set('x-admin-name', `${admin.first_name} ${admin.last_name}`);
      newHeaders.set('x-session-id', user.id);
      newHeaders.set('x-admin-role', admin.role);

      // Create new request with added headers
      return new NextRequest(request, { headers: newHeaders });
    }
  } catch (error) {
    console.error('Audit middleware error:', error);
  }

  return request;
}

// Helper function to extract admin context from request (for use in API routes)
export async function getAdminContext(request: NextRequest) {
  const adminId = request.headers.get('x-admin-id');
  const adminName = request.headers.get('x-admin-name');
  const adminRole = request.headers.get('x-admin-role');

  if (!adminId) {
    return null;
  }

  return {
    id: adminId,
    name: adminName || 'Unknown Admin',
    role: adminRole || 'admin'
  };
}
