import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { api } from "@/lib/requestFactory";
import { supabase } from "@/lib/auth/supabase";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/lib/types/generated";
import type { APIResponse, PaginationInfo } from "@/lib/api/response";

// Type definitions
export type AttendanceIssue =
  Database["public"]["Tables"]["attendance_issues"]["Row"] & {
    student?: {
      id: string;
      matric_number: string;
      first_name: string;
      last_name: string;
    };
    attendance_batch?: {
      id: string;
      version_number: number;
      attendance_upload?: {
        service_id: string;
        level_id: string;
      };
    };
  };

export type AttendanceUpload =
  Database["public"]["Tables"]["attendance_uploads"]["Row"] & {
    uploader?: {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
    };
    service?: {
      id: string;
      service_type: string;
      devotion_type?: string;
      name?: string;
      service_date: string;
      service_time?: string;
    };
    level?: {
      id: string;
      code: string;
      name: string;
    };
  };

export interface ServiceItem {
  id: string;
  service_type: "devotion" | "special" | "seminar";
  devotion_type?: "morning" | "evening";
  name?: string;
  service_date: string;
  service_time: string;
  status: "scheduled" | "active" | "completed" | "canceled";
  levels: Array<{
    id: string;
    code: string;
    name: string;
  }>;
}

export interface StudentLite {
  id: string;
  matric_number: string;
  first_name: string;
  last_name: string;
}

// Updated response types to match API conventions
export interface AttendanceAPIResponse<T> extends APIResponse<T> {
  meta?: {
    pagination?: PaginationInfo;
    timestamp: string;
    requestId: string;
  };
}

// Query parameters interfaces
export interface AttendanceIssuesParams {
  page?: number;
  limit?: number;
  resolved?: boolean;
  service_id?: string;
  level_id?: string;
}

export interface AttendanceUploadsParams {
  page?: number;
  limit?: number;
  service_id?: string;
  level_id?: string;
  uploader_id?: string;
}

export interface ServicesParams {
  service_date?: string;
  status?: string[];
}

export interface StudentsParams {
  service_id?: string;
  level_id?: string;
}

// Hook for fetching attendance issues
export function useAttendanceIssues(params: AttendanceIssuesParams = {}) {
  const { page = 1, limit = 20, resolved, service_id, level_id } = params;

  return useQuery({
    queryKey: [
      "attendance-issues",
      { page, limit, resolved, service_id, level_id },
    ],
    queryFn: async (): Promise<AttendanceAPIResponse<AttendanceIssue[]>> => {
      const searchParams = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });

      if (resolved !== undefined)
        searchParams.set("resolved", String(resolved));
      if (service_id) searchParams.set("service_id", service_id);
      if (level_id) searchParams.set("level_id", level_id);

      const result = await api.get<AttendanceAPIResponse<AttendanceIssue[]>>(
        `/api/attendance/issues?${searchParams.toString()}`
      );
      return result;
    },
    staleTime: 30_000, // 30 seconds
    refetchOnWindowFocus: false,
  });
}

// Hook for fetching attendance uploads
export function useAttendanceUploads(params: AttendanceUploadsParams = {}) {
  const { page = 1, limit = 20, service_id, level_id, uploader_id } = params;

  return useQuery({
    queryKey: [
      "attendance-uploads",
      { page, limit, service_id, level_id, uploader_id },
    ],
    queryFn: async (): Promise<AttendanceAPIResponse<AttendanceUpload[]>> => {
      const searchParams = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });

      if (service_id) searchParams.set("service_id", service_id);
      if (level_id) searchParams.set("level_id", level_id);
      if (uploader_id) searchParams.set("uploader_id", uploader_id);

      const result = await api.get<AttendanceAPIResponse<AttendanceUpload[]>>(
        `/api/attendance/uploads?${searchParams.toString()}`
      );
      return result;
    },
    staleTime: 30_000, // 30 seconds
    refetchOnWindowFocus: false,
  });
}

// Hook for fetching services with defensive programming
export function useAttendanceServices(params: ServicesParams = {}) {
  const { service_date, status = ["scheduled", "active"] } = params;

  const queryKey = [
    "attendance-services",
    service_date,
    status.join(","),
  ].filter(Boolean);

  return useQuery({
    queryKey,
    queryFn: async (): Promise<ServiceItem[]> => {
      if (!service_date) {
        return [];
      }

      const searchParams = new URLSearchParams();
      searchParams.set("service_date", service_date);
      searchParams.set("status", status.join(","));

      try {
        // The Services API returns ServiceItem[] directly, not wrapped in { data }
        const result = await api.get<ServiceItem[]>(
          `/api/services?${searchParams.toString()}`
        );
        return result || [];
      } catch (error) {
        console.error("Failed to fetch services:", error);
        return [];
      }
    },
    staleTime: 60_000, // 1 minute
    refetchOnWindowFocus: false,
  });
}

// Hook for fetching students for attendance with defensive programming
export function useAttendanceStudents(params: StudentsParams = {}) {
  const { service_id, level_id } = params;

  const queryKey = ["attendance-students", service_id, level_id].filter(
    Boolean
  );

  return useQuery({
    queryKey,
    queryFn: async (): Promise<StudentLite[]> => {
      if (!service_id || !level_id) {
        return [];
      }

      const searchParams = new URLSearchParams();
      searchParams.set("service_id", service_id);
      searchParams.set("level_id", level_id);

      try {
        const result = await api.get<{ success: boolean; data: StudentLite[] }>(
          `/api/attendance/students?${searchParams.toString()}`
        );
        return result?.data || [];
      } catch (error) {
        console.error("Failed to fetch attendance students:", error);
        return [];
      }
    },
    staleTime: 60_000, // 1 minute
    refetchOnWindowFocus: false,
  });
}

// Hook for attendance upload operations with real-time updates
export function useAttendanceUpload() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Real-time subscriptions for attendance data
  useEffect(() => {
    const channel = supabase
      .channel("attendance_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "attendance_issues" },
        (() => {
          let timeout: ReturnType<typeof setTimeout> | null = null;
          return () => {
            if (timeout) clearTimeout(timeout);
            timeout = setTimeout(() => {
              queryClient.invalidateQueries({
                queryKey: ["attendance-issues"],
              });
            }, 300);
          };
        })()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "attendance_uploads" },
        (() => {
          let timeout: ReturnType<typeof setTimeout> | null = null;
          return () => {
            if (timeout) clearTimeout(timeout);
            timeout = setTimeout(() => {
              queryClient.invalidateQueries({
                queryKey: ["attendance-uploads"],
              });
            }, 300);
          };
        })()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/attendance/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-issues"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-uploads"] });
      toast({
        title: "Upload Successful",
        description: "Attendance data has been processed successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description:
          error.message || "An unexpected error occurred during upload.",
        variant: "destructive",
      });
    },
  });

  return {
    upload: uploadMutation.mutate,
    isUploading: uploadMutation.isPending,
    uploadError: uploadMutation.error,
  };
}
