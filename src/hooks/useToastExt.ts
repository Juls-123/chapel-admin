// Wrapper hook that extends existing toast with enhanced functionality
// NOTE: This file is swap-ready for production Supabase Auth — replace with Supabase wrapper only. Do not change callsites.
// PHASE 2: Replace src/services/authService.ts with Supabase wrapper - no other changes to callsites required.

import { useCallback } from 'react';
import { toastSuccess, toastError, toastInfo, toastWarning, toast } from '@/utils/toastExtend';

export function useToastExt() {
  const showSuccess = useCallback((title: string, description?: string) => {
    return toastSuccess(title, description);
  }, []);

  const showError = useCallback((title: string, description?: string) => {
    return toastError(title, description);
  }, []);

  const showInfo = useCallback((title: string, description?: string) => {
    return toastInfo(title, description);
  }, []);

  const showWarning = useCallback((title: string, description?: string) => {
    return toastWarning(title, description);
  }, []);

  const showToast = useCallback((options: Parameters<typeof toast>[0]) => {
    return toast(options);
  }, []);

  return {
    success: showSuccess,
    error: showError,
    info: showInfo,
    warning: showWarning,
    toast: showToast,
  };
}
