// Wrapper that extends existing toast utility with color mappings
// PHASE 2: Replace src/services/authService.ts with Supabase wrapper - no other changes to callsites required.

import { toast } from '@/hooks/use-toast';

// Extended toast functions with color/variant mappings
export function toastSuccess(title: string, description?: string) {
  return toast({
    title,
    description,
    variant: 'default', // Using default variant for success
    className: 'border-green-200 bg-green-50 text-green-900',
  });
}

export function toastError(title: string, description?: string) {
  return toast({
    title,
    description,
    variant: 'destructive', // Using destructive variant for errors
  });
}

export function toastInfo(title: string, description?: string) {
  return toast({
    title,
    description,
    variant: 'default',
    className: 'border-blue-200 bg-blue-50 text-blue-900',
  });
}

export function toastWarning(title: string, description?: string) {
  return toast({
    title,
    description,
    variant: 'default',
    className: 'border-yellow-200 bg-yellow-50 text-yellow-900',
  });
}

// Re-export original toast for backward compatibility
export { toast } from '@/hooks/use-toast';

// Default export with all extended functions
export default {
  success: toastSuccess,
  error: toastError,
  info: toastInfo,
  warning: toastWarning,
  toast, // Original toast function
};
