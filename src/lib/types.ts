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

export interface Service {
  service_date: string;
  id: string;
  date: Date;
  type: 'morning' | 'evening' | 'special';
  name?: string; // for special services
  status: 'active' | 'canceled' | 'completed' ;
  created_by: string;
  created_at: Date;
  applicable_levels?: number[];
  constraint?: 'all' | 'none';
}

export interface Exeat {
  id: string;
  student_id: string;
  matric_number: string;
  student_name: string;
  start_date: string;
  end_date: string;
  reason?: string;
  status: 'active' | 'ended' | 'canceled';
  created_by: string;
  created_at: string;
  duration_days?: number;
  derived_status?: 'active' | 'ended' | 'canceled' | 'upcoming' | 'past';
}

export interface ManualClear {
  id: string;
  matric_number: string;
  service_id: string;
  cleared_by: string;
  reason: string;
  created_at: Date;
}

export interface AttendanceRecord {
  id: string;
  matric_number: string;
  student_name: string;
  service_id: string;
  service_name: string;
  scanned_at: Date;
  status: 'present' | 'absent' | 'exempted';
  exemption_reason?: 'exeat' | 'manual_clear';
}

export interface WarningLetterSummary {
  matric_number: string;
  student_name: string;
  week_start: Date;
  miss_count: number;
  status: 'none' | 'pending' | 'sent';
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
  role: 'superadmin' | 'admin';
  created_at: string;
  auth_user_id?: string;
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
