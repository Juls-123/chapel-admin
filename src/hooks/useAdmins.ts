// Admin management hook with CRUD operations
// PHASE 2: Supabase integration with comprehensive error handling

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Admin } from '@/lib/types';
import { adminSchema, adminCreateSchema, adminUpdateSchema } from '@/lib/validation/admins.schema';
import { handleError, logError } from '@/utils/ErrorHandler';
import { useToastExt } from './useToastExt';
import { getCurrentUser } from '@/lib/auth';
import { api } from '@/lib/requestFactory';
import { supabase } from '@/lib/auth/supabase';
import type { z } from 'zod';

type AdminCreate = z.infer<typeof adminCreateSchema>;
type AdminUpdate = z.infer<typeof adminUpdateSchema>;

interface AdminListResponse {
  admins: Admin[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface UseAdminsOptions {
  page?: number;
  limit?: number;
  search?: string;
}

export function useAdmins(options: UseAdminsOptions = {}) {
  const { success: showSuccess, error: showError } = useToastExt();
  const queryClient = useQueryClient();

  const { page = 1, limit = 10, search = '' } = options;

  // Fetch admins list
  const query = useQuery({
    queryKey: ['admins', page, limit, search],
    queryFn: async (): Promise<AdminListResponse> => {
      try {
        const user = await getCurrentUser();
        
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
          ...(search && { search })
        });

        const result = await api.get<AdminListResponse>(`/api/admins?${params}`);
        
        // Validate response data
        if (!result || !Array.isArray(result.admins)) {
          throw new Error('Invalid response format from server');
        }

        const validatedAdmins = result.admins
          .map((admin: any) => {
            const validation = adminSchema.safeParse(admin);
            if (!validation.success) {
              console.warn('Invalid admin data:', validation.error);
              return null;
            }
            return validation.data;
          })
          .filter((admin: any): admin is Admin => admin !== null);

        return {
          admins: validatedAdmins,
          pagination: result.pagination
        };

      } catch (error) {
        // Handle 404 or missing API endpoint gracefully
        if (error instanceof Error && error.message.includes('404')) {
          console.warn('Admins API endpoint not yet implemented, returning empty array');
          return {
            admins: [],
            pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
          };
        }
        
        const { message } = handleError(error, { 
          component: 'useAdmins',
          action: 'fetchAdmins'
        });
        
        showError('Failed to load admins', message);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1, // Reduce retries since API might not exist yet
  });

  // Set up realtime subscription for admins table
  useEffect(() => {
    const channel = supabase
      .channel('admins-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'admins'
        },
        (payload) => {
          console.log('🔄 Realtime admin change detected:', payload);
          
          // Invalidate and refetch admins data
          queryClient.invalidateQueries({ queryKey: ['admins'] });
          
          // Show toast notifications for different events
          switch (payload.eventType) {
            case 'INSERT':
              const newAdmin = payload.new as Admin;
              showSuccess('New Admin Added', `${newAdmin.first_name} ${newAdmin.last_name} joined the team`);
              break;
            case 'UPDATE':
              const updatedAdmin = payload.new as Admin;
              showSuccess('Admin Updated', `${updatedAdmin.first_name} ${updatedAdmin.last_name}'s profile was updated`);
              break;
            case 'DELETE':
              const deletedAdmin = payload.old as Admin;
              showSuccess('Admin Removed', `${deletedAdmin.first_name} ${deletedAdmin.last_name} was removed from the team`);
              break;
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, showSuccess]);

  // Create admin mutation
  const createMutation = useMutation({
    mutationFn: async (adminData: AdminCreate): Promise<Admin> => {
      
      // Validate input data
      const validation = adminCreateSchema.safeParse(adminData);
      if (!validation.success) {
        throw new Error('Invalid admin data: ' + validation.error.errors.map(e => e.message).join(', '));
      }

      const result = await api.post<Admin>('/api/admins', validation.data);
      return result;
    },
    onSuccess: (newAdmin) => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      showSuccess('Admin Created', `${newAdmin.first_name} ${newAdmin.last_name} has been added successfully.`);
    },
    onError: (error) => {
      const { message } = handleError(error, { 
        component: 'useAdmins',
        action: 'createAdmin'
      });
      showError('Failed to create admin', message);
    }
  });

  // Update admin mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: AdminUpdate }): Promise<Admin> => {
      
      // Validate input data
      const validation = adminUpdateSchema.safeParse(data);
      if (!validation.success) {
        throw new Error('Invalid admin data: ' + validation.error.errors.map(e => e.message).join(', '));
      }

      const result = await api.put<Admin>(`/api/admins/${id}`, validation.data);
      return result;
    },
    onSuccess: (updatedAdmin) => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      queryClient.invalidateQueries({ queryKey: ['admin', updatedAdmin.id] });
      showSuccess('Admin Updated', `${updatedAdmin.first_name} ${updatedAdmin.last_name} has been updated successfully.`);
    },
    onError: (error) => {
      const { message } = handleError(error, { 
        component: 'useAdmins',
        action: 'updateAdmin'
      });
      showError('Failed to update admin', message);
    }
  });

  // Delete admin mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string): Promise<{ message: string }> => {

      const result = await api.delete<{ message: string }>(`/api/admins/${id}`);
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      showSuccess('Admin Deleted', result.message);
    },
    onError: (error) => {
      const { message } = handleError(error, { 
        component: 'useAdmins',
        action: 'deleteAdmin'
      });
      showError('Failed to delete admin', message);
    }
  });

  // Promote admin mutation
  const promoteMutation = useMutation({
    mutationFn: async (id: string): Promise<Admin> => {

      const result = await api.post<Admin>(`/api/admins/${id}/promote`);
      return result;
    },
    onSuccess: (promotedAdmin) => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      queryClient.invalidateQueries({ queryKey: ['admin', promotedAdmin.id] });
      showSuccess('Admin Promoted', `${promotedAdmin.first_name} ${promotedAdmin.last_name} has been promoted to Superadmin.`);
    },
    onError: (error) => {
      const { message } = handleError(error, { 
        component: 'useAdmins',
        action: 'promoteAdmin'
      });
      showError('Failed to promote admin', message);
    }
  });

  return {
    // Query data
    data: query.data?.admins || [],
    pagination: query.data?.pagination,
    error: query.error,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,

    // Mutations
    createAdmin: createMutation.mutate,
    updateAdmin: updateMutation.mutate,
    deleteAdmin: deleteMutation.mutate,
    promoteAdmin: promoteMutation.mutate,

    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isPromoting: promoteMutation.isPending,
  };
}
