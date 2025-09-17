export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      admin_actions: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string | null
          details: Json | null
          id: string
          object_id: string | null
          object_label: string | null
          object_type: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          object_id?: string | null
          object_label?: string | null
          object_type?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          object_id?: string | null
          object_label?: string | null
          object_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_actions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
        ]
      }
      admins: {
        Row: {
          auth_user_id: string | null
          created_at: string | null
          email: string
          first_name: string
          id: string
          last_name: string
          middle_name: string | null
          role: Database["public"]["Enums"]["role_enum"]
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string | null
          email: string
          first_name: string
          id?: string
          last_name: string
          middle_name?: string | null
          role?: Database["public"]["Enums"]["role_enum"]
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string | null
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          middle_name?: string | null
          role?: Database["public"]["Enums"]["role_enum"]
        }
        Relationships: []
      }
      attendance_batches: {
        Row: {
          absentees_path: string
          attendance_upload_id: string
          attendees_path: string
          created_at: string | null
          exempted_path: string | null
          id: string
          issues_path: string
          raw_path: string
          version_number: number
        }
        Insert: {
          absentees_path: string
          attendance_upload_id: string
          attendees_path: string
          created_at?: string | null
          exempted_path?: string | null
          id?: string
          issues_path: string
          raw_path: string
          version_number?: number
        }
        Update: {
          absentees_path?: string
          attendance_upload_id?: string
          attendees_path?: string
          created_at?: string | null
          exempted_path?: string | null
          id?: string
          issues_path?: string
          raw_path?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "attendance_batches_attendance_upload_id_fkey"
            columns: ["attendance_upload_id"]
            isOneToOne: false
            referencedRelation: "attendance_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_issues: {
        Row: {
          attendance_batch_id: string
          created_at: string | null
          id: string
          issue_description: string
          issue_type: string
          raw_data: Json | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          student_id: string | null
        }
        Insert: {
          attendance_batch_id: string
          created_at?: string | null
          id?: string
          issue_description: string
          issue_type: string
          raw_data?: Json | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          student_id?: string | null
        }
        Update: {
          attendance_batch_id?: string
          created_at?: string | null
          id?: string
          issue_description?: string
          issue_type?: string
          raw_data?: Json | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_issues_attendance_batch_id_fkey"
            columns: ["attendance_batch_id"]
            isOneToOne: false
            referencedRelation: "attendance_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_issues_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_issues_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_uploads: {
        Row: {
          file_hash: string
          id: string
          level_id: string
          service_id: string
          storage_path: string
          uploaded_at: string | null
          uploaded_by: string
        }
        Insert: {
          file_hash: string
          id?: string
          level_id: string
          service_id: string
          storage_path: string
          uploaded_at?: string | null
          uploaded_by: string
        }
        Update: {
          file_hash?: string
          id?: string
          level_id?: string
          service_id?: string
          storage_path?: string
          uploaded_at?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_uploads_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_uploads_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "vw_service_level_details"
            referencedColumns: ["level_id"]
          },
          {
            foreignKeyName: "attendance_uploads_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_uploads_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "vw_service_level_details"
            referencedColumns: ["service_id"]
          },
          {
            foreignKeyName: "attendance_uploads_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "vw_services_with_datetime"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_uploads_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "vw_services_with_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_uploads_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
        ]
      }
      exeats: {
        Row: {
          created_at: string | null
          created_by: string | null
          end_date: string
          id: string
          period: unknown | null
          reason: string | null
          start_date: string
          status: string | null
          student_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          end_date: string
          id?: string
          period?: unknown | null
          reason?: string | null
          start_date: string
          status?: string | null
          student_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          end_date?: string
          id?: string
          period?: unknown | null
          reason?: string | null
          start_date?: string
          status?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exeats_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exeats_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      levels: {
        Row: {
          code: string
          created_at: string | null
          id: string
          name: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          name?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      manual_overrides: {
        Row: {
          created_at: string | null
          id: string
          level_id: string | null
          note: string | null
          overridden_by: string | null
          reason: Database["public"]["Enums"]["override_reason"]
          service_id: string | null
          student_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          level_id?: string | null
          note?: string | null
          overridden_by?: string | null
          reason: Database["public"]["Enums"]["override_reason"]
          service_id?: string | null
          student_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          level_id?: string | null
          note?: string | null
          overridden_by?: string | null
          reason?: Database["public"]["Enums"]["override_reason"]
          service_id?: string | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manual_overrides_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_overrides_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "vw_service_level_details"
            referencedColumns: ["level_id"]
          },
          {
            foreignKeyName: "manual_overrides_overridden_by_fkey"
            columns: ["overridden_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_overrides_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_overrides_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "vw_service_level_details"
            referencedColumns: ["service_id"]
          },
          {
            foreignKeyName: "manual_overrides_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "vw_services_with_datetime"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_overrides_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "vw_services_with_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_overrides_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      override_reason_definitions: {
        Row: {
          code: string
          created_at: string | null
          created_by: string | null
          description: string | null
          display_name: string
          id: string
          is_active: boolean | null
          requires_note: boolean | null
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          requires_note?: boolean | null
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          requires_note?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "override_reason_definitions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
        ]
      }
      semesters: {
        Row: {
          created_at: string | null
          end_date: string
          id: string
          name: string
          start_date: string
        }
        Insert: {
          created_at?: string | null
          end_date: string
          id?: string
          name: string
          start_date: string
        }
        Update: {
          created_at?: string | null
          end_date?: string
          id?: string
          name?: string
          start_date?: string
        }
        Relationships: []
      }
      service_levels: {
        Row: {
          created_at: string | null
          id: string
          level_id: string
          service_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          level_id: string
          service_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          level_id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_levels_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_levels_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "vw_service_level_details"
            referencedColumns: ["level_id"]
          },
          {
            foreignKeyName: "service_levels_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_levels_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "vw_service_level_details"
            referencedColumns: ["service_id"]
          },
          {
            foreignKeyName: "service_levels_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "vw_services_with_datetime"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_levels_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "vw_services_with_levels"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          created_at: string | null
          created_by: string | null
          devotion_type: Database["public"]["Enums"]["devotion_type"] | null
          gender_constraint:
            | Database["public"]["Enums"]["gender_constraint"]
            | null
          id: string
          locked_after_ingestion: boolean | null
          name: string | null
          service_date: string
          service_time: string
          service_type: Database["public"]["Enums"]["service_type"]
          status: Database["public"]["Enums"]["service_status"]
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          devotion_type?: Database["public"]["Enums"]["devotion_type"] | null
          gender_constraint?:
            | Database["public"]["Enums"]["gender_constraint"]
            | null
          id?: string
          locked_after_ingestion?: boolean | null
          name?: string | null
          service_date: string
          service_time: string
          service_type: Database["public"]["Enums"]["service_type"]
          status?: Database["public"]["Enums"]["service_status"]
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          devotion_type?: Database["public"]["Enums"]["devotion_type"] | null
          gender_constraint?:
            | Database["public"]["Enums"]["gender_constraint"]
            | null
          id?: string
          locked_after_ingestion?: boolean | null
          name?: string | null
          service_date?: string
          service_time?: string
          service_type?: Database["public"]["Enums"]["service_type"]
          status?: Database["public"]["Enums"]["service_status"]
        }
        Relationships: [
          {
            foreignKeyName: "services_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
        ]
      }
      student_upload_errors: {
        Row: {
          created_at: string | null
          error_message: string
          error_type: string
          id: string
          raw_data: Json | null
          row_number: number
          student_upload_id: string
        }
        Insert: {
          created_at?: string | null
          error_message: string
          error_type: string
          id?: string
          raw_data?: Json | null
          row_number: number
          student_upload_id: string
        }
        Update: {
          created_at?: string | null
          error_message?: string
          error_type?: string
          id?: string
          raw_data?: Json | null
          row_number?: number
          student_upload_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_upload_errors_student_upload_id_fkey"
            columns: ["student_upload_id"]
            isOneToOne: false
            referencedRelation: "student_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      student_uploads: {
        Row: {
          file_hash: string
          id: string
          storage_path: string
          uploaded_at: string | null
          uploaded_by: string
        }
        Insert: {
          file_hash: string
          id?: string
          storage_path: string
          uploaded_at?: string | null
          uploaded_by: string
        }
        Update: {
          file_hash?: string
          id?: string
          storage_path?: string
          uploaded_at?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_uploads_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          created_at: string | null
          department: string | null
          email: string | null
          first_name: string
          full_name: string | null
          gender: string | null
          id: string
          last_name: string
          level_id: string
          matric_number: string
          middle_name: string | null
          parent_email: string | null
          parent_phone: string | null
          status: string | null
          updated_at: string | null
          upload_batch_id: string | null
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          email?: string | null
          first_name: string
          full_name?: string | null
          gender?: string | null
          id?: string
          last_name: string
          level_id: string
          matric_number: string
          middle_name?: string | null
          parent_email?: string | null
          parent_phone?: string | null
          status?: string | null
          updated_at?: string | null
          upload_batch_id?: string | null
        }
        Update: {
          created_at?: string | null
          department?: string | null
          email?: string | null
          first_name?: string
          full_name?: string | null
          gender?: string | null
          id?: string
          last_name?: string
          level_id?: string
          matric_number?: string
          middle_name?: string | null
          parent_email?: string | null
          parent_phone?: string | null
          status?: string | null
          updated_at?: string | null
          upload_batch_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "vw_service_level_details"
            referencedColumns: ["level_id"]
          },
        ]
      }
    }
    Views: {
      vw_recent_admin_actions: {
        Row: {
          action: string | null
          admin_name: string | null
          created_at: string | null
          id: string | null
          object_label: string | null
          object_type: string | null
        }
        Relationships: []
      }
      vw_service_level_details: {
        Row: {
          assigned_at: string | null
          level_code: string | null
          level_id: string | null
          level_name: string | null
          service_date: string | null
          service_id: string | null
          service_name: string | null
          service_time: string | null
          service_type: Database["public"]["Enums"]["service_type"] | null
        }
        Relationships: []
      }
      vw_services_with_datetime: {
        Row: {
          created_at: string | null
          created_by: string | null
          devotion_type: Database["public"]["Enums"]["devotion_type"] | null
          gender_constraint:
            | Database["public"]["Enums"]["gender_constraint"]
            | null
          id: string | null
          locked_after_ingestion: boolean | null
          name: string | null
          service_date: string | null
          service_datetime: string | null
          service_time: string | null
          service_type: Database["public"]["Enums"]["service_type"] | null
          status: Database["public"]["Enums"]["service_status"] | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          devotion_type?: Database["public"]["Enums"]["devotion_type"] | null
          gender_constraint?:
            | Database["public"]["Enums"]["gender_constraint"]
            | null
          id?: string | null
          locked_after_ingestion?: boolean | null
          name?: string | null
          service_date?: string | null
          service_datetime?: never
          service_time?: string | null
          service_type?: Database["public"]["Enums"]["service_type"] | null
          status?: Database["public"]["Enums"]["service_status"] | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          devotion_type?: Database["public"]["Enums"]["devotion_type"] | null
          gender_constraint?:
            | Database["public"]["Enums"]["gender_constraint"]
            | null
          id?: string | null
          locked_after_ingestion?: boolean | null
          name?: string | null
          service_date?: string | null
          service_datetime?: never
          service_time?: string | null
          service_type?: Database["public"]["Enums"]["service_type"] | null
          status?: Database["public"]["Enums"]["service_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "services_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_services_with_levels: {
        Row: {
          created_at: string | null
          created_by: string | null
          devotion_type: Database["public"]["Enums"]["devotion_type"] | null
          gender_constraint:
            | Database["public"]["Enums"]["gender_constraint"]
            | null
          id: string | null
          level_codes: string[] | null
          level_count: number | null
          level_names: string[] | null
          locked_after_ingestion: boolean | null
          name: string | null
          service_date: string | null
          service_time: string | null
          service_type: Database["public"]["Enums"]["service_type"] | null
          status: Database["public"]["Enums"]["service_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "services_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      devotion_type: "morning" | "evening"
      gender_constraint: "male" | "female" | "both"
      override_reason:
        | "late_exeat"
        | "scanning_error"
        | "manual_correction"
        | "permission"
        | "other"
      role_enum: "admin" | "superadmin"
      service_status:
        | "scheduled"
        | "active"
        | "completed"
        | "canceled"
        | "cancelled"
      service_type: "devotion" | "special" | "seminar"
      warning_status: "none" | "pending" | "sent"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      devotion_type: ["morning", "evening"],
      gender_constraint: ["male", "female", "both"],
      override_reason: [
        "late_exeat",
        "scanning_error",
        "manual_correction",
        "permission",
        "other",
      ],
      role_enum: ["admin", "superadmin"],
      service_status: [
        "scheduled",
        "active",
        "completed",
        "canceled",
        "cancelled",
      ],
      service_type: ["devotion", "special", "seminar"],
      warning_status: ["none", "pending", "sent"],
    },
  },
} as const
