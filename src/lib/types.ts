export interface Student {
  id: string;
  matric_number: string;
  full_name: string;
  email: string;
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
  status: 'pending' | 'sent' | 'failed' | 'overridden';
}

export interface RecentAction {
  id: string;
  admin_name: string;
  action: string;
  target: string;
  date: Date;
}
