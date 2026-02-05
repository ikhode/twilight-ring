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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_chat_agents: {
        Row: {
          capabilities: Json | null
          created_at: string | null
          description: string
          id: string
          knowledge_scope: Json | null
          name: string
          role: Database["public"]["Enums"]["role"]
          settings: Json | null
          system_prompt: string
          updated_at: string | null
        }
        Insert: {
          capabilities?: Json | null
          created_at?: string | null
          description: string
          id?: string
          knowledge_scope?: Json | null
          name: string
          role: Database["public"]["Enums"]["role"]
          settings?: Json | null
          system_prompt: string
          updated_at?: string | null
        }
        Update: {
          capabilities?: Json | null
          created_at?: string | null
          description?: string
          id?: string
          knowledge_scope?: Json | null
          name?: string
          role?: Database["public"]["Enums"]["role"]
          settings?: Json | null
          system_prompt?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ai_configurations: {
        Row: {
          adaptive_ui_enabled: boolean
          copilot_enabled: boolean
          created_at: string
          guardian_enabled: boolean
          guardian_sensitivity: number
          id: string
          organization_id: string
          settings: Json | null
          updated_at: string
        }
        Insert: {
          adaptive_ui_enabled?: boolean
          copilot_enabled?: boolean
          created_at?: string
          guardian_enabled?: boolean
          guardian_sensitivity?: number
          id?: string
          organization_id: string
          settings?: Json | null
          updated_at?: string
        }
        Update: {
          adaptive_ui_enabled?: boolean
          copilot_enabled?: boolean
          created_at?: string
          guardian_enabled?: boolean
          guardian_sensitivity?: number
          id?: string
          organization_id?: string
          settings?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_configurations_organization_id_organizations_id_fk"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_insights: {
        Row: {
          acknowledged: boolean
          created_at: string
          data: Json | null
          description: string
          id: string
          organization_id: string
          severity: string
          title: string
          type: string
        }
        Insert: {
          acknowledged?: boolean
          created_at?: string
          data?: Json | null
          description: string
          id?: string
          organization_id: string
          severity: string
          title: string
          type: string
        }
        Update: {
          acknowledged?: boolean
          created_at?: string
          data?: Json | null
          description?: string
          id?: string
          organization_id?: string
          severity?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_insights_organization_id_organizations_id_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_metrics: {
        Row: {
          confidence: number | null
          date: string | null
          id: string
          metric_key: string
          organization_id: string
          predicted_value: number | null
          tags: Json | null
          value: number
        }
        Insert: {
          confidence?: number | null
          date?: string | null
          id?: string
          metric_key: string
          organization_id: string
          predicted_value?: number | null
          tags?: Json | null
          value: number
        }
        Update: {
          confidence?: number | null
          date?: string | null
          id?: string
          metric_key?: string
          organization_id?: string
          predicted_value?: number | null
          tags?: Json | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "analytics_metrics_organization_id_organizations_id_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_snapshots: {
        Row: {
          created_at: string | null
          date: string
          id: string
          metrics: Json
          organization_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          metrics: Json
          organization_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          metrics?: Json
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_snapshots_organization_id_organizations_id_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          account_number: string | null
          balance: number
          bank_name: string | null
          created_at: string | null
          currency: string
          id: string
          is_active: boolean
          name: string
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          account_number?: string | null
          balance?: number
          bank_name?: string | null
          created_at?: string | null
          currency?: string
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          account_number?: string | null
          balance?: number
          bank_name?: string | null
          created_at?: string | null
          currency?: string
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_organization_id_organizations_id_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_reconciliations: {
        Row: {
          account_name: string
          book_balance: number
          created_at: string | null
          difference: number | null
          id: string
          notes: string | null
          organization_id: string
          statement_balance: number
          statement_date: string
          status: string
        }
        Insert: {
          account_name: string
          book_balance: number
          created_at?: string | null
          difference?: number | null
          id?: string
          notes?: string | null
          organization_id: string
          statement_balance: number
          statement_date: string
          status?: string
        }
        Update: {
          account_name?: string
          book_balance?: number
          created_at?: string | null
          difference?: number | null
          id?: string
          notes?: string | null
          organization_id?: string
          statement_balance?: number
          statement_date?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_reconciliations_organization_id_organizations_id_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          id: string
          month: number | null
          organization_id: string
          period: string
          spent: number | null
          year: number
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          id?: string
          month?: number | null
          organization_id: string
          period: string
          spent?: number | null
          year: number
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          id?: string
          month?: number | null
          organization_id?: string
          period?: string
          spent?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "budgets_organization_id_organizations_id_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      business_documents: {
        Row: {
          confidence: number | null
          created_at: string | null
          expires_at: string | null
          extracted_data: Json | null
          file_url: string | null
          id: string
          name: string
          organization_id: string
          processing_error: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          status: string
          type: string
          updated_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          expires_at?: string | null
          extracted_data?: Json | null
          file_url?: string | null
          id?: string
          name: string
          organization_id: string
          processing_error?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          status?: string
          type: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          expires_at?: string | null
          extracted_data?: Json | null
          file_url?: string | null
          id?: string
          name?: string
          organization_id?: string
          processing_error?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          status?: string
          type?: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_documents_organization_id_organizations_id_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_documents_uploaded_by_users_id_fk"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_registers: {
        Row: {
          balance: number
          created_at: string | null
          current_session_id: string | null
          id: string
          name: string
          organization_id: string
          status: string
        }
        Insert: {
          balance?: number
          created_at?: string | null
          current_session_id?: string | null
          id?: string
          name: string
          organization_id: string
          status?: string
        }
        Update: {
          balance?: number
          created_at?: string | null
          current_session_id?: string | null
          id?: string
          name?: string
          organization_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_registers_organization_id_organizations_id_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_sessions: {
        Row: {
          actual_end_amount: number | null
          closed_by: string | null
          difference: number | null
          end_time: string | null
          expected_end_amount: number | null
          id: string
          notes: string | null
          opened_by: string
          organization_id: string
          register_id: string
          start_amount: number
          start_time: string | null
          status: string
        }
        Insert: {
          actual_end_amount?: number | null
          closed_by?: string | null
          difference?: number | null
          end_time?: string | null
          expected_end_amount?: number | null
          id?: string
          notes?: string | null
          opened_by: string
          organization_id: string
          register_id: string
          start_amount: number
          start_time?: string | null
          status?: string
        }
        Update: {
          actual_end_amount?: number | null
          closed_by?: string | null
          difference?: number | null
          end_time?: string | null
          expected_end_amount?: number | null
          id?: string
          notes?: string | null
          opened_by?: string
          organization_id?: string
          register_id?: string
          start_amount?: number
          start_time?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_sessions_closed_by_users_id_fk"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_sessions_opened_by_users_id_fk"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_sessions_organization_id_organizations_id_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_sessions_register_id_cash_registers_id_fk"
            columns: ["register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_transactions: {
        Row: {
          amount: number
          category: string
          description: string | null
          id: string
          organization_id: string
          performed_by: string
          reference_id: string | null
          register_id: string
          session_id: string
          timestamp: string | null
          type: string
        }
        Insert: {
          amount: number
          category: string
          description?: string | null
          id?: string
          organization_id: string
          performed_by: string
          reference_id?: string | null
          register_id: string
          session_id: string
          timestamp?: string | null
          type: string
        }
        Update: {
          amount?: number
          category?: string
          description?: string | null
          id?: string
          organization_id?: string
          performed_by?: string
          reference_id?: string | null
          register_id?: string
          session_id?: string
          timestamp?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_transactions_organization_id_organizations_id_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transactions_performed_by_users_id_fk"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transactions_register_id_cash_registers_id_fk"
            columns: ["register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transactions_session_id_cash_sessions_id_fk"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "cash_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          agent_id: string
          created_at: string | null
          id: string
          last_message_at: string | null
          metadata: Json | null
          organization_id: string
          status: string
          title: string | null
          user_id: string
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          metadata?: Json | null
          organization_id: string
          status?: string
          title?: string | null
          user_id: string
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          metadata?: Json | null
          organization_id?: string
          status?: string
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_agent_id_ai_chat_agents_id_fk"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_organization_id_organizations_id_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_user_id_users_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_chat_conversations_id_fk"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_reports: {
        Row: {
          config: Json
          created_at: string | null
          id: string
          name: string
          organization_id: string
          schedule: string | null
        }
        Insert: {
          config: Json
          created_at?: string | null
          id?: string
          name: string
          organization_id: string
          schedule?: string | null
        }
        Update: {
          config?: Json
          created_at?: string | null
          id?: string
          name?: string
          organization_id?: string
          schedule?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_reports_organization_id_organizations_id_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          attributes: Json | null
          balance: number
          created_at: string | null
          email: string | null
          id: string
          is_archived: boolean
          last_contact: string | null
          latitude: string | null
          longitude: string | null
          name: string
          organization_id: string
          phone: string | null
          status: string
          tags: Json | null
        }
        Insert: {
          address?: string | null
          attributes?: Json | null
          balance?: number
          created_at?: string | null
          email?: string | null
          id?: string
          is_archived?: boolean
          last_contact?: string | null
          latitude?: string | null
          longitude?: string | null
          name: string
          organization_id: string
          phone?: string | null
          status?: string
          tags?: Json | null
        }
        Update: {
          address?: string | null
          attributes?: Json | null
          balance?: number
          created_at?: string | null
          email?: string | null
          id?: string
          is_archived?: boolean
          last_contact?: string | null
          latitude?: string | null
          longitude?: string | null
          name?: string
          organization_id?: string
          phone?: string | null
          status?: string
          tags?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_organizations_id_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_tokens: {
        Row: {
          created_at: string | null
          driver_id: string | null
          expires_at: string
          id: string
          organization_id: string
          status: string
          token: string
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string | null
          driver_id?: string | null
          expires_at: string
          id?: string
          organization_id: string
          status?: string
          token: string
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string | null
          driver_id?: string | null
          expires_at?: string
          id?: string
          organization_id?: string
          status?: string
          token?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_tokens_driver_id_employees_id_fk"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_tokens_organization_id_organizations_id_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_tokens_vehicle_id_vehicles_id_fk"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      embeddings: {
        Row: {
          content: string
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          vector: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          vector?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          vector?: string | null
        }
        Relationships: []
      }
      employee_docs: {
        Row: {
          employee_id: string
          expires_at: string | null
          file_url: string
          id: string
          name: string
          organization_id: string
          type: string
          uploaded_at: string | null
        }
        Insert: {
          employee_id: string
          expires_at?: string | null
          file_url: string
          id?: string
          name: string
          organization_id: string
          type: string
          uploaded_at?: string | null
        }
        Update: {
          employee_id?: string
          expires_at?: string | null
          file_url?: string
          id?: string
          name?: string
          organization_id?: string
          type?: string
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_docs_employee_id_employees_id_fk"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_docs_organization_id_organizations_id_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          address: string | null
          attributes: Json | null
          balance: number
          created_at: string | null
          current_area: string | null
          current_status: string | null
          department: string
          email: string | null
          face_embedding: string | null
          id: string
          is_archived: boolean
          join_date: string | null
          latitude: string | null
          longitude: string | null
          name: string
          organization_id: string
          phone: string | null
          role: string
          salary: number | null
          status: string
        }
        Insert: {
          address?: string | null
          attributes?: Json | null
          balance?: number
          created_at?: string | null
          current_area?: string | null
          current_status?: string | null
          department?: string
          email?: string | null
          face_embedding?: string | null
          id?: string
          is_archived?: boolean
          join_date?: string | null
          latitude?: string | null
          longitude?: string | null
          name: string
          organization_id: string
          phone?: string | null
          role: string
          salary?: number | null
          status?: string
        }
        Update: {
          address?: string | null
          attributes?: Json | null
          balance?: number
          created_at?: string | null
          current_area?: string | null
          current_status?: string | null
          department?: string
          email?: string | null
          face_embedding?: string | null
          id?: string
          is_archived?: boolean
          join_date?: string | null
          latitude?: string | null
          longitude?: string | null
          name?: string
          organization_id?: string
          phone?: string | null
          role?: string
          salary?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_organization_id_organizations_id_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          date: string | null
          description: string | null
          id: string
          organization_id: string
          supplier_id: string | null
        }
        Insert: {
          amount: number
          category: string
          date?: string | null
          description?: string | null
          id?: string
          organization_id: string
          supplier_id?: string | null
        }
        Update: {
          amount?: number
          category?: string
          date?: string | null
          description?: string | null
          id?: string
          organization_id?: string
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_organization_id_organizations_id_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_supplier_id_suppliers_id_fk"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_logs: {
        Row: {
          cost: number
          date: string | null
          id: string
          liters: number
          mileage: number
          vehicle_id: string
        }
        Insert: {
          cost: number
          date?: string | null
          id?: string
          liters: number
          mileage: number
          vehicle_id: string
        }
        Update: {
          cost?: number
          date?: string | null
          id?: string
          liters?: number
          mileage?: number
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fuel_logs_vehicle_id_vehicles_id_fk"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          after_stock: number | null
          before_stock: number | null
          date: string | null
          id: string
          notes: string | null
          organization_id: string
          product_id: string
          quantity: number
          reference_id: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          after_stock?: number | null
          before_stock?: number | null
          date?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          product_id: string
          quantity: number
          reference_id?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          after_stock?: number | null
          before_stock?: number | null
          date?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          product_id?: string
          quantity?: number
          reference_id?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_organization_id_organizations_id_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_products_id_fk"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_user_id_users_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base: {
        Row: {
          access_roles: Json | null
          category: string
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          tags: Json | null
          title: string
          updated_at: string | null
        }
        Insert: {
          access_roles?: Json | null
          category: string
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          tags?: Json | null
          title: string
          updated_at?: string | null
        }
        Update: {
          access_roles?: Json | null
          category?: string
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          tags?: Json | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      maintenance_logs: {
        Row: {
          cost: number
          date: string | null
          description: string | null
          id: string
          mileage_in: number | null
          mileage_out: number | null
          organization_id: string
          parts_used: Json | null
          type: string
          vehicle_id: string
        }
        Insert: {
          cost: number
          date?: string | null
          description?: string | null
          id?: string
          mileage_in?: number | null
          mileage_out?: number | null
          organization_id: string
          parts_used?: Json | null
          type: string
          vehicle_id: string
        }
        Update: {
          cost?: number
          date?: string | null
          description?: string | null
          id?: string
          mileage_in?: number | null
          mileage_out?: number | null
          organization_id?: string
          parts_used?: Json | null
          type?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_logs_organization_id_organizations_id_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_logs_vehicle_id_vehicles_id_fk"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      metric_models: {
        Row: {
          accuracy: number | null
          id: string
          last_trained_at: string | null
          meta: Json | null
          next_training_at: string | null
          organization_id: string
          status: string
          type: string
        }
        Insert: {
          accuracy?: number | null
          id?: string
          last_trained_at?: string | null
          meta?: Json | null
          next_training_at?: string | null
          organization_id: string
          status?: string
          type: string
        }
        Update: {
          accuracy?: number | null
          id?: string
          last_trained_at?: string | null
          meta?: Json | null
          next_training_at?: string | null
          organization_id?: string
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "metric_models_organization_id_organizations_id_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          category: string
          created_at: string
          dependencies: Json | null
          description: string
          icon: string
          id: string
          name: string
          route: string
        }
        Insert: {
          category: string
          created_at?: string
          dependencies?: Json | null
          description: string
          icon: string
          id: string
          name: string
          route: string
        }
        Update: {
          category?: string
          created_at?: string
          dependencies?: Json | null
          description?: string
          icon?: string
          id?: string
          name?: string
          route?: string
        }
        Relationships: []
      }
      organization_modules: {
        Row: {
          disabled_at: string | null
          enabled: boolean
          enabled_at: string
          id: string
          module_id: string
          organization_id: string
        }
        Insert: {
          disabled_at?: string | null
          enabled?: boolean
          enabled_at?: string
          id?: string
          module_id: string
          organization_id: string
        }
        Update: {
          disabled_at?: string | null
          enabled?: boolean
          enabled_at?: string
          id?: string
          module_id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_modules_module_id_modules_id_fk"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_modules_organization_id_organizations_id_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          headquarters_address: string | null
          headquarters_latitude: string | null
          headquarters_longitude: string | null
          id: string
          industry: Database["public"]["Enums"]["industry"]
          meta: Json | null
          name: string
          onboarding_status: string
          settings: Json | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_expires_at: string | null
          subscription_interval: string | null
          subscription_status: string | null
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          headquarters_address?: string | null
          headquarters_latitude?: string | null
          headquarters_longitude?: string | null
          id?: string
          industry: Database["public"]["Enums"]["industry"]
          meta?: Json | null
          name: string
          onboarding_status?: string
          settings?: Json | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_expires_at?: string | null
          subscription_interval?: string | null
          subscription_status?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          headquarters_address?: string | null
          headquarters_latitude?: string | null
          headquarters_longitude?: string | null
          id?: string
          industry?: Database["public"]["Enums"]["industry"]
          meta?: Json | null
          name?: string
          onboarding_status?: string
          settings?: Json | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_expires_at?: string | null
          subscription_interval?: string | null
          subscription_status?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          category: string | null
          date: string | null
          id: string
          method: string | null
          organization_id: string
          reference_id: string | null
          type: string
        }
        Insert: {
          amount: number
          category?: string | null
          date?: string | null
          id?: string
          method?: string | null
          organization_id: string
          reference_id?: string | null
          type: string
        }
        Update: {
          amount?: number
          category?: string | null
          date?: string | null
          id?: string
          method?: string | null
          organization_id?: string
          reference_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_organization_id_organizations_id_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_advances: {
        Row: {
          amount: number
          date: string | null
          employee_id: string
          id: string
          organization_id: string
          status: string
        }
        Insert: {
          amount: number
          date?: string | null
          employee_id: string
          id?: string
          organization_id: string
          status?: string
        }
        Update: {
          amount?: number
          date?: string | null
          employee_id?: string
          id?: string
          organization_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_advances_employee_id_employees_id_fk"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_advances_organization_id_organizations_id_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_reviews: {
        Row: {
          acknowledged_at: string | null
          created_at: string | null
          employee_id: string
          feedback: string
          id: string
          organization_id: string
          period: string
          reviewer_id: string | null
          score: number
          status: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          created_at?: string | null
          employee_id: string
          feedback: string
          id?: string
          organization_id: string
          period: string
          reviewer_id?: string | null
          score: number
          status?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          created_at?: string | null
          employee_id?: string
          feedback?: string
          id?: string
          organization_id?: string
          period?: string
          reviewer_id?: string | null
          score?: number
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_reviews_employee_id_employees_id_fk"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_reviews_organization_id_organizations_id_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_reviews_reviewer_id_users_id_fk"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      piecework_tickets: {
        Row: {
          approved_by: string | null
          attributes: Json | null
          batch_id: string | null
          created_at: string | null
          creator_id: string | null
          destination_location: string | null
          employee_id: string
          id: string
          notes: string | null
          organization_id: string
          paid_at: string | null
          quantity: number
          signature_url: string | null
          source_location: string | null
          status: string
          task_name: string
          ticket_number: number
          total_amount: number
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          approved_by?: string | null
          attributes?: Json | null
          batch_id?: string | null
          created_at?: string | null
          creator_id?: string | null
          destination_location?: string | null
          employee_id: string
          id?: string
          notes?: string | null
          organization_id: string
          paid_at?: string | null
          quantity: number
          signature_url?: string | null
          source_location?: string | null
          status?: string
          task_name: string
          ticket_number?: number
          total_amount: number
          unit_price: number
          updated_at?: string | null
        }
        Update: {
          approved_by?: string | null
          attributes?: Json | null
          batch_id?: string | null
          created_at?: string | null
          creator_id?: string | null
          destination_location?: string | null
          employee_id?: string
          id?: string
          notes?: string | null
          organization_id?: string
          paid_at?: string | null
          quantity?: number
          signature_url?: string | null
          source_location?: string | null
          status?: string
          task_name?: string
          ticket_number?: number
          total_amount?: number
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "piecework_tickets_approved_by_users_id_fk"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "piecework_tickets_creator_id_users_id_fk"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "piecework_tickets_employee_id_employees_id_fk"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "piecework_tickets_organization_id_organizations_id_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      process_events: {
        Row: {
          data: Json | null
          event_type: string
          id: string
          instance_id: string
          step_id: string | null
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          data?: Json | null
          event_type: string
          id?: string
          instance_id: string
          step_id?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          data?: Json | null
          event_type?: string
          id?: string
          instance_id?: string
          step_id?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "process_events_instance_id_process_instances_id_fk"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "process_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_events_step_id_process_steps_id_fk"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "process_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_events_user_id_users_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      process_instances: {
        Row: {
          ai_context: Json | null
          completed_at: string | null
          health_score: number | null
          id: string
          organization_id: string | null
          process_id: string
          source_batch_id: string | null
          started_at: string | null
          status: string
        }
        Insert: {
          ai_context?: Json | null
          completed_at?: string | null
          health_score?: number | null
          id?: string
          organization_id?: string | null
          process_id: string
          source_batch_id?: string | null
          started_at?: string | null
          status?: string
        }
        Update: {
          ai_context?: Json | null
          completed_at?: string | null
          health_score?: number | null
          id?: string
          organization_id?: string | null
          process_id?: string
          source_batch_id?: string | null
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "process_instances_organization_id_organizations_id_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_instances_process_id_processes_id_fk"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
        ]
      }
      process_steps: {
        Row: {
          config: Json | null
          critical_kpis: Json | null
          dependencies: Json | null
          expected_duration: number | null
          id: string
          metrics: Json | null
          name: string
          order: number
          process_id: string
          type: string
        }
        Insert: {
          config?: Json | null
          critical_kpis?: Json | null
          dependencies?: Json | null
          expected_duration?: number | null
          id?: string
          metrics?: Json | null
          name: string
          order: number
          process_id: string
          type: string
        }
        Update: {
          config?: Json | null
          critical_kpis?: Json | null
          dependencies?: Json | null
          expected_duration?: number | null
          id?: string
          metrics?: Json | null
          name?: string
          order?: number
          process_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "process_steps_process_id_processes_id_fk"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
        ]
      }
      processes: {
        Row: {
          attributes: Json | null
          created_at: string | null
          description: string | null
          id: string
          is_template: boolean | null
          name: string
          order_index: number | null
          organization_id: string
          type: string
          updated_at: string | null
          workflow_data: Json | null
        }
        Insert: {
          attributes?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_template?: boolean | null
          name: string
          order_index?: number | null
          organization_id: string
          type: string
          updated_at?: string | null
          workflow_data?: Json | null
        }
        Update: {
          attributes?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_template?: boolean | null
          name?: string
          order_index?: number | null
          organization_id?: string
          type?: string
          updated_at?: string | null
          workflow_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "processes_organization_id_organizations_id_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_organization_id_organizations_id_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_groups: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_groups_organization_id_organizations_id_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_units: {
        Row: {
          abbreviation: string | null
          created_at: string | null
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          abbreviation?: string | null
          created_at?: string | null
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          abbreviation?: string | null
          created_at?: string | null
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_units_organization_id_organizations_id_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      production_tasks: {
        Row: {
          active: boolean
          attributes: Json | null
          created_at: string | null
          description: string | null
          id: string
          is_recipe: boolean | null
          max_rate: number | null
          min_rate: number | null
          name: string
          organization_id: string
          recipe_data: Json | null
          unit: string
          unit_price: number
        }
        Insert: {
          active?: boolean
          attributes?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_recipe?: boolean | null
          max_rate?: number | null
          min_rate?: number | null
          name: string
          organization_id: string
          recipe_data?: Json | null
          unit?: string
          unit_price: number
        }
        Update: {
          active?: boolean
          attributes?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_recipe?: boolean | null
          max_rate?: number | null
          min_rate?: number | null
          name?: string
          organization_id?: string
          recipe_data?: Json | null
          unit?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "production_tasks_organization_id_organizations_id_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          attributes: Json | null
          category: string | null
          category_id: string | null
          cost: number
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          expected_yield: number | null
          group_id: string | null
          id: string
          is_active: boolean
          is_archived: boolean
          is_production_input: boolean
          is_production_output: boolean
          is_purchasable: boolean
          is_sellable: boolean
          master_product_id: string | null
          max_purchase_price: number | null
          min_purchase_price: number | null
          min_stock: number
          name: string
          organization_id: string
          price: number
          product_type: string
          sku: string | null
          stock: number
          unit: string
          unit_id: string | null
        }
        Insert: {
          attributes?: Json | null
          category?: string | null
          category_id?: string | null
          cost?: number
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          expected_yield?: number | null
          group_id?: string | null
          id?: string
          is_active?: boolean
          is_archived?: boolean
          is_production_input?: boolean
          is_production_output?: boolean
          is_purchasable?: boolean
          is_sellable?: boolean
          master_product_id?: string | null
          max_purchase_price?: number | null
          min_purchase_price?: number | null
          min_stock?: number
          name: string
          organization_id: string
          price?: number
          product_type?: string
          sku?: string | null
          stock?: number
          unit?: string
          unit_id?: string | null
        }
        Update: {
          attributes?: Json | null
          category?: string | null
          category_id?: string | null
          cost?: number
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          expected_yield?: number | null
          group_id?: string | null
          id?: string
          is_active?: boolean
          is_archived?: boolean
          is_production_input?: boolean
          is_production_output?: boolean
          is_purchasable?: boolean
          is_sellable?: boolean
          master_product_id?: string | null
          max_purchase_price?: number | null
          min_purchase_price?: number | null
          min_stock?: number
          name?: string
          organization_id?: string
          price?: number
          product_type?: string
          sku?: string | null
          stock?: number
          unit?: string
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_product_categories_id_fk"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_group_id_product_groups_id_fk"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "product_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_master_product_id_products_id_fk"
            columns: ["master_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_organization_id_organizations_id_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_unit_id_product_units_id_fk"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "product_units"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          approved_by: string | null
          batch_id: string | null
          date: string | null
          deleted_at: string | null
          deleted_by: string | null
          delivery_status: string
          driver_id: string | null
          freight_cost: number | null
          id: string
          is_approved: boolean
          is_archived: boolean
          logistics_method: string
          notes: string | null
          organization_id: string
          paid_at: string | null
          payment_method: string | null
          payment_status: string
          product_id: string | null
          quantity: number
          received_at: string | null
          supplier_id: string | null
          total_amount: number
          vehicle_id: string | null
        }
        Insert: {
          approved_by?: string | null
          batch_id?: string | null
          date?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          delivery_status?: string
          driver_id?: string | null
          freight_cost?: number | null
          id?: string
          is_approved?: boolean
          is_archived?: boolean
          logistics_method?: string
          notes?: string | null
          organization_id: string
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string
          product_id?: string | null
          quantity?: number
          received_at?: string | null
          supplier_id?: string | null
          total_amount: number
          vehicle_id?: string | null
        }
        Update: {
          approved_by?: string | null
          batch_id?: string | null
          date?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          delivery_status?: string
          driver_id?: string | null
          freight_cost?: number | null
          id?: string
          is_approved?: boolean
          is_archived?: boolean
          logistics_method?: string
          notes?: string | null
          organization_id?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string
          product_id?: string | null
          quantity?: number
          received_at?: string | null
          supplier_id?: string | null
          total_amount?: number
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchases_approved_by_users_id_fk"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_driver_id_employees_id_fk"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_organization_id_organizations_id_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_product_id_products_id_fk"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_supplier_id_suppliers_id_fk"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_vehicle_id_vehicles_id_fk"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      rca_reports: {
        Row: {
          analysis: string
          confidence: number | null
          created_at: string | null
          id: string
          instance_id: string
          recommendation: string
          root_cause_event_id: string
          status: string
          target_event_id: string
        }
        Insert: {
          analysis: string
          confidence?: number | null
          created_at?: string | null
          id?: string
          instance_id: string
          recommendation: string
          root_cause_event_id: string
          status?: string
          target_event_id: string
        }
        Update: {
          analysis?: string
          confidence?: number | null
          created_at?: string | null
          id?: string
          instance_id?: string
          recommendation?: string
          root_cause_event_id?: string
          status?: string
          target_event_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rca_reports_instance_id_process_instances_id_fk"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "process_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rca_reports_root_cause_event_id_process_events_id_fk"
            columns: ["root_cause_event_id"]
            isOneToOne: false
            referencedRelation: "process_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rca_reports_target_event_id_process_events_id_fk"
            columns: ["target_event_id"]
            isOneToOne: false
            referencedRelation: "process_events"
            referencedColumns: ["id"]
          },
        ]
      }
      route_stops: {
        Row: {
          address: string | null
          completed_at: string | null
          created_at: string | null
          id: string
          is_paid: boolean | null
          location_lat: number | null
          location_lng: number | null
          order_id: string | null
          payment_amount: number | null
          payment_method: string | null
          proof_location_lat: number | null
          proof_location_lng: number | null
          proof_photo: string | null
          proof_signature: string | null
          purchase_id: string | null
          route_id: string
          sequence: number
          status: string
          stop_type: string
        }
        Insert: {
          address?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          is_paid?: boolean | null
          location_lat?: number | null
          location_lng?: number | null
          order_id?: string | null
          payment_amount?: number | null
          payment_method?: string | null
          proof_location_lat?: number | null
          proof_location_lng?: number | null
          proof_photo?: string | null
          proof_signature?: string | null
          purchase_id?: string | null
          route_id: string
          sequence: number
          status?: string
          stop_type?: string
        }
        Update: {
          address?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          is_paid?: boolean | null
          location_lat?: number | null
          location_lng?: number | null
          order_id?: string | null
          payment_amount?: number | null
          payment_method?: string | null
          proof_location_lat?: number | null
          proof_location_lng?: number | null
          proof_photo?: string | null
          proof_signature?: string | null
          purchase_id?: string | null
          route_id?: string
          sequence?: number
          status?: string
          stop_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_stops_order_id_sales_id_fk"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_stops_purchase_id_purchases_id_fk"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_stops_route_id_routes_id_fk"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      routes: {
        Row: {
          created_at: string | null
          current_location_lat: number | null
          current_location_lng: number | null
          driver_id: string
          end_time: string | null
          estimated_duration: number | null
          id: string
          organization_id: string
          start_time: string | null
          status: string
          total_distance: number | null
          vehicle_id: string
        }
        Insert: {
          created_at?: string | null
          current_location_lat?: number | null
          current_location_lng?: number | null
          driver_id: string
          end_time?: string | null
          estimated_duration?: number | null
          id?: string
          organization_id: string
          start_time?: string | null
          status?: string
          total_distance?: number | null
          vehicle_id: string
        }
        Update: {
          created_at?: string | null
          current_location_lat?: number | null
          current_location_lng?: number | null
          driver_id?: string
          end_time?: string | null
          estimated_duration?: number | null
          id?: string
          organization_id?: string
          start_time?: string | null
          status?: string
          total_distance?: number | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routes_driver_id_employees_id_fk"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_organization_id_organizations_id_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_vehicle_id_vehicles_id_fk"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          bank_account_id: string | null
          customer_id: string | null
          date: string | null
          deleted_at: string | null
          deleted_by: string | null
          delivery_status: string
          driver_id: string | null
          id: string
          is_archived: boolean
          organization_id: string
          payment_method: string | null
          payment_status: string
          product_id: string
          quantity: number
          total_price: number
          vehicle_id: string | null
        }
        Insert: {
          bank_account_id?: string | null
          customer_id?: string | null
          date?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          delivery_status?: string
          driver_id?: string | null
          id?: string
          is_archived?: boolean
          organization_id: string
          payment_method?: string | null
          payment_status?: string
          product_id: string
          quantity: number
          total_price: number
          vehicle_id?: string | null
        }
        Update: {
          bank_account_id?: string | null
          customer_id?: string | null
          date?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          delivery_status?: string
          driver_id?: string | null
          id?: string
          is_archived?: boolean
          organization_id?: string
          payment_method?: string | null
          payment_status?: string
          product_id?: string
          quantity?: number
          total_price?: number
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_customers_id_fk"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_driver_id_employees_id_fk"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_organization_id_organizations_id_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_product_id_products_id_fk"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_vehicle_id_vehicles_id_fk"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_insights: {
        Row: {
          anonymized_context: Json | null
          created_at: string | null
          id: string
          industry: string
          metric_key: string
          source_org_id: string
          value: number
          verification_score: number | null
        }
        Insert: {
          anonymized_context?: Json | null
          created_at?: string | null
          id?: string
          industry: string
          metric_key: string
          source_org_id: string
          value: number
          verification_score?: number | null
        }
        Update: {
          anonymized_context?: Json | null
          created_at?: string | null
          id?: string
          industry?: string
          metric_key?: string
          source_org_id?: string
          value?: number
          verification_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shared_insights_source_org_id_organizations_id_fk"
            columns: ["source_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          attributes: Json | null
          category: string | null
          contact_info: Json | null
          created_at: string | null
          id: string
          is_archived: boolean
          latitude: string | null
          longitude: string | null
          name: string
          organization_id: string
          status: string
        }
        Insert: {
          address?: string | null
          attributes?: Json | null
          category?: string | null
          contact_info?: Json | null
          created_at?: string | null
          id?: string
          is_archived?: boolean
          latitude?: string | null
          longitude?: string | null
          name: string
          organization_id: string
          status?: string
        }
        Update: {
          address?: string | null
          attributes?: Json | null
          category?: string | null
          contact_info?: Json | null
          created_at?: string | null
          id?: string
          is_archived?: boolean
          latitude?: string | null
          longitude?: string | null
          name?: string
          organization_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_organization_id_organizations_id_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      terminals: {
        Row: {
          capabilities: Json
          created_at: string | null
          device_id: string | null
          device_salt: string | null
          driver_id: string | null
          id: string
          ip_address: string | null
          last_active_at: string | null
          last_latitude: number | null
          last_longitude: number | null
          linked_device_id: string | null
          location: string | null
          name: string
          organization_id: string
          provisioning_expires_at: string | null
          provisioning_token: string | null
          status: string
          vehicle_id: string | null
        }
        Insert: {
          capabilities?: Json
          created_at?: string | null
          device_id?: string | null
          device_salt?: string | null
          driver_id?: string | null
          id?: string
          ip_address?: string | null
          last_active_at?: string | null
          last_latitude?: number | null
          last_longitude?: number | null
          linked_device_id?: string | null
          location?: string | null
          name: string
          organization_id: string
          provisioning_expires_at?: string | null
          provisioning_token?: string | null
          status?: string
          vehicle_id?: string | null
        }
        Update: {
          capabilities?: Json
          created_at?: string | null
          device_id?: string | null
          device_salt?: string | null
          driver_id?: string | null
          id?: string
          ip_address?: string | null
          last_active_at?: string | null
          last_latitude?: number | null
          last_longitude?: number | null
          linked_device_id?: string | null
          location?: string | null
          name?: string
          organization_id?: string
          provisioning_expires_at?: string | null
          provisioning_token?: string | null
          status?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "terminals_driver_id_employees_id_fk"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "terminals_organization_id_organizations_id_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "terminals_vehicle_id_vehicles_id_fk"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      trust_events: {
        Row: {
          entity_id: string
          entity_type: string
          hash: string
          id: string
          organization_id: string
          previous_hash: string | null
          timestamp: string | null
          validator_node: string | null
          verified: boolean | null
        }
        Insert: {
          entity_id: string
          entity_type: string
          hash: string
          id?: string
          organization_id: string
          previous_hash?: string | null
          timestamp?: string | null
          validator_node?: string | null
          verified?: boolean | null
        }
        Update: {
          entity_id?: string
          entity_type?: string
          hash?: string
          id?: string
          organization_id?: string
          previous_hash?: string | null
          timestamp?: string | null
          validator_node?: string | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "trust_events_organization_id_organizations_id_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      trust_participants: {
        Row: {
          contribution_count: number | null
          id: string
          joined_at: string | null
          last_active_at: string | null
          multiplier: number | null
          organization_id: string
          status: string | null
          trust_score: number
        }
        Insert: {
          contribution_count?: number | null
          id?: string
          joined_at?: string | null
          last_active_at?: string | null
          multiplier?: number | null
          organization_id: string
          status?: string | null
          trust_score?: number
        }
        Update: {
          contribution_count?: number | null
          id?: string
          joined_at?: string | null
          last_active_at?: string | null
          multiplier?: number | null
          organization_id?: string
          status?: string | null
          trust_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "trust_participants_organization_id_organizations_id_fk"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_patterns: {
        Row: {
          access_count: number
          average_session_duration: number | null
          id: string
          last_accessed_at: string
          module_id: string
          organization_id: string
          user_id: string
        }
        Insert: {
          access_count?: number
          average_session_duration?: number | null
          id?: string
          last_accessed_at?: string
          module_id: string
          organization_id: string
          user_id: string
        }
        Update: {
          access_count?: number
          average_session_duration?: number | null
          id?: string
          last_accessed_at?: string
          module_id?: string
          organization_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_patterns_module_id_modules_id_fk"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_patterns_organization_id_organizations_id_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_patterns_user_id_users_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_organizations: {
        Row: {
          achievements: Json | null
          created_at: string
          id: string
          level: number
          organization_id: string
          role: Database["public"]["Enums"]["role"]
          user_id: string
          xp: number
        }
        Insert: {
          achievements?: Json | null
          created_at?: string
          id?: string
          level?: number
          organization_id: string
          role?: Database["public"]["Enums"]["role"]
          user_id: string
          xp?: number
        }
        Update: {
          achievements?: Json | null
          created_at?: string
          id?: string
          level?: number
          organization_id?: string
          role?: Database["public"]["Enums"]["role"]
          user_id?: string
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_organizations_organization_id_organizations_id_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_organizations_user_id_users_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          created_at: string | null
          current_mileage: number | null
          id: string
          is_archived: boolean
          model: string
          organization_id: string
          plate: string
          status: string
          year: number | null
        }
        Insert: {
          created_at?: string | null
          current_mileage?: number | null
          id?: string
          is_archived?: boolean
          model: string
          organization_id: string
          plate: string
          status?: string
          year?: number | null
        }
        Update: {
          created_at?: string | null
          current_mileage?: number | null
          id?: string
          is_archived?: boolean
          model?: string
          organization_id?: string
          plate?: string
          status?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_organization_id_organizations_id_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversations: {
        Row: {
          created_at: string | null
          id: string
          last_message_at: string | null
          metadata: Json | null
          phone_number: string
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          metadata?: Json | null
          phone_number: string
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          metadata?: Json | null
          phone_number?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_user_id_users_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          intent: string | null
          raw_metadata: Json | null
          role: string
          sentiment_score: number | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          intent?: string | null
          raw_metadata?: Json | null
          role: string
          sentiment_score?: number | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          intent?: string | null
          raw_metadata?: Json | null
          role?: string
          sentiment_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_conversation_id_whatsapp_conversations_id_fk"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      work_history: {
        Row: {
          date: string | null
          description: string
          employee_id: string
          event_type: string
          id: string
          new_value: string | null
          organization_id: string
          previous_value: string | null
        }
        Insert: {
          date?: string | null
          description: string
          employee_id: string
          event_type: string
          id?: string
          new_value?: string | null
          organization_id: string
          previous_value?: string | null
        }
        Update: {
          date?: string | null
          description?: string
          employee_id?: string
          event_type?: string
          id?: string
          new_value?: string | null
          organization_id?: string
          previous_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_history_employee_id_employees_id_fk"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_history_organization_id_organizations_id_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      work_sessions: {
        Row: {
          area: string
          duration: number | null
          efficiency_score: number | null
          employee_id: string
          ended_at: string | null
          id: string
          notes: string | null
          organization_id: string
          started_at: string | null
          status: string
        }
        Insert: {
          area: string
          duration?: number | null
          efficiency_score?: number | null
          employee_id: string
          ended_at?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          started_at?: string | null
          status?: string
        }
        Update: {
          area?: string
          duration?: number | null
          efficiency_score?: number | null
          employee_id?: string
          ended_at?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_sessions_employee_id_employees_id_fk"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_sessions_organization_id_organizations_id_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      industry:
        | "retail"
        | "manufacturing"
        | "services"
        | "healthcare"
        | "logistics"
        | "hospitality"
        | "construction"
        | "technology"
        | "education"
        | "peladero"
        | "motorcycle_workshop"
        | "other"
      role: "admin" | "manager" | "user" | "viewer" | "cashier"
      subscription_tier: "trial" | "starter" | "professional" | "enterprise"
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
      industry: [
        "retail",
        "manufacturing",
        "services",
        "healthcare",
        "logistics",
        "hospitality",
        "construction",
        "technology",
        "education",
        "peladero",
        "motorcycle_workshop",
        "other",
      ],
      role: ["admin", "manager", "user", "viewer", "cashier"],
      subscription_tier: ["trial", "starter", "professional", "enterprise"],
    },
  },
} as const
