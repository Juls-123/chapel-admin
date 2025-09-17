import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "./use-toast";
import { useEffect } from "react";
import { getAuthHeaders } from "@/lib/auth";

// Types matching your frontend expectations
export interface ServiceOption {
  id: string;
  name: string;
  service_type: "devotion" | "special" | "seminar";
  devotion_type?: "morning" | "evening";
  service_date: string;
  service_time?: string;
}

export interface AbsentStudent {
  student_id: string;
  matric_number: string;
  student_name: string;
  level: string;
  gender: string;
}

export interface ClearedStudent {
  student_id: string;
  matric_number: string;
  student_name: string;
  level: string;
  gender: string;
  cleared_at: string;
  reason_id: string;
  cleared_by: string;
  comments?: string;
}

export interface OverrideReason {
  id: string;
  label: string;
  description?: string;
  requires_note: boolean;
  active: boolean;
}

export interface ClearanceRequest {
  studentIds: string[];
  serviceId: string;
  level: string;
  date: string;
  reasonId: string;
  clearedBy: string;
  comments?: string;
}

export interface ClearanceResult {
  success: boolean;
  message: string;
  cleared_count: number;
  failed_students?: string[];
}

// API Functions
async function fetchServicesByDate(date: string): Promise<ServiceOption[]> {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/manual-clearance/services?date=${date}`, {
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.details || error.error || "Failed to fetch services");
  }

  return response.json();
}

async function fetchAbsentStudents(
  serviceId: string,
  level: string,
  date: string
): Promise<AbsentStudent[]> {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams({
    serviceId,
    level,
    date,
  });

  const response = await fetch(
    `/api/manual-clearance/absentees?${params.toString()}`,
    {
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.details || error.error || "Failed to fetch absent students"
    );
  }

  return response.json();
}

async function fetchClearedStudents(
  serviceId: string,
  level: string,
  date: string
): Promise<ClearedStudent[]> {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams({
    serviceId,
    level,
    date,
  });

  const response = await fetch(
    `/api/manual-clearance/cleared?${params.toString()}`,
    {
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    // Return empty array if file doesn't exist or other non-critical errors
    return [];
  }

  return response.json();
}

async function fetchOverrideReasons(): Promise<OverrideReason[]> {
  const headers = await getAuthHeaders();
  const response = await fetch("/api/manual-clearance/reasons", {
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.details || error.error || "Failed to fetch override reasons"
    );
  }

  return response.json();
}

async function clearStudents(
  clearanceData: ClearanceRequest
): Promise<ClearanceResult> {
  const headers = await getAuthHeaders();
  const response = await fetch("/api/manual-clearance/clear", {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(clearanceData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.details || error.error || "Failed to clear students");
  }

  return response.json();
}

// Main Hook
export function useManualClearance() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query for services by date
  const useServicesByDate = (date: string) => {
    return useQuery({
      queryKey: ["manual-clearance", "services", date],
      queryFn: () => fetchServicesByDate(date),
      enabled: !!date,
      staleTime: 1000 * 60 * 5, // 5 minutes
    });
  };

  // Query for absent students
  const useAbsentStudents = (
    serviceId: string,
    level: string,
    date: string
  ) => {
    return useQuery({
      queryKey: ["manual-clearance", "absentees", serviceId, level, date],
      queryFn: () => fetchAbsentStudents(serviceId, level, date),
      enabled: !!(serviceId && level && date),
      staleTime: 1000 * 60 * 2, // 2 minutes (more frequent refresh for student data)
    });
  };

  // Query for cleared students
  const useClearedStudents = (
    serviceId: string,
    level: string,
    date: string
  ) => {
    return useQuery({
      queryKey: ["manual-clearance", "cleared", serviceId, level, date],
      queryFn: () => fetchClearedStudents(serviceId, level, date),
      enabled: !!(serviceId && level && date),
      staleTime: 1000 * 60 * 2, // 2 minutes
    });
  };

  // Query for override reasons (cached longer since they change rarely)
  const useOverrideReasons = () => {
    const query = useQuery({
      queryKey: ["manual-clearance", "override-reasons"],
      queryFn: fetchOverrideReasons,
      staleTime: 1000 * 60 * 30, // 30 minutes
    });

    useEffect(() => {
      if (query.error) {
        toast({
          title: "Error fetching override reasons",
          description: (query.error as Error).message,
          variant: "destructive",
        });
      }
    }, [query.error, toast]);

    return query;
  };

  // Mutation for clearing students
  const clearStudentsMutation = useMutation({
    mutationFn: clearStudents,
    onSuccess: (result, variables) => {
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({
        queryKey: [
          "manual-clearance",
          "absentees",
          variables.serviceId,
          variables.level,
          variables.date,
        ],
      });
      queryClient.invalidateQueries({
        queryKey: [
          "manual-clearance",
          "cleared",
          variables.serviceId,
          variables.level,
          variables.date,
        ],
      });

      toast({
        title: "Students Cleared",
        description: result.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error clearing students",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Helper function to refresh attendance data
  const refreshAttendanceData = (
    serviceId: string,
    level: string,
    date: string
  ) => {
    queryClient.invalidateQueries({
      queryKey: ["manual-clearance", "absentees", serviceId, level, date],
    });
    queryClient.invalidateQueries({
      queryKey: ["manual-clearance", "cleared", serviceId, level, date],
    });
  };

  return {
    // Query hooks
    useServicesByDate,
    useAbsentStudents,
    useClearedStudents,
    useOverrideReasons,

    // Mutation
    clearStudents: clearStudentsMutation.mutate,
    clearStudentsAsync: clearStudentsMutation.mutateAsync,
    isClearingStudents: clearStudentsMutation.isPending,

    // Utilities
    refreshAttendanceData,
  };
}

// Individual hooks for specific use cases (following your pattern)
export function useServicesByDate(date: string) {
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ["manual-clearance", "services", date],
    queryFn: () => fetchServicesByDate(date),
    enabled: !!date,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  useEffect(() => {
    if (query.error) {
      toast({
        title: "Error fetching services",
        description: (query.error as Error).message,
        variant: "destructive",
      });
    }
  }, [query.error, toast]);

  return query;
}

export function useAbsentStudents(
  serviceId: string,
  level: string,
  date: string
) {
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ["manual-clearance", "absentees", serviceId, level, date],
    queryFn: () => fetchAbsentStudents(serviceId, level, date),
    enabled: !!(serviceId && level && date),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  useEffect(() => {
    if (query.error) {
      toast({
        title: "Error fetching absent students",
        description: (query.error as Error).message,
        variant: "destructive",
      });
    }
  }, [query.error, toast]);

  return query;
}

export function useOverrideReasons() {
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ["manual-clearance", "override-reasons"],
    queryFn: fetchOverrideReasons,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  useEffect(() => {
    if (query.error) {
      toast({
        title: "Error fetching override reasons",
        description: (query.error as Error).message,
        variant: "destructive",
      });
    }
  }, [query.error, toast]);

  return query;
}

export function useClearStudents() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: clearStudents,
    onSuccess: (result, variables) => {
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({
        queryKey: [
          "manual-clearance",
          "absentees",
          variables.serviceId,
          variables.level,
          variables.date,
        ],
      });
      queryClient.invalidateQueries({
        queryKey: [
          "manual-clearance",
          "cleared",
          variables.serviceId,
          variables.level,
          variables.date,
        ],
      });

      toast({
        title: "Students Cleared",
        description: result.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error clearing students",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
