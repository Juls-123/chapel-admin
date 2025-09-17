import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/requestFactory";
import { useToast } from "@/hooks/use-toast";
import type {
  StudentRecord,
  CreateStudentInput as CreateStudentData,
} from "@/services/StudentService";

export type Student = StudentRecord;
export type { CreateStudentData, StudentRecord };

export type UpdateStudentData = Partial<CreateStudentData> & {
  status?: "active" | "inactive";
};

export interface BulkUploadPayload {
  students: CreateStudentData[];
  uploadMetadata: {
    student_upload_id: string;
    fileName?: string;
    fileSize?: number;
  };
}

export interface UploadRecord {
  id: string;
  storage_path: string;
  file_hash: string;
  uploaded_by: string;
  uploaded_at: string;
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

  // Build a stable key from scalar params only
  const {
    page = 1,
    limit = 50,
    search = "",
    level = "",
    status = "",
    department = "",
  } = queryParams;
  const queryKey = [
    "students",
    page,
    limit,
    search || null,
    level || null,
    status || null,
    department || null,
  ];

  // Query for fetching students
  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<StudentsResponse> => {
      const searchParams = new URLSearchParams();
      if (page) searchParams.set("page", String(page));
      if (limit) searchParams.set("limit", String(limit));
      if (search) searchParams.set("search", search);
      if (level) searchParams.set("level", level);
      if (status) searchParams.set("status", status);
      if (department) searchParams.set("department", department);

      const url = `/api/students?${searchParams.toString()}`;
      const result = await api.get<any>(url);

      // Normalize shapes: prefer { success, data } then { data }, else array
      let studentsData, paginationData;
      if (Array.isArray(result)) {
        studentsData = result;
      } else if (result?.success && result?.data) {
        studentsData = result.data;
        paginationData = result.pagination;
      } else if (result?.data) {
        studentsData = result.data;
        paginationData = result.pagination;
      } else {
        studentsData = result;
      }

      return {
        data: studentsData || [],
        pagination: paginationData || {
          page: Number(page) || 1,
          limit: Number(limit) || 50,
          total: studentsData?.length || 0,
          totalPages: 1,
        },
      };
    },
    staleTime: 60_000, // 1 minute
    refetchOnWindowFocus: false,
  });

  // Mutation for uploading files and creating upload records
  const uploadFileMutation = useMutation({
    mutationFn: async (file: File): Promise<UploadRecord> => {
      // Create FormData properly
      const formData = new FormData();
      formData.append("file", file);

      const result = await api.post<{ data: UploadRecord }>(
        "/api/students/uploads",
        formData
        // The request factory should handle FormData properly
      );

      // Handle both { data: ... } and direct response formats
      return result.data || result;
    },
    onSuccess: (result) => {
      toast({
        title: "File Uploaded Successfully",
        description: `Upload record created with ID ${result.id}`,
      });
    },
    onError: (error: any) => {
      if (error.response?.data?.error && error.response?.data?.details) {
        toast({
          title: error.response.data.error,
          description: error.response.data.details,
          variant: "destructive",
        });
      } else if (error.response?.data?.error) {
        toast({
          title: "File Upload Failed",
          description: error.response.data.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "File Upload Failed",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  // Mutation for creating students (single or bulk)
  const createMutation = useMutation({
    mutationFn: async (
      data: CreateStudentData | CreateStudentData[] | BulkUploadPayload
    ): Promise<Student | Student[]> => {
      const result = await api.post<Student | Student[]>("/api/students", data);
      return result;
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      const count = Array.isArray(result) ? result.length : 1;
      toast({
        title: count > 1 ? "Students Created" : "Student Created",
        description:
          count > 1
            ? `${count} students have been successfully registered.`
            : `Student has been successfully registered.`,
      });

      if (
        "students" in (variables as any) &&
        "uploadMetadata" in (variables as any) &&
        onUploadSuccess
      ) {
        onUploadSuccess(result, variables);
      }
    },
    onError: (error: any, variables) => {
      if (error.status === 403 || error.code === "FORBIDDEN") {
        toast({
          title: "Access Denied",
          description:
            "Only superadmin users can manage student records. Please contact your administrator.",
          variant: "destructive",
        });
        return;
      }

      if (error.response?.data?.error && error.response?.data?.details) {
        toast({
          title: error.response.data.error,
          description: error.response.data.details,
          variant: "destructive",
        });
      } else if (error.response?.data?.error) {
        toast({
          title: "Failed to create student(s)",
          description: error.response.data.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Failed to create student(s)",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
      }

      if (
        "students" in (variables as any) &&
        "uploadMetadata" in (variables as any) &&
        onUploadError
      ) {
        onUploadError(error, variables);
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateStudentData;
    }): Promise<Student> => {
      const result = await api.put<Student>(`/api/students/${id}`, data);
      return result;
    },
    onSuccess: (updatedStudent) => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast({
        title: "Student Updated",
        description: `${updatedStudent.full_name} has been updated successfully.`,
      });
    },
    onError: (error: any) => {
      if (error.response?.data?.error && error.response?.data?.details) {
        toast({
          title: error.response.data.error,
          description: error.response.data.details,
          variant: "destructive",
        });
      } else if (error.response?.data?.error) {
        toast({
          title: "Failed to update student",
          description: error.response.data.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Failed to update student",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string): Promise<{ message: string }> => {
      const result = await api.delete<{ message: string }>(
        `/api/students/${id}`
      );
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast({ title: "Student Deactivated", description: result.message });
    },
    onError: (error: any) => {
      if (error.response?.data?.error && error.response?.data?.details) {
        toast({
          title: error.response.data.error,
          description: error.response.data.details,
          variant: "destructive",
        });
      } else if (error.response?.data?.error) {
        toast({
          title: "Failed to delete student",
          description: error.response.data.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Failed to delete student",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  // Combined upload workflow method
  const uploadStudentsWithFile = async (
    file: File,
    students: CreateStudentData[]
  ): Promise<void> => {
    try {
      // Step 1: Upload file and create upload record
      const uploadRecord = await new Promise<UploadRecord>(
        (resolve, reject) => {
          uploadFileMutation.mutate(file, {
            onSuccess: resolve,
            onError: reject,
          });
        }
      );

      // Step 2: Upload students with proper metadata
      const uploadPayload: BulkUploadPayload = {
        students,
        uploadMetadata: {
          student_upload_id: uploadRecord.id,
          fileName: file.name,
          fileSize: file.size,
        },
      };

      await new Promise<void>((resolve, reject) => {
        createMutation.mutate(uploadPayload, {
          onSuccess: () => resolve(),
          onError: reject,
        });
      });
    } catch (error) {
      throw error;
    }
  };

  return {
    students: query.data?.data || [],
    pagination: query.data?.pagination,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    createStudent: createMutation.mutate,
    uploadFile: uploadFileMutation.mutate,
    updateStudent: updateMutation.mutate,
    deleteStudent: deleteMutation.mutate,
    uploadStudentsWithFile,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isUploadingFile: uploadFileMutation.isPending,
  };
}
