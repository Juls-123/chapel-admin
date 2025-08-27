export interface Student {
  id: string;
  matric_number: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  email: string;
  parents_email: string;
  status: 'active' | 'paused';
  level: number;
  parents_phone_number: string;
}

export interface Service {
  id: string;
  date: Date;
  type: 'morning' | 'evening' | 'special';
  name?: string; // for special services
  status: 'active' | 'cancelled' | 'completed' | 'upcoming';
  created_by: string;
  created_at: Date;
}

export interface Exeat {
  id: string;
  matric_number: string;
  student_name: string;
  start_date: Date;
  end_date: Date;
  reason?: string;
  status: 'active' | 'past' | 'upcoming';
  approved_by: string;
  created_at: Date;
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
  missed_service_dates: Date[];
  status: 'pending' | 'sent' | 'failed';
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
  middle_name: string;
  last_name: string;
  email: string;
  role: 'superadmin' | 'admin';
}
