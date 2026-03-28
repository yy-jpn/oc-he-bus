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
          employee_code: string | null;
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
          employee_code?: string | null;
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
          employee_code?: string | null;
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
      return_preparations: {
        Row: {
          id: string;
          leave_id: string | null;
          started_at: string | null;
          rework_enrolled: boolean;
          rework_facility_name: string | null;
          rework_status: string | null;
          checklist_l1_return_intention: boolean;
          checklist_l2_doctor_clearance: boolean;
          checklist_l3_self_care: boolean;
          checklist_l4_communication: boolean;
          checklist_l5_work_performance: boolean;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          leave_id?: string | null;
          started_at?: string | null;
          rework_enrolled?: boolean;
          rework_facility_name?: string | null;
          rework_status?: string | null;
          checklist_l1_return_intention?: boolean;
          checklist_l2_doctor_clearance?: boolean;
          checklist_l3_self_care?: boolean;
          checklist_l4_communication?: boolean;
          checklist_l5_work_performance?: boolean;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          leave_id?: string | null;
          started_at?: string | null;
          rework_enrolled?: boolean;
          rework_facility_name?: string | null;
          rework_status?: string | null;
          checklist_l1_return_intention?: boolean;
          checklist_l2_doctor_clearance?: boolean;
          checklist_l3_self_care?: boolean;
          checklist_l4_communication?: boolean;
          checklist_l5_work_performance?: boolean;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "return_preparations_leave_id_fkey";
            columns: ["leave_id"];
            isOneToOne: false;
            referencedRelation: "leaves";
            referencedColumns: ["id"];
          },
        ];
      };
      return_decisions: {
        Row: {
          id: string;
          leave_id: string | null;
          decided_at: string | null;
          decision: string | null;
          l1_return_intention: boolean;
          l1_intention_expressed_at: string | null;
          l1_intention_confirmed_by: string | null;
          l2_doctor_clearance: boolean;
          l2_symptom_stable: boolean;
          l2_episode_recall_tolerance: boolean;
          l2_clearance_received_at: string | null;
          l3_life_rhythm_stable: boolean;
          l3_medication_self_managed: boolean;
          l3_grooming_adequate: boolean;
          l3_daily_outing_possible: boolean;
          l3_eating_adequate: boolean;
          l4_family_friends_ok: boolean;
          l4_strangers_ok: boolean;
          l4_rework_staff_ok: boolean | null;
          l4_hr_interview_ok: boolean;
          l5_attendance_stable: boolean;
          l5_task_performance_ok: boolean;
          l5_concentration_adequate: boolean;
          l5_commute_training_ok: boolean;
          l5_rework_completion: boolean | null;
          regional_ohc_consulted: boolean;
          regional_ohc_opinion: string | null;
          decided_by: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          leave_id?: string | null;
          decided_at?: string | null;
          decision?: string | null;
          [key: string]: unknown;
        };
        Update: {
          id?: string;
          leave_id?: string | null;
          decided_at?: string | null;
          decision?: string | null;
          [key: string]: unknown;
        };
        Relationships: [
          {
            foreignKeyName: "return_decisions_leave_id_fkey";
            columns: ["leave_id"];
            isOneToOne: false;
            referencedRelation: "leaves";
            referencedColumns: ["id"];
          },
        ];
      };
      returns: {
        Row: {
          id: string;
          leave_id: string | null;
          return_type: string | null;
          return_date: string;
          department: string | null;
          position: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          leave_id?: string | null;
          return_type?: string | null;
          return_date: string;
          department?: string | null;
          position?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          leave_id?: string | null;
          return_type?: string | null;
          return_date?: string;
          department?: string | null;
          position?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "returns_leave_id_fkey";
            columns: ["leave_id"];
            isOneToOne: false;
            referencedRelation: "leaves";
            referencedColumns: ["id"];
          },
        ];
      };
      gradual_schedule_steps: {
        Row: {
          id: string;
          return_id: string | null;
          step_number: number;
          start_date: string;
          end_date: string;
          work_hours_per_day: number | null;
          work_days_per_week: number | null;
          duty_adjustments: string | null;
          review_date: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          return_id?: string | null;
          step_number: number;
          start_date: string;
          end_date: string;
          work_hours_per_day?: number | null;
          work_days_per_week?: number | null;
          duty_adjustments?: string | null;
          review_date?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          return_id?: string | null;
          step_number?: number;
          start_date?: string;
          end_date?: string;
          work_hours_per_day?: number | null;
          work_days_per_week?: number | null;
          duty_adjustments?: string | null;
          review_date?: string | null;
          status?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "gradual_schedule_steps_return_id_fkey";
            columns: ["return_id"];
            isOneToOne: false;
            referencedRelation: "returns";
            referencedColumns: ["id"];
          },
        ];
      };
      relapse_prevention_plans: {
        Row: {
          id: string;
          return_id: string | null;
          workplace_adjustments: string[];
          identified_stressors: string[];
          countermeasures: string[];
          monitoring_items: string[];
          monitoring_frequency: string | null;
          monitoring_duration_months: number | null;
          next_review_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          return_id?: string | null;
          workplace_adjustments?: string[];
          identified_stressors?: string[];
          countermeasures?: string[];
          monitoring_items?: string[];
          monitoring_frequency?: string | null;
          monitoring_duration_months?: number | null;
          next_review_date?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          return_id?: string | null;
          workplace_adjustments?: string[];
          identified_stressors?: string[];
          countermeasures?: string[];
          monitoring_items?: string[];
          monitoring_frequency?: string | null;
          monitoring_duration_months?: number | null;
          next_review_date?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "relapse_prevention_plans_return_id_fkey";
            columns: ["return_id"];
            isOneToOne: false;
            referencedRelation: "returns";
            referencedColumns: ["id"];
          },
        ];
      };
      hr_data_imports: {
        Row: {
          id: string;
          company_id: string;
          connection_id: string | null;
          source_type: string;
          data_type: string;
          imported_at: string;
          record_count: number;
          status: string;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          connection_id?: string | null;
          source_type?: string;
          data_type: string;
          imported_at?: string;
          record_count?: number;
          status?: string;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          connection_id?: string | null;
          source_type?: string;
          data_type?: string;
          imported_at?: string;
          record_count?: number;
          status?: string;
          metadata?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "hr_data_imports_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      hr_data_records: {
        Row: {
          id: string;
          import_id: string;
          company_id: string;
          employee_code: string;
          employee_id: string | null;
          data_type: string;
          period_start: string | null;
          period_end: string | null;
          data: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          import_id: string;
          company_id: string;
          employee_code: string;
          employee_id?: string | null;
          data_type: string;
          period_start?: string | null;
          period_end?: string | null;
          data: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          import_id?: string;
          company_id?: string;
          employee_code?: string;
          employee_id?: string | null;
          data_type?: string;
          period_start?: string | null;
          period_end?: string | null;
          data?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "hr_data_records_import_id_fkey";
            columns: ["import_id"];
            isOneToOne: false;
            referencedRelation: "hr_data_imports";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "hr_data_records_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "hr_data_records_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: false;
            referencedRelation: "employees";
            referencedColumns: ["id"];
          },
        ];
      };
      case_candidates: {
        Row: {
          id: string;
          company_id: string;
          employee_id: string;
          trigger_type: string;
          trigger_detail: string | null;
          threshold_rule: string;
          source_record_ids: string[] | null;
          status: string;
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_case_id: string | null;
          detected_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          employee_id: string;
          trigger_type: string;
          trigger_detail?: string | null;
          threshold_rule: string;
          source_record_ids?: string[] | null;
          status?: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_case_id?: string | null;
          detected_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          employee_id?: string;
          trigger_type?: string;
          trigger_detail?: string | null;
          threshold_rule?: string;
          source_record_ids?: string[] | null;
          status?: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_case_id?: string | null;
          detected_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "case_candidates_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "case_candidates_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: false;
            referencedRelation: "employees";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "case_candidates_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "case_candidates_created_case_id_fkey";
            columns: ["created_case_id"];
            isOneToOne: false;
            referencedRelation: "cases";
            referencedColumns: ["id"];
          },
        ];
      };
      hr_connections: {
        Row: {
          id: string;
          company_id: string;
          adapter_type: string;
          display_name: string;
          auth_type: string;
          credentials_encrypted: string | null;
          oauth_state: Json | null;
          config: Json;
          sync_data_types: string[];
          schedule: string;
          schedule_time: string | null;
          schedule_day_of_week: number | null;
          is_active: boolean;
          last_synced_at: string | null;
          last_sync_status: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          adapter_type: string;
          display_name: string;
          auth_type: string;
          credentials_encrypted?: string | null;
          oauth_state?: Json | null;
          config?: Json;
          sync_data_types?: string[];
          schedule?: string;
          schedule_time?: string | null;
          schedule_day_of_week?: number | null;
          is_active?: boolean;
          last_synced_at?: string | null;
          last_sync_status?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          adapter_type?: string;
          display_name?: string;
          auth_type?: string;
          credentials_encrypted?: string | null;
          oauth_state?: Json | null;
          config?: Json;
          sync_data_types?: string[];
          schedule?: string;
          schedule_time?: string | null;
          schedule_day_of_week?: number | null;
          is_active?: boolean;
          last_synced_at?: string | null;
          last_sync_status?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "hr_connections_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      hr_sync_logs: {
        Row: {
          id: string;
          connection_id: string;
          company_id: string;
          status: string;
          started_at: string;
          completed_at: string | null;
          data_types_requested: string[] | null;
          data_types_succeeded: string[] | null;
          data_types_failed: string[] | null;
          records_fetched: number;
          candidates_created: number;
          cases_created: number;
          cases_updated: number;
          error_message: string | null;
          error_details: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          connection_id: string;
          company_id: string;
          status?: string;
          started_at?: string;
          completed_at?: string | null;
          data_types_requested?: string[] | null;
          data_types_succeeded?: string[] | null;
          data_types_failed?: string[] | null;
          records_fetched?: number;
          candidates_created?: number;
          cases_created?: number;
          cases_updated?: number;
          error_message?: string | null;
          error_details?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          connection_id?: string;
          company_id?: string;
          status?: string;
          started_at?: string;
          completed_at?: string | null;
          data_types_requested?: string[] | null;
          data_types_succeeded?: string[] | null;
          data_types_failed?: string[] | null;
          records_fetched?: number;
          candidates_created?: number;
          cases_created?: number;
          cases_updated?: number;
          error_message?: string | null;
          error_details?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "hr_sync_logs_connection_id_fkey";
            columns: ["connection_id"];
            isOneToOne: false;
            referencedRelation: "hr_connections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "hr_sync_logs_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      hr_sync_alerts: {
        Row: {
          id: string;
          connection_id: string;
          company_id: string;
          sync_log_id: string | null;
          alert_type: string;
          message: string;
          resolved: boolean;
          resolved_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          connection_id: string;
          company_id: string;
          sync_log_id?: string | null;
          alert_type: string;
          message: string;
          resolved?: boolean;
          resolved_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          connection_id?: string;
          company_id?: string;
          sync_log_id?: string | null;
          alert_type?: string;
          message?: string;
          resolved?: boolean;
          resolved_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "hr_sync_alerts_connection_id_fkey";
            columns: ["connection_id"];
            isOneToOne: false;
            referencedRelation: "hr_connections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "hr_sync_alerts_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "hr_sync_alerts_sync_log_id_fkey";
            columns: ["sync_log_id"];
            isOneToOne: false;
            referencedRelation: "hr_sync_logs";
            referencedColumns: ["id"];
          },
        ];
      };
      threshold_settings: {
        Row: {
          id: string;
          company_id: string;
          trigger_type: string;
          rule_key: string;
          parameters: Json;
          enabled: boolean;
          auto_approve: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          trigger_type: string;
          rule_key: string;
          parameters?: Json;
          enabled?: boolean;
          auto_approve?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          trigger_type?: string;
          rule_key?: string;
          parameters?: Json;
          enabled?: boolean;
          auto_approve?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "threshold_settings_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
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
