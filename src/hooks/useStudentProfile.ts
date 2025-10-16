// src/hooks/useStudentProfile.ts
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { getAuthHeaders } from '@/lib/auth';
import { useEffect } from 'react';
import type { StudentRecord } from '@/services/StudentService';

/**
 * Extended student profile with additional fields
 */
export interface StudentProfile extends StudentRecord {
  level_name: string | null;
  recent_attendance?: any[];
  recent_exeats?: any[];
}

/**
 * API response type
 */
interface StudentProfileResponse {
  success?: boolean;
  data: StudentProfile;
}

/**
 * Fetch student profile by ID
 */
async function fetchStudentProfile(studentId: string): Promise<StudentProfile> {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/students/${studentId}/profile`, {
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.message || error.error || 'Failed to fetch student profile'
    );
  }

  const result: StudentProfileResponse = await response.json();
  return result.data || result;
}

/**
 * Hook options
 */
interface UseStudentProfileOptions {
  enabled?: boolean;
  onError?: (error: Error) => void;
}

/**
 * Hook to fetch a student's profile
 */
export function useStudentProfile(
  studentId: string | undefined,
  options: UseStudentProfileOptions = {}
) {
  const { toast } = useToast();
  const { enabled = true, onError } = options;

  const query = useQuery({
    queryKey: ['student', 'profile', studentId],
    queryFn: () => fetchStudentProfile(studentId!),
    enabled: !!studentId && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      // Don't retry for 404s or 403s
      const errorMessage = error.message.toLowerCase();
      if (
        errorMessage.includes('404') ||
        errorMessage.includes('403') ||
        errorMessage.includes('not found') ||
        errorMessage.includes('forbidden')
      ) {
        return false;
      }
      return failureCount < 3;
    },
  });

  useEffect(() => {
    if (query.error) {
      const errorMessage = (query.error as Error).message;
      
      // Call custom error handler if provided
      if (onError) {
        onError(query.error as Error);
      }
      
      // Show toast notification
      toast({
        title: 'Error loading student profile',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }, [query.error, toast, onError]);

  return query;
}