// app/(protected)/layout.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // Verify user authentication
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Redirect to login if not authenticated or if there's an error
  if (!user || error) {
    redirect("/");
  }

  // User is authenticated, render the protected content
  return <>{children}</>;
}
