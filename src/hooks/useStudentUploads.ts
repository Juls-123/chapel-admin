import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/requestFactory";

export interface StudentUpload {
  id: string;
  storage_path: string;
  file_hash: string;
  uploaded_by: string;
  uploaded_at: string | null;
  uploader?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
}

export interface StudentUploadError {
  id: string;
  row_number: number;
  error_type: string;
  error_message: string;
  raw_data: any;
  created_at: string | null;
}

export interface UploadsListResponse {
  data: StudentUpload[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function useStudentUploads(params: {
  page?: number;
  limit?: number;
  search?: string;
  uploader?: string;
  date_from?: string;
  date_to?: string;
}) {
  const {
    page = 1,
    limit = 20,
    search,
    uploader,
    date_from,
    date_to,
  } = params || {};

  return useQuery<UploadsListResponse>({
    queryKey: [
      "student_uploads",
      { page, limit, search, uploader, date_from, date_to },
    ],
    queryFn: async () => {
      const sp = new URLSearchParams();
      sp.set("page", String(page));
      sp.set("limit", String(limit));
      if (search) sp.set("search", search);
      if (uploader) sp.set("uploader", uploader);
      if (date_from) sp.set("date_from", date_from);
      if (date_to) sp.set("date_to", date_to);

      const res = await api.get<any>(`/api/students/uploads?${sp.toString()}`);
      // Normalize shape
      if (res?.data) {
        return {
          data: res.data as StudentUpload[],
          pagination: res.pagination,
        };
      }
      if (Array.isArray(res)) return { data: res };
      return { data: res || [] };
    },
  });
}

export function useStudentUpload(id?: string, includeUrl = false) {
  return useQuery<
    | {
        data: StudentUpload & {
          error_count: number;
          signed_url?: string | null;
        };
      }
    | StudentUpload
    | null
  >({
    queryKey: ["student_upload", id, includeUrl],
    enabled: !!id,
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (includeUrl) sp.set("include_url", "1");
      const res = await api.get<any>(
        `/api/students/uploads/${id}?${sp.toString()}`
      );
      if (res?.data) return res; // buildResponse wrapper
      return res;
    },
  });
}

export function useStudentUploadErrors(id?: string) {
  return useQuery<{ data: StudentUploadError[] } | StudentUploadError[]>({
    queryKey: ["student_upload_errors", id],
    enabled: !!id,
    queryFn: async () => {
      const res = await api.get<any>(`/api/students/uploads/${id}/errors`);
      if (res?.data) return res; // buildResponse wrapper
      return res;
    },
  });
}
