import type { Tables, Enums } from "@/lib/types/generated";

// Base aliases from DB (single source of truth)
export type StudentRow = Tables<"students">;
export type ServiceRow = Tables<"services">;
export type AdminRow = Tables<"admins">;
export type ExeatRow = Tables<"exeats">;
export type RecentActionRow = Tables<"vw_recent_admin_actions">;

export type ServiceStatus = Enums<"service_status">;
export type ServiceTypeDb = Enums<"service_type">;
export type RoleEnum = Enums<"role_enum">;
export type WarningStatus = Enums<"warning_status">;

// UI expects 'morning' | 'evening' | 'special' in some places.
// DB currently has service_type: e.g. 'devotion' | 'special' | 'seminar' (per generated).
// Provide a bridge. Adjust if DB enum changes.
export type ServiceTypeUi = "morning" | "evening" | "special";

export const mapServiceTypeDbToUi = (t: ServiceTypeDb): ServiceTypeUi => {
  switch (t) {
    case "devotion":
      // If you later split into morning/evening by time, map accordingly.
      return "morning"; // default mapping for now
    case "special":
      return "special";
    case "seminar":
      return "evening"; // placeholder mapping; adjust per business rules
    default:
      return "special";
  }
};

export const mapServiceTypeUiToDb = (t: ServiceTypeUi): ServiceTypeDb => {
  switch (t) {
    case "morning":
      return "devotion";
    case "evening":
      return "seminar";
    case "special":
      return "special";
  }
};

// View models: extend DB rows minimally with derived UI fields
export type Student = StudentRow & {
  level?: number|null; // derived from levels.code
  level_name?: string|null; // derived from levels.name
};

export type Service = ServiceRow & {
  date?: Date; // derived: new Date(service_date)
  // Optional convenience fields used in UI. Not persisted.
  applicable_levels?: number[];
  constraint?: "all" | "none";
  // Map DB enum to UI type at boundaries if needed
  type?: ServiceTypeUi;
};

export type Exeat = ExeatRow & {
  student_id?: string; // when joined
  matric_number?: string; // derived from student join
  student_name?: string; // derived from student join
  duration_days?: number; // computed
  derived_status?: "active" | "ended" | "canceled" | "upcoming" | "past"; // computed for UI
};

export type AttendanceRecord = {
  id: string;
  matric_number: string;
  student_name: string;
  service_id: string;
  service_name: string;
  scanned_at: Date;
  status: "present" | "absent" | "exempted";
  exemption_reason?: "exeat" | "manual_clear";
};

export interface WarningLetterSummary {
  matric_number: string;
  student_name: string;
  week_start: Date;
  miss_count: number;
  status: WarningStatus | "none"; // keep compatibility with UI
  first_created_at?: string;
  last_updated_at?: string;
  sent_at?: string;
  sent_by?: string;
  student_details: {
    id: string;
    email?: string;
    parent_email?: string;
    parent_phone?: string;
    gender?: string;
    department?: string;
    level?: number;
    level_name?: string;
  };
}

export interface RecentAction {
  id: string;
  admin_name: string;
  action: string;
  target: string;
  description?: string;
  date: Date;
}

export type StudentWithRecords = Student & {
  attendance: AttendanceRecord[];
};

export interface Admin {
  id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  role: RoleEnum;
  created_at: string;
  auth_user_id?: string;
}

export interface ManualClear {
  id: string;
  matric_number: string;
  service_id: string;
  cleared_by: string;
  reason: string;
  created_at: Date;
}

export interface ManualClearReason {
  id: string;
  reason: string;
  created_by: string;
  created_at: Date;
}

export interface ServiceConstraint {
  id: string;
  name: string;
  description: string;
  created_by: string;
  created_at: Date;
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  limit: number;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
}
