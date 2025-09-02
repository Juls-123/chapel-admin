// Stubbed clearance/auth service for Phase 1 development
// PHASE 2: Replace src/services/authService.ts with Supabase wrapper - no other changes to callsites required.

import { User } from '@/lib/types/index';

// Delay helper to simulate network latency
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Stubbed auth functions with realistic return values
export async function getCurrentUser(): Promise<User | null> {
  await delay(120);
  return {
    id: '7a8b9cde-aaaa-bbbb-cccc-0123456789ab',
    email: 'jane.doe@chapel.edu',
    matric_number: 'STU-001',
    name: 'Jane Doe'
  };
}

export async function getUserRole(): Promise<'admin' | 'staff' | 'student'> {
  await delay(60);
  return 'admin';
}

export async function getClearance(): Promise<{
  clearance: 'superadmin' | 'admin' | 'staff' | 'none';
  userId: string;
  role: string;
}> {
  await delay(60);
  return {
    clearance: 'admin',
    userId: '7a8b9cde-aaaa-bbbb-cccc-0123456789ab',
    role: 'admin'
  };
}

// Additional auth helper functions
export async function signOut(): Promise<void> {
  await delay(100);
  // Stub - no actual sign out logic
}

export async function refreshToken(): Promise<string | null> {
  await delay(80);
  return 'stub-jwt-token-' + Date.now();
}
