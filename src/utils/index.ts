// Barrel export for utility functions
// PHASE 2: Replace src/services/authService.ts with Supabase wrapper - no other changes to callsites required.

export { ErrorHandler, handleError, logError, getUserMessage } from './ErrorHandler';
export { toastSuccess, toastError, toastInfo, toastWarning, toast } from './toastExtend';
