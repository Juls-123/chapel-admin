import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Admin } from '@/lib/types';
import { handleError } from '@/utils/ErrorHandler';
import { useToastExt } from './useToastExt';
import { api } from '@/lib/requestFactory';

export function useProfile() {
  const { success: showSuccess, error: showError } = useToastExt();
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: async (): Promise<Admin> => {
      try {
        const data = await api.get<Admin>('/api/profile');
        return data;
      } catch (error) {
        // Handle 404 or missing API endpoint gracefully
        if (error instanceof Error && error.message.includes('404')) {
          console.warn('Profile API endpoint not yet implemented, returning mock data');
          // Return mock data for development
          return {
            id: 'mock-id',
            first_name: 'Development',
            last_name: 'User',
            email: 'dev@mtu.chapel',
            role: 'admin',
            created_at: new Date().toISOString(),
          };
        }
        
        const { message } = handleError(error, { 
          component: 'useProfile',
          action: 'fetchProfile' 
        });
        showError(message);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1, // Reduce retries since API might not exist yet
  });

  const updateMutation = useMutation({
    mutationFn: async (updateData: Partial<Pick<Admin, 'first_name' | 'middle_name' | 'last_name'>>) => {
      const result = await api.put<Admin>('/api/profile', updateData);
      return result;
    },
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(['profile'], updatedProfile);
      showSuccess('Profile updated successfully');
    },
    onError: (error) => {
      const { message } = handleError(error, { 
        component: 'useProfile',
        action: 'updateProfile' 
      });
      showError(message);
    },
  });

  return {
    profile: profileQuery.data,
    isLoading: profileQuery.isLoading,
    isError: profileQuery.isError,
    error: profileQuery.error,
    updateProfile: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    refetch: profileQuery.refetch,
  };
}
