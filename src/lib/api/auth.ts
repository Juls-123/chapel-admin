import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/generated";

export interface RequireAdminOptions {
  role?: "admin" | "superadmin";
}

export interface RequireAdminResult {
  token: string;
  user: any; // Supabase AuthUser
  admin: { id: string; role: "admin" | "superadmin" };
}

export async function requireAdmin(
  request: Request,
  options?: RequireAdminOptions
): Promise<RequireAdminResult> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    const err: any = new Error("Unauthorized");
    err.status = 401;
    err.code = "UNAUTHORIZED";
    throw err;
  }

  const token = authHeader.split(" ")[1]!;

  const supabaseAdmin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(token);
  if (userError || !user) {
    const err: any = new Error("Invalid token");
    err.status = 401;
    err.code = "UNAUTHORIZED";
    err.details = userError?.message;
    throw err;
  }

  const { data: admin, error: adminError } = await supabaseAdmin
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

  return { token, user, admin: admin as any };
}
