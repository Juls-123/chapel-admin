// Phase 2: replace this file to re-export Supabase auth implementation; keep same function names and signatures.
// PHASE 2: Replace src/services/authService.ts with Supabase wrapper - no other changes to callsites required.

// Re-export clearanceStub as default export (single place to swap in Phase 2)
export {
  getCurrentUser,
  getUserRole,
  getClearance,
  signOut,
  refreshToken
} from './clearanceStub';

// Default export for convenience
import * as clearanceStub from './clearanceStub';
export default clearanceStub;
