import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
})

// Database types for type safety
export interface Database {
  public: {
    Tables: {
      admins: {
        Row: {
          id: string
          auth_user_id: string | null
          first_name: string
          last_name: string
          email: string
          role: 'admin' | 'superadmin'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          auth_user_id?: string | null
          first_name: string
          last_name: string
          email: string
          role: 'admin' | 'superadmin'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          auth_user_id?: string | null
          first_name?: string
          last_name?: string
          email?: string
          role?: 'admin' | 'superadmin'
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
