"use client";

import { useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useGlobalContext } from "@/contexts/GlobalContext";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, clearUser, setLoading } = useGlobalContext();

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Session error:", error);
          clearUser();
        } else if (data.session) {
          setUser({
            id: data.session.user.id,
            email: data.session.user.email ?? "",
            name: data.session.user.user_metadata?.name,
          });
        } else {
          clearUser();
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        clearUser();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser({
          id: session.user.id,
          email: session.user.email ?? "",
          name: session.user.user_metadata?.name,
        });
      } else {
        clearUser();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser, clearUser, setLoading]);

  return <>{children}</>;
}
