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
          depends_on: string[]
          description: string | null
          display_order: number
          is_enabled: boolean
          key: string
          name: string
        }
        Insert: {
          created_at?: string
          depends_on?: string[]
          description?: string | null
          display_order?: number
          is_enabled?: boolean
          key: string
          name: string
        }
        Update: {
          created_at?: string
          depends_on?: string[]
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
      cyber_assessments: {
        Row: {
          analyst_id: string | null
          assessment_type: string
          created_at: string
          created_by: string | null
          customer_id: string
          end_date: string | null
          executive_summary: string | null
          id: string
          methodology: string | null
          name: string
          project_id: string | null
          recommendations: string | null
          scope: string | null
          start_date: string | null
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          analyst_id?: string | null
          assessment_type?: string
          created_at?: string
          created_by?: string | null
          customer_id: string
          end_date?: string | null
          executive_summary?: string | null
          id?: string
          methodology?: string | null
          name: string
          project_id?: string | null
          recommendations?: string | null
          scope?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          analyst_id?: string | null
          assessment_type?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string
          end_date?: string | null
          executive_summary?: string | null
          id?: string
          methodology?: string | null
          name?: string
          project_id?: string | null
          recommendations?: string | null
          scope?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cyber_assessments_analyst_id_fkey"
            columns: ["analyst_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cyber_assessments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cyber_assessments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "cyber_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      cyber_assets: {
        Row: {
          asset_type: string
          created_at: string
          created_by: string | null
          criticality: string
          customer_id: string
          environment: string
          id: string
          name: string
          notes: string | null
          owner: string | null
          project_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          asset_type?: string
          created_at?: string
          created_by?: string | null
          criticality?: string
          customer_id: string
          environment?: string
          id?: string
          name: string
          notes?: string | null
          owner?: string | null
          project_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          asset_type?: string
          created_at?: string
          created_by?: string | null
          criticality?: string
          customer_id?: string
          environment?: string
          id?: string
          name?: string
          notes?: string | null
          owner?: string | null
          project_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cyber_assets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cyber_assets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "cyber_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      cyber_findings: {
        Row: {
          assessment_id: string | null
          asset_id: string | null
          business_impact: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          description: string | null
          due_date: string | null
          evidence_ref: string | null
          finding_code: string
          id: string
          remediation: string | null
          resolution_notes: string | null
          responsible: string | null
          risk_level: string
          status: string
          technical_impact: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          assessment_id?: string | null
          asset_id?: string | null
          business_impact?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          description?: string | null
          due_date?: string | null
          evidence_ref?: string | null
          finding_code?: string
          id?: string
          remediation?: string | null
          resolution_notes?: string | null
          responsible?: string | null
          risk_level?: string
          status?: string
          technical_impact?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          assessment_id?: string | null
          asset_id?: string | null
          business_impact?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          description?: string | null
          due_date?: string | null
          evidence_ref?: string | null
          finding_code?: string
          id?: string
          remediation?: string | null
          resolution_notes?: string | null
          responsible?: string | null
          risk_level?: string
          status?: string
          technical_impact?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cyber_findings_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "cyber_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cyber_findings_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "cyber_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cyber_findings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cyber_incident_events: {
        Row: {
          actor_id: string | null
          created_at: string
          from_status: string | null
          id: string
          incident_id: string
          note: string | null
          to_status: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          incident_id: string
          note?: string | null
          to_status: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          incident_id?: string
          note?: string | null
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "cyber_incident_events_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "cyber_incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      cyber_incidents: {
        Row: {
          actions_taken: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          description: string | null
          detected_at: string | null
          final_report: string | null
          handler_id: string | null
          id: string
          incident_code: string
          incident_type: string
          lessons_learned: string | null
          project_id: string | null
          reported_at: string | null
          severity: string
          status: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          actions_taken?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          description?: string | null
          detected_at?: string | null
          final_report?: string | null
          handler_id?: string | null
          id?: string
          incident_code?: string
          incident_type?: string
          lessons_learned?: string | null
          project_id?: string | null
          reported_at?: string | null
          severity?: string
          status?: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          actions_taken?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          description?: string | null
          detected_at?: string | null
          final_report?: string | null
          handler_id?: string | null
          id?: string
          incident_code?: string
          incident_type?: string
          lessons_learned?: string | null
          project_id?: string | null
          reported_at?: string | null
          severity?: string
          status?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cyber_incidents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cyber_incidents_handler_id_fkey"
            columns: ["handler_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cyber_incidents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "cyber_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      cyber_projects: {
        Row: {
          actual_end: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          deliverables: string | null
          expected_end: string | null
          id: string
          manager_id: string | null
          name: string
          notes: string | null
          objectives: string | null
          priority: string
          progress: number
          project_code: string
          request_id: string | null
          scope: string | null
          service_type: string | null
          start_date: string | null
          status: string
          team: string[]
          updated_at: string
        }
        Insert: {
          actual_end?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          deliverables?: string | null
          expected_end?: string | null
          id?: string
          manager_id?: string | null
          name: string
          notes?: string | null
          objectives?: string | null
          priority?: string
          progress?: number
          project_code: string
          request_id?: string | null
          scope?: string | null
          service_type?: string | null
          start_date?: string | null
          status?: string
          team?: string[]
          updated_at?: string
        }
        Update: {
          actual_end?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          deliverables?: string | null
          expected_end?: string | null
          id?: string
          manager_id?: string | null
          name?: string
          notes?: string | null
          objectives?: string | null
          priority?: string
          progress?: number
          project_code?: string
          request_id?: string | null
          scope?: string | null
          service_type?: string | null
          start_date?: string | null
          status?: string
          team?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cyber_projects_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cyber_projects_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cyber_projects_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "cyber_service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      cyber_report_access: {
        Row: {
          action: string
          created_at: string
          id: string
          report_id: string
          user_id: string | null
        }
        Insert: {
          action?: string
          created_at?: string
          id?: string
          report_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          report_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cyber_report_access_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "cyber_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      cyber_report_versions: {
        Row: {
          created_at: string
          file_name: string | null
          file_path: string
          id: string
          report_id: string
          uploaded_by: string | null
          version: number
        }
        Insert: {
          created_at?: string
          file_name?: string | null
          file_path: string
          id?: string
          report_id: string
          uploaded_by?: string | null
          version: number
        }
        Update: {
          created_at?: string
          file_name?: string | null
          file_path?: string
          id?: string
          report_id?: string
          uploaded_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "cyber_report_versions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "cyber_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      cyber_reports: {
        Row: {
          classification: string
          created_at: string
          created_by: string | null
          customer_id: string
          file_name: string | null
          file_path: string | null
          id: string
          prepared_by: string | null
          project_id: string | null
          report_code: string
          report_date: string | null
          report_type: string
          reviewed_by: string | null
          status: string
          title: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          classification?: string
          created_at?: string
          created_by?: string | null
          customer_id: string
          file_name?: string | null
          file_path?: string | null
          id?: string
          prepared_by?: string | null
          project_id?: string | null
          report_code?: string
          report_date?: string | null
          report_type?: string
          reviewed_by?: string | null
          status?: string
          title: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          classification?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string
          file_name?: string | null
          file_path?: string | null
          id?: string
          prepared_by?: string | null
          project_id?: string | null
          report_code?: string
          report_date?: string | null
          report_type?: string
          reviewed_by?: string | null
          status?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "cyber_reports_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cyber_reports_prepared_by_fkey"
            columns: ["prepared_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cyber_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "cyber_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cyber_reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cyber_request_events: {
        Row: {
          actor_id: string | null
          created_at: string
          from_status: string | null
          id: string
          note: string | null
          request_id: string
          to_status: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          note?: string | null
          request_id: string
          to_status: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          note?: string | null
          request_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "cyber_request_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "cyber_service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      cyber_risks: {
        Row: {
          asset_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          impact: number
          likelihood: number
          mitigation: string | null
          owner: string | null
          project_id: string | null
          risk_code: string
          risk_level: string | null
          status: string
          target_date: string | null
          threat: string | null
          title: string
          treatment: string
          updated_at: string
          updated_by: string | null
          vulnerability: string | null
        }
        Insert: {
          asset_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          impact?: number
          likelihood?: number
          mitigation?: string | null
          owner?: string | null
          project_id?: string | null
          risk_code?: string
          risk_level?: string | null
          status?: string
          target_date?: string | null
          threat?: string | null
          title: string
          treatment?: string
          updated_at?: string
          updated_by?: string | null
          vulnerability?: string | null
        }
        Update: {
          asset_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          impact?: number
          likelihood?: number
          mitigation?: string | null
          owner?: string | null
          project_id?: string | null
          risk_code?: string
          risk_level?: string | null
          status?: string
          target_date?: string | null
          threat?: string | null
          title?: string
          treatment?: string
          updated_at?: string
          updated_by?: string | null
          vulnerability?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cyber_risks_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "cyber_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cyber_risks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cyber_risks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "cyber_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      cyber_service_categories: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          name: string
          slug: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          slug: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      cyber_service_packages: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          display_order: number
          id: string
          includes: Json
          is_active: boolean
          is_featured: boolean
          name: string
          price: number | null
          pricing_model: string
          slug: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          display_order?: number
          id?: string
          includes?: Json
          is_active?: boolean
          is_featured?: boolean
          name: string
          price?: number | null
          pricing_model?: string
          slug: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          display_order?: number
          id?: string
          includes?: Json
          is_active?: boolean
          is_featured?: boolean
          name?: string
          price?: number | null
          pricing_model?: string
          slug?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      cyber_service_requests: {
        Row: {
          additional_info: string | null
          application_name: string | null
          asset_count: number | null
          assigned_to: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          customer_name: string
          description: string
          domain_name: string | null
          email: string
          id: string
          internal_notes: string | null
          item_name: string
          organization: string | null
          organization_type: string
          package_id: string | null
          phone: string | null
          preferred_date: string | null
          preferred_method: string
          priority: string
          request_code: string
          security_concern: string
          service_id: string | null
          status: string
          updated_at: string
          updated_by: string | null
          website_url: string | null
        }
        Insert: {
          additional_info?: string | null
          application_name?: string | null
          asset_count?: number | null
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          customer_name: string
          description: string
          domain_name?: string | null
          email: string
          id?: string
          internal_notes?: string | null
          item_name: string
          organization?: string | null
          organization_type?: string
          package_id?: string | null
          phone?: string | null
          preferred_date?: string | null
          preferred_method?: string
          priority?: string
          request_code: string
          security_concern: string
          service_id?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          website_url?: string | null
        }
        Update: {
          additional_info?: string | null
          application_name?: string | null
          asset_count?: number | null
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          customer_name?: string
          description?: string
          domain_name?: string | null
          email?: string
          id?: string
          internal_notes?: string | null
          item_name?: string
          organization?: string | null
          organization_type?: string
          package_id?: string | null
          phone?: string | null
          preferred_date?: string | null
          preferred_method?: string
          priority?: string
          request_code?: string
          security_concern?: string
          service_id?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cyber_service_requests_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cyber_service_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cyber_service_requests_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "cyber_service_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cyber_service_requests_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "cyber_services"
            referencedColumns: ["id"]
          },
        ]
      }
      cyber_services: {
        Row: {
          category_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          deliverables: Json
          delivery_method: string
          display_order: number
          estimated_duration: string | null
          features: Json
          full_description: string
          icon: string
          id: string
          image_url: string | null
          is_featured: boolean
          is_public: boolean
          meta_description: string | null
          name: string
          price: number | null
          pricing_model: string
          seo_title: string | null
          short_description: string
          show_price: boolean
          slug: string
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deliverables?: Json
          delivery_method?: string
          display_order?: number
          estimated_duration?: string | null
          features?: Json
          full_description?: string
          icon?: string
          id?: string
          image_url?: string | null
          is_featured?: boolean
          is_public?: boolean
          meta_description?: string | null
          name: string
          price?: number | null
          pricing_model?: string
          seo_title?: string | null
          short_description?: string
          show_price?: boolean
          slug: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deliverables?: Json
          delivery_method?: string
          display_order?: number
          estimated_duration?: string | null
          features?: Json
          full_description?: string
          icon?: string
          id?: string
          image_url?: string | null
          is_featured?: boolean
          is_public?: boolean
          meta_description?: string | null
          name?: string
          price?: number | null
          pricing_model?: string
          seo_title?: string | null
          short_description?: string
          show_price?: boolean
          slug?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cyber_services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "cyber_service_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      cyber_trainings: {
        Row: {
          audience: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          delivery_method: string
          description: string | null
          files: Json
          id: string
          location: string | null
          materials: string | null
          participants: number | null
          status: string
          title: string
          trainer: string | null
          training_date: string | null
          training_type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          audience?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          delivery_method?: string
          description?: string | null
          files?: Json
          id?: string
          location?: string | null
          materials?: string | null
          participants?: number | null
          status?: string
          title: string
          trainer?: string | null
          training_date?: string | null
          training_type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          audience?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          delivery_method?: string
          description?: string | null
          files?: Json
          id?: string
          location?: string | null
          materials?: string | null
          participants?: number | null
          status?: string
          title?: string
          trainer?: string | null
          training_date?: string | null
          training_type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cyber_trainings_customer_id_fkey"
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
          account_status: string
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
          is_verified: boolean
          job_title: string | null
          last_sign_in_at: string | null
          phone: string | null
          preferred_currency: string
          primary_role: string | null
          status_reason: string | null
          suspended_at: string | null
          updated_at: string | null
          username: string | null
          verified_at: string | null
          whatsapp: string | null
        }
        Insert: {
          account_status?: string
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
          is_verified?: boolean
          job_title?: string | null
          last_sign_in_at?: string | null
          phone?: string | null
          preferred_currency?: string
          primary_role?: string | null
          status_reason?: string | null
          suspended_at?: string | null
          updated_at?: string | null
          username?: string | null
          verified_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          account_status?: string
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
          is_verified?: boolean
          job_title?: string | null
          last_sign_in_at?: string | null
          phone?: string | null
          preferred_currency?: string
          primary_role?: string | null
          status_reason?: string | null
          suspended_at?: string | null
          updated_at?: string | null
          username?: string | null
          verified_at?: string | null
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
      request_files: {
        Row: {
          created_at: string
          id: string
          mime_type: string | null
          name: string
          note: string | null
          path: string
          request_id: string
          sender_id: string
          size_bytes: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          mime_type?: string | null
          name: string
          note?: string | null
          path: string
          request_id: string
          sender_id?: string
          size_bytes?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          mime_type?: string | null
          name?: string
          note?: string | null
          path?: string
          request_id?: string
          sender_id?: string
          size_bytes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "request_files_request_id_fkey"
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
          scope: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission_key: string
          role: string
          scope?: string
        }
        Update: {
          created_at?: string
          id?: string
          permission_key?: string
          role?: string
          scope?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "role_permissions_role_fk"
            columns: ["role"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["key"]
          },
        ]
      }
      roles: {
        Row: {
          audience: string
          created_at: string
          description: string | null
          is_active: boolean
          is_protected: boolean
          key: string
          name: string
          role_type: string
        }
        Insert: {
          audience?: string
          created_at?: string
          description?: string | null
          is_active?: boolean
          is_protected?: boolean
          key: string
          name: string
          role_type?: string
        }
        Update: {
          audience?: string
          created_at?: string
          description?: string | null
          is_active?: boolean
          is_protected?: boolean
          key?: string
          name?: string
          role_type?: string
        }
        Relationships: []
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
          gallery: Json
          id: string
          image_url: string | null
          is_active: boolean | null
          is_available: boolean
          is_featured: boolean
          price_tzs: number | null
          requirements: string | null
          short_description: string
          slug: string
          starting_price: number
          terms: string | null
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
          gallery?: Json
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_available?: boolean
          is_featured?: boolean
          price_tzs?: number | null
          requirements?: string | null
          short_description: string
          slug: string
          starting_price: number
          terms?: string | null
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
          gallery?: Json
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_available?: boolean
          is_featured?: boolean
          price_tzs?: number | null
          requirements?: string | null
          short_description?: string
          slug?: string
          starting_price?: number
          terms?: string | null
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
      user_custom_roles: {
        Row: {
          created_at: string
          id: string
          role_key: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role_key: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_custom_roles_role_key_fkey"
            columns: ["role_key"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "user_custom_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_devices: {
        Row: {
          device_key: string
          first_seen: string
          id: string
          label: string
          last_seen: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          device_key: string
          first_seen?: string
          id?: string
          label: string
          last_seen?: string
          user_agent?: string | null
          user_id?: string
        }
        Update: {
          device_key?: string
          first_seen?: string
          id?: string
          label?: string
          last_seen?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_permission_grants: {
        Row: {
          created_at: string
          ends_at: string
          granted_by: string | null
          id: string
          permission_key: string
          reason: string
          revoked_at: string | null
          revoked_by: string | null
          scope: string
          starts_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          granted_by?: string | null
          id?: string
          permission_key: string
          reason: string
          revoked_at?: string | null
          revoked_by?: string | null
          scope?: string
          starts_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          granted_by?: string | null
          id?: string
          permission_key?: string
          reason?: string
          revoked_at?: string | null
          revoked_by?: string | null
          scope?: string
          starts_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permission_grants_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "user_permission_grants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      admin_list_sessions: {
        Args: never
        Returns: {
          created_at: string
          id: string
          ip: string
          not_after: string
          refreshed_at: string
          updated_at: string
          user_agent: string
          user_id: string
        }[]
      }
      admin_revoke_sessions: {
        Args: { _session_id?: string; _user_id?: string }
        Returns: number
      }
      can_access_request: { Args: { _req: string }; Returns: boolean }
      can_read_cyber_report: { Args: { _id: string }; Returns: boolean }
      effective_permissions: {
        Args: { _user_id: string }
        Returns: {
          permission_key: string
          scope: string
        }[]
      }
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
      log_report_access: {
        Args: { _action: string; _report: string }
        Returns: undefined
      }
      my_permissions: { Args: never; Returns: string[] }
      permission_scope: {
        Args: { _perm: string; _user_id: string }
        Returns: string
      }
      preview_user_permissions: {
        Args: { _user_id: string }
        Returns: {
          permission_key: string
          scope: string
        }[]
      }
      scope_allows: {
        Args: {
          _assignee: string
          _owner: string
          _perm: string
          _user_id: string
        }
        Returns: boolean
      }
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
