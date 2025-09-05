import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { api } from '@/lib/requestFactory';
import { supabase } from '@/lib/auth/supabase';
import { useToast } from '@/hooks/use-toast';

export interface Student {
  id: string;
  matric_number: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  full_name: string;
  email: string;
  parent_email: string;
  parent_phone: string;
  gender: 'male' | 'female';
  department: string;
  level: number;
  level_name?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface CreateStudentData {
  matric_number: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  parent_email: string;
  parent_phone: string;
  gender: 'male' | 'female';
  department: string;
  level: number;
}

export interface BulkUploadPayload {
  students: CreateStudentData[];
  uploadMetadata: {
    fileName: string;
    fileSize: number;
    uploadDate: string;
  };
}

export interface UpdateStudentData {
  matric_number?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  email?: string;
  parent_email?: string;
  parent_phone?: string;
  gender?: 'male' | 'female';
  department?: string;
  level?: number;
  status?: 'active' | 'inactive';
}

export interface StudentsQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  level?: string;
  status?: string;
  department?: string;
  onUploadSuccess?: (result: any, variables: any) => void;
  onUploadError?: (error: any, variables: any) => void;
}

export interface StudentsResponse {
  data: Student[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function useStudents(params: StudentsQueryParams = {}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { onUploadSuccess, onUploadError, ...queryParams } = params;

  // Query for fetching students
  const query = useQuery({
    queryKey: ['students', queryParams],
    queryFn: async (): Promise<StudentsResponse> => {
      const searchParams = new URLSearchParams();
      if (queryParams.page) searchParams.set('page', queryParams.page.toString());
      if (queryParams.limit) searchParams.set('limit', queryParams.limit.toString());
      if (queryParams.search) searchParams.set('search', queryParams.search);
      if (queryParams.level) searchParams.set('level', queryParams.level);
      if (queryParams.status) searchParams.set('status', queryParams.status);
      if (queryParams.department) searchParams.set('department', queryParams.department);

      const url = `/api/students?${searchParams.toString()}`;
      console.log('🔍 Fetching students from:', url);
      console.log('📋 Query params:', queryParams);
      
      try {
        const result = await api.get<any>(url);
        console.log('✅ Students API response:', result);
        console.log('📊 Raw result type:', typeof result);
        console.log('📊 Raw result keys:', Object.keys(result || {}));
        
        // Handle different response structures
        let studentsData, paginationData;
        
        if (Array.isArray(result)) {
          // Direct array response
          studentsData = result;
          paginationData = undefined;
        } else if (result.success && result.data) {
          // Wrapped success response
          studentsData = result.data;
          paginationData = result.pagination;
        } else if (result.data) {
          // Simple data wrapper
          studentsData = result.data;
          paginationData = result.pagination;
        } else {
          // Fallback
          studentsData = result;
          paginationData = undefined;
        }
        
        console.log('📊 Processed students data:', studentsData);
        console.log('📊 Processed pagination:', paginationData);
        
        return {
          data: studentsData || [],
          pagination: paginationData
        };
      } catch (error) {
        console.error('❌ Students API error:', error);
        throw error;
      }
    },
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });

  // Real-time subscription for students
  useEffect(() => {
    const channel = supabase
      .channel('students_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'students',
        },
        () => {
          // Invalidate and refetch students when changes occur
          queryClient.invalidateQueries({ queryKey: ['students'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Mutation for creating students (single or bulk)
  const createMutation = useMutation({
    mutationFn: async (data: CreateStudentData | CreateStudentData[] | BulkUploadPayload): Promise<Student | Student[]> => {
      const result = await api.post<Student | Student[]>('/api/students', data);
      return result;
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      const count = Array.isArray(result) ? result.length : 1;
      toast({
        title: count > 1 ? 'Students Created' : 'Student Created',
        description: count > 1 ? `${count} students have been successfully registered.` : `Student has been successfully registered.`,
      });
      
      // Trigger upload completion callback if it's a bulk upload
      if ('students' in variables && 'uploadMetadata' in variables && onUploadSuccess) {
        onUploadSuccess(result, variables);
      }
    },
    onError: (error: any, variables) => {
      console.error('Create student error:', error);
      
      // Handle specific authorization errors for non-superadmin users
      if (error.status === 403 || error.code === 'FORBIDDEN') {
        toast({
          title: 'Access Denied',
          description: 'Only superadmin users can manage student records. Please contact your administrator.',
          variant: 'destructive',
        });
        return;
      }
      
      if (error.response?.data?.error && error.response?.data?.details) {
        toast({
          title: error.response.data.error,
          description: error.response.data.details,
          variant: 'destructive',
        });
      } else if (error.response?.data?.error) {
        toast({
          title: 'Failed to create student(s)',
          description: error.response.data.error,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Failed to create student(s)',
          description: 'An unexpected error occurred. Please try again.',
          variant: 'destructive',
        });
      }
      
      // Trigger upload failure callback if it's a bulk upload
      if ('students' in variables && 'uploadMetadata' in variables && onUploadError) {
        onUploadError(error, variables);
      }
    },
  });

  // Mutation for updating students
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateStudentData }): Promise<Student> => {
      const result = await api.put<Student>(`/api/students/${id}`, data);
      return result;
    },
    onSuccess: (updatedStudent) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast({
        title: 'Student Updated',
        description: `${updatedStudent.full_name} has been updated successfully.`,
      });
    },
    onError: (error: any) => {
      console.error('Update student error:', error);
      if (error.response?.data?.error && error.response?.data?.details) {
        toast({
          title: error.response.data.error,
          description: error.response.data.details,
          variant: 'destructive',
        });
      } else if (error.response?.data?.error) {
        toast({
          title: 'Failed to update student',
          description: error.response.data.error,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Failed to update student',
          description: 'An unexpected error occurred. Please try again.',
          variant: 'destructive',
        });
      }
    },
  });

  // Mutation for deleting students
  const deleteMutation = useMutation({
    mutationFn: async (id: string): Promise<{ message: string }> => {
      const result = await api.delete<{ message: string }>(`/api/students/${id}`);
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast({
        title: 'Student Deactivated',
        description: result.message,
      });
    },
    onError: (error: any) => {
      console.error('Delete student error:', error);
      if (error.response?.data?.error && error.response?.data?.details) {
        toast({
          title: error.response.data.error,
          description: error.response.data.details,
          variant: 'destructive',
        });
      } else if (error.response?.data?.error) {
        toast({
          title: 'Failed to delete student',
          description: error.response.data.error,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Failed to delete student',
          description: 'An unexpected error occurred. Please try again.',
          variant: 'destructive',
        });
      }
    },
  });

  return {
    students: query.data?.data || [],
    pagination: query.data?.pagination,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    createStudent: createMutation.mutate,
    updateStudent: updateMutation.mutate,
    deleteStudent: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
