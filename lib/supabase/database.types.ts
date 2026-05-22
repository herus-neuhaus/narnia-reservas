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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      blacklist: {
        Row: {
          blocked_by: string | null
          cpf: string
          cpf_digits: string | null
          created_at: string | null
          end_date: string
          id: string
          name: string
          reason: string | null
          start_date: string | null
        }
        Insert: {
          blocked_by?: string | null
          cpf: string
          cpf_digits?: string | null
          created_at?: string | null
          end_date: string
          id?: string
          name: string
          reason?: string | null
          start_date?: string | null
        }
        Update: {
          blocked_by?: string | null
          cpf?: string
          cpf_digits?: string | null
          created_at?: string | null
          end_date?: string
          id?: string
          name?: string
          reason?: string | null
          start_date?: string | null
        }
        Relationships: []
      }
      box_office_reports: {
        Row: {
          closed_at: string
          closed_by: string
          event_date: string
          id: string
          snapshot_data: Json
          total_bracelets_sold: number
          total_complimentary: number
          total_revenue: number
        }
        Insert: {
          closed_at?: string
          closed_by: string
          event_date: string
          id?: string
          snapshot_data: Json
          total_bracelets_sold: number
          total_complimentary: number
          total_revenue: number
        }
        Update: {
          closed_at?: string
          closed_by?: string
          event_date?: string
          id?: string
          snapshot_data?: Json
          total_bracelets_sold?: number
          total_complimentary?: number
          total_revenue?: number
        }
        Relationships: [
          {
            foreignKeyName: "box_office_reports_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      camarote_entries: {
        Row: {
          authorized_by: string | null
          camarote_id: string
          customer_id: string
          entered_at: string
          id: string
          is_extra: boolean
        }
        Insert: {
          authorized_by?: string | null
          camarote_id: string
          customer_id: string
          entered_at?: string
          id?: string
          is_extra?: boolean
        }
        Update: {
          authorized_by?: string | null
          camarote_id?: string
          customer_id?: string
          entered_at?: string
          id?: string
          is_extra?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "camarote_entries_authorized_by_fkey"
            columns: ["authorized_by"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camarote_entries_camarote_id_fkey"
            columns: ["camarote_id"]
            isOneToOne: false
            referencedRelation: "camarotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camarote_entries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      camarotes: {
        Row: {
          capacity: number
          created_at: string
          event_date: string
          id: string
          name: string
          owner_customer_id: string | null
        }
        Insert: {
          capacity?: number
          created_at?: string
          event_date: string
          id?: string
          name: string
          owner_customer_id?: string | null
        }
        Update: {
          capacity?: number
          created_at?: string
          event_date?: string
          id?: string
          name?: string
          owner_customer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "camarotes_owner_customer_id_fkey"
            columns: ["owner_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      complimentary_tickets: {
        Row: {
          approved_by: string | null
          created_at: string
          customer_id: string
          event_date: string
          event_id: string | null
          id: string
          notes: string | null
          requested_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          customer_id: string
          event_date: string
          event_id?: string | null
          id?: string
          notes?: string | null
          requested_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          customer_id?: string
          event_date?: string
          event_id?: string | null
          id?: string
          notes?: string | null
          requested_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "complimentary_tickets_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complimentary_tickets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complimentary_tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complimentary_tickets_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          birth_date: string | null
          cpf: string | null
          cpf_digits: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          photo: string | null
          whatsapp: string
        }
        Insert: {
          birth_date?: string | null
          cpf?: string | null
          cpf_digits?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          photo?: string | null
          whatsapp: string
        }
        Update: {
          birth_date?: string | null
          cpf?: string | null
          cpf_digits?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          photo?: string | null
          whatsapp?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          available_camarotes: string[] | null
          banner_url: string | null
          created_at: string
          description: string | null
          event_date: string
          id: string
          image_url: string
          list_limit_capacity: number | null
          list_limit_time: string | null
          name: string
          start_time: string | null
          visible_from: string | null
        }
        Insert: {
          available_camarotes?: string[] | null
          banner_url?: string | null
          created_at?: string
          description?: string | null
          event_date: string
          id?: string
          image_url: string
          list_limit_capacity?: number | null
          list_limit_time?: string | null
          name: string
          start_time?: string | null
          visible_from?: string | null
        }
        Update: {
          available_camarotes?: string[] | null
          banner_url?: string | null
          created_at?: string
          description?: string | null
          event_date?: string
          id?: string
          image_url?: string
          list_limit_capacity?: number | null
          list_limit_time?: string | null
          name?: string
          start_time?: string | null
          visible_from?: string | null
        }
        Relationships: []
      }
      reservations: {
        Row: {
          birth_date: string | null
          check_in_status: string | null
          cpf: string | null
          created_at: string
          customer_id: string | null
          email: string
          entered_at: string | null
          expires_at: string | null
          id: string
          location_id: string | null
          name: string
          notes: string | null
          num_guests: number
          payment_amount: number | null
          payment_status: string | null
          photo: string | null
          reservation_date: string
          reservation_time: string
          status: string | null
          type: string | null
          updated_at: string | null
          whatsapp: string
        }
        Insert: {
          birth_date?: string | null
          check_in_status?: string | null
          cpf?: string | null
          created_at?: string
          customer_id?: string | null
          email: string
          entered_at?: string | null
          expires_at?: string | null
          id?: string
          location_id?: string | null
          name: string
          notes?: string | null
          num_guests: number
          payment_amount?: number | null
          payment_status?: string | null
          photo?: string | null
          reservation_date: string
          reservation_time: string
          status?: string | null
          type?: string | null
          updated_at?: string | null
          whatsapp: string
        }
        Update: {
          birth_date?: string | null
          check_in_status?: string | null
          cpf?: string | null
          created_at?: string
          customer_id?: string | null
          email?: string
          entered_at?: string | null
          expires_at?: string | null
          id?: string
          location_id?: string | null
          name?: string
          notes?: string | null
          num_guests?: number
          payment_amount?: number | null
          payment_status?: string | null
          photo?: string | null
          reservation_date?: string
          reservation_time?: string
          status?: string | null
          type?: string | null
          updated_at?: string | null
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          role: Database["public"]["Enums"]["user_role"]
          status: Database["public"]["Enums"]["invite_status"]
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["invite_status"]
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["invite_status"]
        }
        Relationships: []
      }
      ticket_batches: {
        Row: {
          consumed_quantity: number
          created_at: string
          event_date: string
          event_id: string | null
          id: string
          name: string
          price: number
          status: string
          batch_order: number
          total_quantity: number
        }
        Insert: {
          consumed_quantity?: number
          created_at?: string
          event_date: string
          event_id?: string | null
          id?: string
          name: string
          price: number
          status?: string
          batch_order?: number
          total_quantity: number
        }
        Update: {
          consumed_quantity?: number
          created_at?: string
          event_date?: string
          event_id?: string | null
          id?: string
          name?: string
          price?: number
          status?: string
          batch_order?: number
          total_quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "ticket_batches_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          content: string
          created_at: string | null
          id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_complimentary_ticket: {
        Args: { p_approved_by: string; p_status: string; p_ticket_id: string }
        Returns: undefined
      }
      close_box_office: {
        Args: { p_closed_by: string; p_event_date: string }
        Returns: string
      }
      consume_bracelet: { Args: { p_event_date: string }; Returns: string }
      create_reservation_v2: {
        Args: {
          p_birth_date: string
          p_cpf: string
          p_date: string
          p_email: string
          p_expires_at: string
          p_guests: number
          p_location_id: string
          p_name: string
          p_notes: string
          p_time: string
          p_type: string
          p_whatsapp: string
        }
        Returns: Json
      }
      get_customer_by_cpf: {
        Args: { p_cpf: string }
        Returns: {
          birth_date: string
          email: string
          name: string
          photo: string
          whatsapp: string
        }[]
      }
      get_customer_reservations: {
        Args: { phone_param: string }
        Returns: {
          birth_date: string | null
          check_in_status: string | null
          cpf: string | null
          created_at: string
          customer_id: string | null
          email: string
          entered_at: string | null
          expires_at: string | null
          id: string
          location_id: string | null
          name: string
          notes: string | null
          num_guests: number
          payment_amount: number | null
          payment_status: string | null
          photo: string | null
          reservation_date: string
          reservation_time: string
          status: string | null
          type: string | null
          updated_at: string | null
          whatsapp: string
        }[]
        SetofOptions: {
          from: "*"
          to: "reservations"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_fully_booked_dates: {
        Args: never
        Returns: {
          reservation_date: string
        }[]
      }
      get_reservations_by_cpf: {
        Args: { p_cpf: string }
        Returns: {
          birth_date: string
          cpf: string
          customer_id: string
          email: string
          id: string
          location_id: string
          name: string
          notes: string
          num_guests: number
          payment_amount: number
          payment_status: string
          photo: string
          reservation_date: string
          reservation_time: string
          status: string
          type: string
          whatsapp: string
        }[]
      }
      get_reserved_locations:
        | {
            Args: { p_date: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.get_reserved_locations(p_date => text), public.get_reserved_locations(p_date => date). Try renaming the parameters or the function itself in the database so function overloading can be resolved"[]
          }
        | {
            Args: { p_date: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.get_reserved_locations(p_date => text), public.get_reserved_locations(p_date => date). Try renaming the parameters or the function itself in the database so function overloading can be resolved"[]
          }
      register_camarote_entry: {
        Args: { p_camarote_id: string; p_customer_id: string }
        Returns: undefined
      }
      register_extra_camarote_entry: {
        Args: {
          p_authorized_by: string
          p_camarote_id: string
          p_customer_id: string
        }
        Returns: undefined
      }
      release_expired_reservations: { Args: never; Returns: undefined }
    }
    Enums: {
      invite_status: "active" | "pending_invite"
      user_role: "admin" | "receptionist"
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
      invite_status: ["active", "pending_invite"],
      user_role: ["admin", "receptionist"],
    },
  },
} as const

