import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "./use-toast";
import { useEffect } from "react";
import { getAuthHeaders } from "@/lib/auth";
import { ServiceItem, ServiceStatus } from "@/services/ServiceService";

// Workflow-level types (API shapes)
export interface Service {
  applicable_levels: string[];
  id: string;
  type: "morning" | "evening" | "special";
  name?: string;
  date: string; // ISO
  status: "scheduled" | "active" | "completed" | "canceled";
  levels: string[];
  created_by?: string;
  created_by_name?: string;
  locked_after_ingestion?: boolean;
}

export interface CreateServiceData {
  service_type: "devotion" | "special" | "seminar";
  devotion_type?: "morning" | "evening";
  name?: string;
  date: string; // ISO date string
  time: string; // HH:mm format
  applicable_levels: string[]; // level IDs
  gender_constraint: "male" | "female" | "both";
}

export interface UpdateServiceData extends Partial<CreateServiceData> {}

export interface ServiceFilters {
  // Client-side filters only; kept for table state
  type?: "morning" | "evening" | "special";
  status?: "scheduled" | "active" | "completed" | "canceled";
  date_from?: string;
  date_to?: string;
  search?: string;
}

// API functions
async function fetchServices(filters: ServiceFilters = {}): Promise<Service[]> {
  const headers = await getAuthHeaders();

  // Build query parameters to include all services including canceled
  const params = new URLSearchParams();

  // Always include all statuses including canceled
  params.append("status", "scheduled,active,completed,canceled");

  // Add other filters if provided
  if (filters.type) params.append("type", filters.type);
  if (filters.date_from) params.append("date_from", filters.date_from);
  if (filters.date_to) params.append("date_to", filters.date_to);
  if (filters.search) params.append("search", filters.search);

  const response = await fetch(`/api/services?${params.toString()}`, {
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.details || error.error || "Failed to fetch services");
  }

  return response.json() as Promise<Service[]>; // Ensure fetch returns these fields without narrowing
}

async function createService(serviceData: CreateServiceData): Promise<Service> {
  const headers = await getAuthHeaders();
  const response = await fetch("/api/services", {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(serviceData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.details || error.error || "Failed to create service");
  }

  const result = await response.json();
  return result as Service;
}

async function fetchService(id: string): Promise<Service> {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/services/${id}`, {
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.details || error.error || "Failed to fetch service");
  }

  const result = await response.json();
  // API returns { data } for single GET; normalize to Service
  return (result?.data || result) as Service;
}

async function updateService(this: any, 
  id: string,
  updates: Partial<ServiceItem> & { 
    time?: string; 
    levels?: string[];
    gender_constraint?: 'male' | 'female' | 'both';
  }
): Promise<ServiceItem> {
  const dbUpdate: any = {};
  
  // Handle service type
  if (updates.type) {
    const isSpecial = updates.type === "special";
    dbUpdate.service_type = isSpecial ? "special" : "devotion";
    dbUpdate.devotion_type = isSpecial ? null : updates.type;
  }
  
  // Handle date - now it's just the date string
  if (updates.date) {
    dbUpdate.service_date = updates.date; // Already in "yyyy-MM-dd" format
  }
  
  // Handle time separately
  if ((updates as any).time) {
    dbUpdate.service_time = (updates as any).time; // "HH:mm" format
  }
  
  // Handle status
  if (updates.status) {
    dbUpdate.status = updates.status;
  }
  
  // Handle name
  if (typeof updates.name !== "undefined") {
    dbUpdate.name = updates.name ?? null;
  }
  
  // Handle gender constraint
  if ((updates as any).gender_constraint) {
    dbUpdate.gender_constraint = (updates as any).gender_constraint;
  }

  // Update the main service record
  const { data: updated, error } = await this.supabase
    .from("services")
    .update(dbUpdate)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !updated) {
    throw Object.assign(new Error("Failed to update service"), {
      status: 500,
      code: "SERVICE_UPDATE_FAILED",
      details: error?.message,
    });
  }

  // Handle levels if provided
  let levelsOut: { id: string; code: string; name: string | null }[] = [];
  
  if (Array.isArray((updates as any).levels)) {
    const levelIds = (updates as any).levels as string[]; // These are UUIDs
    
    // Delete existing service_levels entries
    await this.supabase
      .from("service_levels")
      .delete()
      .eq("service_id", id);
    
    // Insert new service_levels entries
    if (levelIds.length > 0) {
      const inserts = levelIds.map(levelId => ({
        service_id: id,
        level_id: levelId,
      }));
      
      await this.supabase
        .from("service_levels")
        .insert(inserts);
    }
    
    // Fetch the full level data
    if (levelIds.length > 0) {
      const { data: levelData } = await this.supabase
        .from("levels")
        .select("id, code, name")
        .in("id", levelIds);
      
      levelsOut = levelData || [];
    }
  } else {
    // If levels weren't updated, fetch existing ones
    const { data: serviceLevels } = await this.supabase
      .from("service_levels")
      .select("level_id, levels(id, code, name)")
      .eq("service_id", id);
    
    levelsOut = (serviceLevels || []).map((sl: any) => ({
      id: sl.levels?.id,
      code: sl.levels?.code,
      name: sl.levels?.name,
    }));
  }

  // Construct the datetime string for the response
  let dateString = updated.service_date;
  if (updated.service_time) {
    const timeFormatted = updated.service_time.substring(0, 5);
    dateString = `${updated.service_date}T${timeFormatted}:00.000Z`;
  }

  return {
    id: updated.id,
    type:
      updated.service_type !== "devotion"
        ? "special"
        : updated.devotion_type === "evening"
        ? "evening"
        : "morning",
    date: dateString,
    status: updated.status as ServiceStatus,
    levels: levelsOut,
    name: updated.name || undefined,
    gender_constraint: updated.gender_constraint,
  };
}

async function deleteService(id: string): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/services/${id}`, {
    method: "DELETE",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.details || error.error || "Failed to cancel service");
  }
}

async function toggleLockIngestion(id: string): Promise<Service> {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/services/${id}/actions`, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action: "toggle_lock" }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.details || error.error || "Failed to toggle lock ingestion"
    );
  }

  const result = await response.json();
  return (result?.data || result) as Service;
}

async function markAsCompleted(id: string): Promise<Service> {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/services/${id}/actions`, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action: "complete" }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.details || error.error || "Failed to mark service as completed"
    );
  }

  const result = await response.json();
  return (result?.data || result) as Service;
}

// Hooks
export function useServices(filters: ServiceFilters = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["services"],
    queryFn: () => fetchServices(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const createServiceMutation = useCreateService();
  const updateServiceMutation = useUpdateService();
  const deleteServiceMutation = useDeleteService();
  const toggleLockMutation = useToggleLockIngestion();
  const markCompletedMutation = useMarkAsCompleted();

  // Handle errors with toast in useEffect to avoid setState during render
  useEffect(() => {
    if (query.error) {
      toast({
        title: "Error fetching services",
        description: (query.error as Error).message,
        variant: "destructive",
      });
    }
  }, [query.error, toast]);

  return {
    services: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    createService: createServiceMutation.mutate,
    isCreating: createServiceMutation.isPending,
    updateService: updateServiceMutation.mutate,
    isUpdating: updateServiceMutation.isPending,
    deleteService: deleteServiceMutation.mutate,
    isDeleting: deleteServiceMutation.isPending,
    toggleLock: toggleLockMutation.mutate,
    markCompleted: markCompletedMutation.mutate,
    isTogglingLock: toggleLockMutation.isPending,
    isMarkingCompleted: markCompletedMutation.isPending,
    // Legacy API for existing components
    performAction: async (params: { id: string; action: any }) => {
      if (params.action.action === "cancel") {
        return deleteServiceMutation.mutateAsync(params.id);
      } else if (params.action.action === "complete") {
        return markCompletedMutation.mutateAsync(params.id);
      }
      // Add other actions as needed
      throw new Error("Action not implemented");
    },
    isPerformingAction:
      deleteServiceMutation.isPending || markCompletedMutation.isPending,
  };
}

export function useService(id: string) {
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ["service", id],
    queryFn: () => fetchService(id),
    enabled: !!id,
  });

  // Handle errors with toast in useEffect to avoid setState during render
  useEffect(() => {
    if (query.error) {
      toast({
        title: "Error fetching service",
        description: (query.error as Error).message,
        variant: "destructive",
      });
    }
  }, [query.error, toast]);

  return query;
}

export function useCreateService() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: createService,
    onSuccess: (newService) => {
      // Invalidate and refetch services list
      queryClient.invalidateQueries({ queryKey: ["services"] });

      toast({
        title: "Service created",
        description: `${newService.type} service for ${newService.date} created successfully`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating service",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateService() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateServiceData }) =>
      updateService(id, data),
    onSuccess: (updatedService) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({
        queryKey: ["service", updatedService.id],
      });

      toast({
        title: "Service updated",
        description: "Service updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating service",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteService() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: deleteService,
    onSuccess: () => {
      // Invalidate and refetch services list
      queryClient.invalidateQueries({ queryKey: ["services"] });

      toast({
        title: "Service canceled",
        description: "Service canceled successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error canceling service",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useToggleLockIngestion() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: toggleLockIngestion,
    onSuccess: (updatedService) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({
        queryKey: ["service", updatedService.id],
      });

      toast({
        title: updatedService.locked_after_ingestion
          ? "Ingestion locked"
          : "Ingestion unlocked",
        description: `Service ingestion has been ${
          updatedService.locked_after_ingestion ? "locked" : "unlocked"
        }`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error toggling lock",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useMarkAsCompleted() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: markAsCompleted,
    onSuccess: (updatedService) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({
        queryKey: ["service", updatedService.id],
      });

      toast({
        title: "Service completed",
        description: "Service marked as completed successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error marking service as completed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
