// Development Auto-Login System for Real Supabase Auth
// Provides seamless development experience with real authentication

import { supabase } from "./supabase";

// Development user accounts (these should exist in your Supabase Auth)
const DEV_USERS = {
  admin: {
    email: "SECRETARY@mtu.chapel",
    password: "dev-admin-123",
    role: "admin",
  },
  superadmin: {
    email: "CHAPLAIN@mtu.chapel",
    password: "dev-superadmin-123",
    role: "superadmin",
  },
} as const;

/**
 * Auto-login function for development
 * Signs in with real Supabase Auth using development credentials
 */
export async function devAutoLogin(
  userType: "admin" | "superadmin" = "superadmin"
) {
  const user = DEV_USERS[userType];

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: user.password,
    });

    if (error) {
      console.error("🚫 Dev auto-login failed:", error.message);
      return null;
    }

    console.log(`🚀 Dev auto-login successful as ${userType}:`, user.email);
    console.log(
      `🔑 JWT Token:`,
      data.session?.access_token?.substring(0, 50) + "..."
    );

    return data;
  } catch (error) {
    console.error("🚫 Dev auto-login error:", error);
    return null;
  }
}

/**
 * Easy user switching for development
 * Provides console-accessible functions for switching between users
 */
export const devUserSwitcher = {
  async switchToAdmin() {
    console.log("🔄 Switching to admin user...");
    await supabase.auth.signOut();
    return await devAutoLogin("admin");
  },

  async switchToSuperAdmin() {
    console.log("🔄 Switching to superadmin user...");
    await supabase.auth.signOut();
    return await devAutoLogin("superadmin");
  },

  async switchToCustomUser(email: string, password: string) {
    console.log(`🔄 Switching to custom user: ${email}...`);
    await supabase.auth.signOut();

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("🚫 Custom user login failed:", error.message);
        return null;
      }

      console.log("🚀 Custom user login successful:", email);
      return data;
    } catch (error) {
      console.error("🚫 Custom user login error:", error);
      return null;
    }
  },

  async getCurrentUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      console.log("👤 Current user:", user.email);
      console.log("🔑 User ID:", user.id);

      // Get role from admin table
      const { data: adminData } = await supabase
        .from("admins")
        .select("role, first_name, last_name")
        .eq("auth_user_id", user.id)
        .single();

      if (adminData) {
        console.log("👑 Role:", adminData.role);
        console.log(
          "📝 Name:",
          `${adminData.first_name} ${adminData.last_name}`
        );
      }
    } else {
      console.log("❌ No user currently signed in");
    }
    return user;
  },

  async getSession() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      console.log(
        "🎫 Session expires at:",
        new Date(session.expires_at! * 1000)
      );
      console.log(
        "🔑 Access token (first 50 chars):",
        session.access_token.substring(0, 50) + "..."
      );
    } else {
      console.log("❌ No active session");
    }
    return session;
  },
};

/**
 * Get available development users for UI display
 */
export function getDevUsers() {
  return Object.entries(DEV_USERS).map(([key, user]) => ({
    id: key as keyof typeof DEV_USERS,
    email: user.email,
    role: user.role,
    displayName: user.role === "admin" ? "Secretary" : "Chaplain",
  }));
}

/**
 * Switch user account for UI components
 */
export async function switchAccount(userType: keyof typeof DEV_USERS) {
  console.log(`🔄 UI switching to ${userType} user...`);
  await supabase.auth.signOut();
  const result = await devAutoLogin(userType);

  // Trigger page reload to refresh all auth state
  if (typeof window !== "undefined" && result) {
    window.location.reload();
  }

  return result;
}

/**
 * Initialize development tools
 * Call this function in client-side components to set up global dev tools
 */
export function initDevTools() {
  // Only run on client side and in development
  if (typeof window === "undefined") return;

  const shouldEnable =
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_ENABLE_DEV_TOOLS === "true";

  if (!shouldEnable) return;

  // Make switcher available globally in development
  (window as any).devUserSwitcher = devUserSwitcher;
  console.log(
    "🛠️  Development user switcher available globally as window.devUserSwitcher"
  );
  console.log("📖 Available commands:");
  console.log("   - devUserSwitcher.switchToAdmin()");
  console.log("   - devUserSwitcher.switchToSuperAdmin()");
  console.log("   - devUserSwitcher.getCurrentUser()");
  console.log("   - devUserSwitcher.getSession()");
}
