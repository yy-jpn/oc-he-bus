export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          name: string;
          employee_count: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          employee_count?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          employee_count?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          company_id: string | null;
          email: string;
          name: string;
          role: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id?: string | null;
          email: string;
          name: string;
          role: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string | null;
          email?: string;
          name?: string;
          role?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "users_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      employees: {
        Row: {
          id: string;
          company_id: string | null;
          user_id: string | null;
          name: string;
          department: string | null;
          position: string | null;
          manager_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id?: string | null;
          user_id?: string | null;
          name: string;
          department?: string | null;
          position?: string | null;
          manager_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string | null;
          user_id?: string | null;
          name?: string;
          department?: string | null;
          position?: string | null;
          manager_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "employees_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "employees_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "employees_manager_id_fkey";
            columns: ["manager_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      cases: {
        Row: {
          id: string;
          company_id: string | null;
          employee_id: string | null;
          current_phase: string;
          trigger_type: string | null;
          trigger_detail: string | null;
          detected_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id?: string | null;
          employee_id?: string | null;
          current_phase: string;
          trigger_type?: string | null;
          trigger_detail?: string | null;
          detected_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string | null;
          employee_id?: string | null;
          current_phase?: string;
          trigger_type?: string | null;
          trigger_detail?: string | null;
          detected_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cases_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cases_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: false;
            referencedRelation: "employees";
            referencedColumns: ["id"];
          },
        ];
      };
      interviews: {
        Row: {
          id: string;
          case_id: string | null;
          conducted_at: string;
          conducted_by: string | null;
          outcome: string | null;
          summary: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          case_id?: string | null;
          conducted_at: string;
          conducted_by?: string | null;
          outcome?: string | null;
          summary?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          case_id?: string | null;
          conducted_at?: string;
          conducted_by?: string | null;
          outcome?: string | null;
          summary?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "interviews_case_id_fkey";
            columns: ["case_id"];
            isOneToOne: false;
            referencedRelation: "cases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "interviews_conducted_by_fkey";
            columns: ["conducted_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      leaves: {
        Row: {
          id: string;
          case_id: string | null;
          start_date: string;
          end_date: string | null;
          diagnosis_received: boolean;
          contact_frequency: string | null;
          contact_method: string | null;
          info_provided_contact_method: boolean;
          info_provided_social_insurance: boolean;
          info_provided_rest_guidance: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          case_id?: string | null;
          start_date: string;
          end_date?: string | null;
          diagnosis_received?: boolean;
          contact_frequency?: string | null;
          contact_method?: string | null;
          info_provided_contact_method?: boolean;
          info_provided_social_insurance?: boolean;
          info_provided_rest_guidance?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          case_id?: string | null;
          start_date?: string;
          end_date?: string | null;
          diagnosis_received?: boolean;
          contact_frequency?: string | null;
          contact_method?: string | null;
          info_provided_contact_method?: boolean;
          info_provided_social_insurance?: boolean;
          info_provided_rest_guidance?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "leaves_case_id_fkey";
            columns: ["case_id"];
            isOneToOne: false;
            referencedRelation: "cases";
            referencedColumns: ["id"];
          },
        ];
      };
      contact_reminders: {
        Row: {
          id: string;
          leave_id: string | null;
          scheduled_date: string;
          completed: boolean;
          completed_at: string | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          leave_id?: string | null;
          scheduled_date: string;
          completed?: boolean;
          completed_at?: string | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          leave_id?: string | null;
          scheduled_date?: string;
          completed?: boolean;
          completed_at?: string | null;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "contact_reminders_leave_id_fkey";
            columns: ["leave_id"];
            isOneToOne: false;
            referencedRelation: "leaves";
            referencedColumns: ["id"];
          },
        ];
      };
      case_events: {
        Row: {
          id: string;
          case_id: string | null;
          event_type: string;
          event_date: string;
          description: string;
          created_by: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          case_id?: string | null;
          event_type: string;
          event_date: string;
          description: string;
          created_by?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          case_id?: string | null;
          event_type?: string;
          event_date?: string;
          description?: string;
          created_by?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "case_events_case_id_fkey";
            columns: ["case_id"];
            isOneToOne: false;
            referencedRelation: "cases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "case_events_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
