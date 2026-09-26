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
      app_modules: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          is_enabled: boolean
          key: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          is_enabled?: boolean
          key: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          is_enabled?: boolean
          key?: string
          name?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json | null
          id: string
          record_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          record_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          record_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          address: string | null
          business_hours: string | null
          company_name: string
          email: string | null
          facebook_url: string | null
          id: number
          instagram_url: string | null
          legal_name: string | null
          linkedin_url: string | null
          logo_url: string | null
          phone: string | null
          short_description: string | null
          tagline: string
          tax_number: string | null
          updated_at: string
          usd_eur_rate: number
          usd_tzs_rate: number
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          business_hours?: string | null
          company_name?: string
          email?: string | null
          facebook_url?: string | null
          id?: number
          instagram_url?: string | null
          legal_name?: string | null
          linkedin_url?: string | null
          logo_url?: string | null
          phone?: string | null
          short_description?: string | null
          tagline?: string
          tax_number?: string | null
          updated_at?: string
          usd_eur_rate?: number
          usd_tzs_rate?: number
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          business_hours?: string | null
          company_name?: string
          email?: string | null
          facebook_url?: string | null
          id?: number
          instagram_url?: string | null
          legal_name?: string | null
          linkedin_url?: string | null
          logo_url?: string | null
          phone?: string | null
          short_description?: string | null
          tagline?: string
          tax_number?: string | null
          updated_at?: string
          usd_eur_rate?: number
          usd_tzs_rate?: number
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      consultations: {
        Row: {
          created_at: string | null
          customer_id: string
          id: string
          meeting_link: string | null
          notes: string | null
          preferred_date: string
          preferred_time: string
          status: string
          topic: string
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          id?: string
          meeting_link?: string | null
          notes?: string | null
          preferred_date: string
          preferred_time: string
          status?: string
          topic: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          id?: string
          meeting_link?: string | null
          notes?: string | null
          preferred_date?: string
          preferred_time?: string
          status?: string
          topic?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          created_at: string
          folder: string
          id: string
          mime_type: string | null
          name: string
          path: string
          size_bytes: number | null
          uploaded_by: string | null
          url: string
        }
        Insert: {
          created_at?: string
          folder?: string
          id?: string
          mime_type?: string | null
          name: string
          path: string
          size_bytes?: number | null
          uploaded_by?: string | null
          url: string
        }
        Update: {
          created_at?: string
          folder?: string
          id?: string
          mime_type?: string | null
          name?: string
          path?: string
          size_bytes?: number | null
          uploaded_by?: string | null
          url?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          action: string
          created_at: string
          description: string | null
          is_sensitive: boolean
          key: string
          module_key: string
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          is_sensitive?: boolean
          key: string
          module_key: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          is_sensitive?: boolean
          key?: string
          module_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "permissions_module_key_fkey"
            columns: ["module_key"]
            isOneToOne: false
            referencedRelation: "app_modules"
            referencedColumns: ["key"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          city: string | null
          company_name: string | null
          country: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          is_suspended: boolean
          job_title: string | null
          phone: string | null
          preferred_currency: string
          suspended_at: string | null
          updated_at: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id: string
          is_suspended?: boolean
          job_title?: string | null
          phone?: string | null
          preferred_currency?: string
          suspended_at?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          is_suspended?: boolean
          job_title?: string | null
          phone?: string | null
          preferred_currency?: string
          suspended_at?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          progress: number
          quotation_id: string | null
          request_id: string | null
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          progress?: number
          quotation_id?: string | null
          request_id?: string | null
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          progress?: number
          quotation_id?: string | null
          request_id?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: true
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          amount_usd: number
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          notes: string | null
          request_id: string
          status: string
        }
        Insert: {
          amount_usd: number
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          notes?: string | null
          request_id: string
          status?: string
        }
        Update: {
          amount_usd?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          notes?: string | null
          request_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission_key: string
          role: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission_key: string
          role: string
        }
        Update: {
          created_at?: string
          id?: string
          permission_key?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["key"]
          },
        ]
      }
      service_categories: {
        Row: {
          description: string | null
          display_order: number | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          description?: string | null
          display_order?: number | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          description?: string | null
          display_order?: number | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      service_requests: {
        Row: {
          assigned_technician_id: string | null
          created_at: string | null
          currency: string | null
          customer_id: string
          description: string
          estimated_budget: number | null
          id: string
          service_id: string | null
          status: Database["public"]["Enums"]["request_status"]
          title: string
          tracking_code: string
          updated_at: string | null
          urgency: string
        }
        Insert: {
          assigned_technician_id?: string | null
          created_at?: string | null
          currency?: string | null
          customer_id: string
          description: string
          estimated_budget?: number | null
          id?: string
          service_id?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          title: string
          tracking_code?: string
          updated_at?: string | null
          urgency?: string
        }
        Update: {
          assigned_technician_id?: string | null
          created_at?: string | null
          currency?: string | null
          customer_id?: string
          description?: string
          estimated_budget?: number | null
          id?: string
          service_id?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          title?: string
          tracking_code?: string
          updated_at?: string | null
          urgency?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_requests_assigned_technician_id_fkey"
            columns: ["assigned_technician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          billing_type: string
          category_id: string | null
          created_at: string | null
          currency: string | null
          display_order: number | null
          features: Json | null
          full_description: string
          id: string
          image_url: string | null
          is_active: boolean | null
          price_tzs: number | null
          short_description: string
          slug: string
          starting_price: number
          title: string
        }
        Insert: {
          billing_type: string
          category_id?: string | null
          created_at?: string | null
          currency?: string | null
          display_order?: number | null
          features?: Json | null
          full_description: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          price_tzs?: number | null
          short_description: string
          slug: string
          starting_price: number
          title: string
        }
        Update: {
          billing_type?: string
          category_id?: string | null
          created_at?: string | null
          currency?: string | null
          display_order?: number | null
          features?: Json | null
          full_description?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          price_tzs?: number | null
          short_description?: string
          slug?: string
          starting_price?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          status: string
          subject: string
        }
        Insert: {
          created_at?: string
          customer_id?: string
          id?: string
          status?: string
          subject: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          status?: string
          subject?: string
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          sender_id: string
          ticket_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          sender_id?: string
          ticket_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          sender_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_tracking_code: { Args: never; Returns: string }
      has_permission: {
        Args: { _perm: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      my_permissions: { Args: never; Returns: string[] }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "admin"
        | "operator"
        | "technician"
        | "customer"
        | "operations_manager"
        | "sales"
        | "consultant"
        | "support"
        | "finance"
        | "content_manager"
      request_status:
        | "pending"
        | "reviewing"
        | "quoted"
        | "in_progress"
        | "completed"
        | "cancelled"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: [
        "super_admin",
        "admin",
        "operator",
        "technician",
        "customer",
        "operations_manager",
        "sales",
        "consultant",
        "support",
        "finance",
        "content_manager",
      ],
      request_status: [
        "pending",
        "reviewing",
        "quoted",
        "in_progress",
        "completed",
        "cancelled",
      ],
    },
  },
} as const
