// ============================================================
// ChargeQ — Supabase Database Types
// ============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          phone: string
          name: string
          since: string
          sessions: number
          created_at: string
        }
        Insert: {
          id: string
          phone: string
          name: string
          since?: string
          sessions?: number
        }
        Update: {
          name?: string
          phone?: string
          since?: string
          sessions?: number
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          id: string
          user_id: string
          plate: string
          nick: string
          charger: string
          port_side: string | null
          is_default: boolean
          created_at: string
        }
        Insert: {
          user_id: string
          plate: string
          nick: string
          charger: string
          port_side?: string | null
          is_default?: boolean
        }
        Update: {
          plate?: string
          nick?: string
          charger?: string
          port_side?: string | null
          is_default?: boolean
        }
        Relationships: []
      }
      queue_entries: {
        Row: {
          id: string
          site_id: string
          site_name: string
          user_id: string | null
          name: string
          phone: string
          plate: string
          charger: string
          port_side: string | null
          bay_num: number | null
          position: number
          estimated_wait_mins: number
          status: string
          is_remote: boolean
          joined_at: string
          updated_at: string
        }
        Insert: {
          site_id: string
          site_name: string
          name: string
          phone: string
          plate: string
          charger: string
          port_side?: string | null
          bay_num?: number | null
          position?: number
          estimated_wait_mins?: number
          status?: string
          is_remote?: boolean
          user_id?: string | null
        }
        Update: {
          status?: string
          bay_num?: number | null
          position?: number
          estimated_wait_mins?: number
        }
        Relationships: []
      }
      bays: {
        Row: {
          id: string
          site_id: string
          num: number
          type: string
          status: string
          plate: string | null
          fault_type: string | null
          updated_at: string
        }
        Insert: {
          site_id: string
          num: number
          type: string
          status?: string
          plate?: string | null
        }
        Update: {
          status?: string
          plate?: string | null
          fault_type?: string | null
        }
        Relationships: []
      }
      sites: {
        Row: {
          id: string
          name: string
          address: string | null
          lat: number | null
          lng: number | null
          active: boolean
          created_at: string
        }
        Insert: {
          name: string
          address?: string | null
          lat?: number | null
          lng?: number | null
          active?: boolean
        }
        Update: {
          name?: string
          address?: string | null
          active?: boolean
        }
        Relationships: []
      }
      fault_reports: {
        Row: {
          id: string
          site_id: string
          bay_num: number | null
          fault_type: string
          description: string | null
          photo_url: string | null
          reported_by: string | null
          resolved: boolean
          reported_at: string
        }
        Insert: {
          site_id: string
          bay_num?: number | null
          fault_type: string
          description?: string | null
          photo_url?: string | null
          reported_by?: string | null
        }
        Update: {
          resolved?: boolean
        }
        Relationships: []
      }
      bay_taken_incidents: {
        Row: {
          id: string
          site_id: string
          assigned_bay: number
          offender_plate: string | null
          notes: string | null
          reported_by: string | null
          reported_at: string
        }
        Insert: {
          site_id: string
          assigned_bay: number
          offender_plate?: string | null
          notes?: string | null
          reported_by?: string | null
        }
        Update: {
          resolved?: boolean
        }
        Relationships: []
      }
      location_flags: {
        Row: {
          id: string
          station_name: string
          reason: string
          notes: string | null
          lat: number | null
          lng: number | null
          reported_by: string | null
          actioned: boolean
          reported_at: string
        }
        Insert: {
          station_name: string
          reason: string
          notes?: string | null
          lat?: number | null
          lng?: number | null
          reported_by?: string | null
        }
        Update: {
          actioned?: boolean
        }
        Relationships: []
      }
      feedback: {
        Row: {
          id: string
          rating: number
          message: string | null
          site_key: string | null
          user_id: string | null
          submitted_at: string
        }
        Insert: {
          rating: number
          message?: string | null
          site_key?: string | null
          user_id?: string | null
        }
        Update: {
          rating?: number
        }
        Relationships: []
      }
      site_managers: {
        Row: {
          id: string
          name: string
          email: string
          mobile: string | null
          job_title: string | null
          company: string | null
          abn: string | null
          sites: string[]
          pin_hash: string | null
          status: string
          created_at: string
          approved_at: string | null
        }
        Insert: {
          name: string
          email: string
          mobile?: string | null
          job_title?: string | null
          company?: string | null
          abn?: string | null
          sites?: string[]
          status?: string
        }
        Update: {
          status?: string
          pin_hash?: string | null
          approved_at?: string | null
        }
        Relationships: []
      }
      app_visitors: {
        Row: {
          id: string
          full_name: string
          email: string
          phone: string | null
          registered_at: string
          user_agent: string | null
        }
        Insert: {
          full_name: string
          email: string
          phone?: string | null
          user_agent?: string | null
        }
        Update: {
          full_name?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          pin_hash: string | null
        }
        Insert: {
          key: string
          pin_hash?: string | null
        }
        Update: {
          pin_hash?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      join_queue: {
        Args: {
          p_site_id: string
          p_site_name: string
          p_name: string
          p_phone: string
          p_plate: string
          p_charger: string
          p_port_side?: string | null
          p_is_remote?: boolean
          p_user_id?: string | null
        }
        Returns: Json
      }
      leave_queue: {
        Args: { p_entry_id: string }
        Returns: boolean
      }
      get_site_queue_stats: {
        Args: { p_site_id: string }
        Returns: { queue_count: number; wait_mins: number }
      }
      set_bay_status: {
        Args: {
          p_site_id: string
          p_bay_num: number
          p_status: string
          p_plate?: string | null
        }
        Returns: boolean
      }
      admin_mark_bay_ready: {
        Args: {
          p_site_id: string
          p_entry_id: string
        }
        Returns: boolean
      }
      verify_admin_pin: {
        Args: { attempt: string }
        Returns: boolean
      }
      verify_site_manager_pin: {
        Args: { manager_email: string; attempt: string }
        Returns: Json
      }
      verify_site_manager_pin_change: {
        Args: { manager_email: string; old_attempt: string; new_pin: string }
        Returns: Json
      }
      check_site_manager_email: {
        Args: { manager_email: string }
        Returns: string
      }
      register_with_provisional_pin: {
        Args: {
          p_name: string
          p_email: string
          p_mobile: string
          p_job_title: string
          p_company: string
          p_abn: string
          p_sites: string[]
          p_provisional_pin: string
        }
        Returns: Json
      }
      sa_get_all_managers: {
        Args: { sa_pin: string }
        Returns: Json
      }
      sa_approve_manager: {
        Args: { sa_pin: string; manager_id: string; initial_pin: string }
        Returns: boolean
      }
      sa_suspend_manager: {
        Args: { sa_pin: string; manager_id: string }
        Returns: boolean
      }
      get_vehicle_by_plate: {
        Args: { p_plate: string }
        Returns: Json
      }
      lookup_plate: {
        Args: { p_plate: string }
        Returns: Json
      }
      update_manager_pin: {
        Args: { manager_email: string; old_attempt: string; new_pin: string }
        Returns: Json
      }
      sa_reactivate_manager: {
        Args: { sa_pin: string; manager_id: string; initial_pin: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
