// Real Supabase Auth Implementation
// Uses actual Supabase authentication with development auto-login

import { supabase } from './supabase';
import { devAutoLogin } from './dev-auth';
import { createClient } from '@/utils/supabase/client';

// User type definition
export interface User {
  id: string;
  email: string;
  matric_number?: string;
  name?: string;
  role?: 'admin' | 'superadmin';
}

// Clearance response type
export interface ClearanceResponse {
  clearance: 'superadmin' | 'admin' | 'none';
  userId: string;
  role: string;
}

// Auth service interface
export interface AuthService {
  getCurrentUser(): Promise<User | null>;
  getUserRole(): Promise<'admin' | 'superadmin' | null>;
  getClearance(): Promise<ClearanceResponse>;
  signOut(): Promise<void>;
  getAuthHeaders(): Promise<Record<string, string>>;
  refreshToken(): Promise<string | null>;
  isTokenValid(): Promise<boolean>;
}

/**
 * Get current authenticated user from Supabase
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      // Auto-login in development if no user
      if (process.env.NODE_ENV === 'development') {
        const loginResult = await devAutoLogin('admin');
        if (loginResult?.user) {
          return await getCurrentUser(); // Recursive call after login
        }
      }
      return null;
    }

    // Get admin data from database
    const { data: adminData } = await supabase
      .from('admins')
      .select('role, first_name, last_name, email')
      .eq('auth_user_id', user.id)
      .single();

    if (!adminData) {
      console.warn('User not found in admins table:', user.email);
      return null;
    }

    return {
      id: user.id,
      email: user.email || adminData.email,
      name: `${adminData.first_name} ${adminData.last_name}`,
      role: adminData.role,
      matric_number: adminData.role === 'admin' ? 'ADM-001' : 'SUPER-001'
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Get current user's role
 */
export async function getUserRole(): Promise<'admin' | 'superadmin' | null> {
  const user = await getCurrentUser();
  return user?.role || null;
}

/**
 * Get user clearance information
 */
export async function getClearance(): Promise<ClearanceResponse> {
  const user = await getCurrentUser();
  
  if (!user) {
    return {
      clearance: 'none',
      userId: '',
      role: 'none'
    };
  }

  return {
    clearance: user.role === 'superadmin' ? 'superadmin' : 'admin',
    userId: user.id,
    role: user.role || 'none'
  };
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<void> {
  const supabase=createClient()
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Sign out error:', error);
    } else {
      console.log('🚪 User signed out successfully');
    }
  } catch (error) {
    console.error('Sign out error:', error);
  }
}

/**
 * Get authentication headers for API requests
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      return {};
    }
    
    const user = await getCurrentUser();
    
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'X-User-ID': user?.id || '',
      'X-User-Role': user?.role || 'none'
    };
  } catch (error) {
    console.error('Error getting auth headers:', error);
    return {};
  }
}

/**
 * Refresh the current session token
 */
export async function refreshToken(): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error('Token refresh error:', error);
      return null;
    }
    
    console.log('🔄 Token refreshed successfully');
    return data.session?.access_token || null;
  } catch (error) {
    console.error('Token refresh error:', error);
    return null;
  }
}

/**
 * Check if current token is valid
 */
export async function isTokenValid(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return false;
    }
    
    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    if (session.expires_at && session.expires_at <= now) {
      console.log('🕐 Token expired, attempting refresh...');
      const refreshed = await refreshToken();
      return refreshed !== null;
    }
    
    return true;
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
}

// Permission validation utilities
export function hasPermission(userRole: 'admin' | 'superadmin' | null, requiredRole: 'admin' | 'superadmin'): boolean {
  if (!userRole) return false;
  
  const roleHierarchy = { admin: 1, superadmin: 2 };
  const userLevel = roleHierarchy[userRole] || 0;
  const requiredLevel = roleHierarchy[requiredRole] || 0;
  
  return userLevel >= requiredLevel;
}

export function validatePermission(userRole: 'admin' | 'superadmin' | null, requiredRole: 'admin' | 'superadmin', operation: string): void {
  if (!hasPermission(userRole, requiredRole)) {
    const error = new Error(`Access denied: ${operation} requires ${requiredRole} role, but user has ${userRole || 'no'} role`);
    (error as any).status = 403;
    (error as any).code = 'INSUFFICIENT_PERMISSIONS';
    throw error;
  }
}
