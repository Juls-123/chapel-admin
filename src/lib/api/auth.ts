import { createClient } from "@/utils/supabase/server";
import type { Database } from "@/lib/types/generated";

export interface RequireAdminOptions {
  role?: "admin" | "superadmin";
}

export interface RequireAdminResult {
  user: any; // Supabase AuthUser
  admin: { id: string; role: "admin" | "superadmin" };
}

/**
 * Server-side authentication middleware for admin-only API routes.
 * Uses session-based auth (cookies) - consistent with page-level authentication.
 * 
 * @param options - Optional role requirement (admin or superadmin)
 * @returns Authenticated user and admin profile
 * @throws Error with status code for unauthorized/forbidden access
 * 
 * @example
 * // In an API route
 * export async function GET(request: Request) {
 *   try {
 *     const { user, admin } = await requireAdmin({ role: "superadmin" });
 *     // Only superadmins can access this route
 *   } catch (error: any) {
 *     return NextResponse.json(
 *       { error: error.message },
 *       { status: error.status || 500 }
 *     );
 *   }
 * }
 */
export async function requireAdmin(
  options?: RequireAdminOptions
): Promise<RequireAdminResult> {
  // Create Supabase client that reads from session cookies
  // This is the same client used by your pages and middleware
  const supabase = await createClient();

  // Get the authenticated user from the session
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  // Check if user is authenticated
  if (userError || !user) {
    const err: any = new Error("Unauthorized - No valid session");
    err.status = 401;
    err.code = "UNAUTHORIZED";
    err.details = userError?.message;
    throw err;
  }

  // Look up admin profile in the admins table
  // Note: This query respects RLS if you have policies set up
  // If you need to bypass RLS for this query, you'll need to use service role
  const { data: admin, error: adminError } = await supabase
    .from("admins")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .single();

  if (adminError || !admin) {
    const err: any = new Error("Admin profile not found");
    err.status = 404;
    err.code = "ADMIN_NOT_FOUND";
    err.details = adminError?.message;
    throw err;
  }

  // Check role-based access control if required
  if (options?.role) {
    const required = options.role;
    const actual = admin.role as "admin" | "superadmin";
    const rank = { admin: 1, superadmin: 2 } as const;
    
    if (rank[actual] < rank[required]) {
      const err: any = new Error(`${required} access required`);
      err.status = 403;
      err.code = "FORBIDDEN";
      throw err;
    }
  }

  // Return authenticated user and admin profile
  return { user, admin: admin as any };
}