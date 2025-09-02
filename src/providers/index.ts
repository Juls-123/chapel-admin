// Barrel export for all providers
// PHASE 2: Replace src/services/authService.ts with Supabase wrapper - no other changes to callsites required.

export { QueryProvider, withQueryProvider } from './QueryProvider';
export { AuthProvider, withAuthProvider } from './AuthProvider';
