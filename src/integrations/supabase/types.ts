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
      access_types: {
        Row: {
          active: boolean
          built_in: boolean
          created_at: string
          description: string | null
          id: string
          is_admin: boolean
          is_manager: boolean
          key: string
          label: string
          position: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          built_in?: boolean
          created_at?: string
          description?: string | null
          id?: string
          is_admin?: boolean
          is_manager?: boolean
          key: string
          label: string
          position?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          built_in?: boolean
          created_at?: string
          description?: string | null
          id?: string
          is_admin?: boolean
          is_manager?: boolean
          key?: string
          label?: string
          position?: number
          updated_at?: string
        }
        Relationships: []
      }
      activities: {
        Row: {
          activity_date: string
          address: string | null
          city_id: string | null
          collaborators_count: number | null
          created_at: string
          created_by: string | null
          description: string | null
          end_time: string | null
          execution_minutes: number | null
          id: string
          notes: string | null
          number: number
          owner_id: string | null
          priority: Database["public"]["Enums"]["activity_priority"]
          school_id: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["activity_status"]
          students_count: number | null
          team_id: string | null
          title: string | null
          type: Database["public"]["Enums"]["activity_type"]
          updated_at: string
        }
        Insert: {
          activity_date: string
          address?: string | null
          city_id?: string | null
          collaborators_count?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          execution_minutes?: number | null
          id?: string
          notes?: string | null
          number?: number
          owner_id?: string | null
          priority?: Database["public"]["Enums"]["activity_priority"]
          school_id?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["activity_status"]
          students_count?: number | null
          team_id?: string | null
          title?: string | null
          type: Database["public"]["Enums"]["activity_type"]
          updated_at?: string
        }
        Update: {
          activity_date?: string
          address?: string | null
          city_id?: string | null
          collaborators_count?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          execution_minutes?: number | null
          id?: string
          notes?: string | null
          number?: number
          owner_id?: string | null
          priority?: Database["public"]["Enums"]["activity_priority"]
          school_id?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["activity_status"]
          students_count?: number | null
          team_id?: string | null
          title?: string | null
          type?: Database["public"]["Enums"]["activity_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_checklists: {
        Row: {
          activity_id: string
          created_at: string
          done: boolean
          id: string
          label: string
          position: number
        }
        Insert: {
          activity_id: string
          created_at?: string
          done?: boolean
          id?: string
          label: string
          position?: number
        }
        Update: {
          activity_id?: string
          created_at?: string
          done?: boolean
          id?: string
          label?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "activity_checklists_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_comments: {
        Row: {
          activity_id: string
          body: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          activity_id: string
          body: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          activity_id?: string
          body?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_comments_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_documents: {
        Row: {
          activity_id: string
          category: string | null
          created_at: string
          description: string | null
          id: string
          mime_type: string | null
          name: string
          size_bytes: number | null
          storage_path: string
          user_id: string | null
        }
        Insert: {
          activity_id: string
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          mime_type?: string | null
          name: string
          size_bytes?: number | null
          storage_path: string
          user_id?: string | null
        }
        Update: {
          activity_id?: string
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          mime_type?: string | null
          name?: string
          size_bytes?: number | null
          storage_path?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_documents_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_finance: {
        Row: {
          activity_id: string
          amount_card: number
          amount_cash: number
          amount_pix: number
          amount_received: number
          amount_sold: number
          created_at: string
          sales_count: number
          service_count: number
          updated_at: string
        }
        Insert: {
          activity_id: string
          amount_card?: number
          amount_cash?: number
          amount_pix?: number
          amount_received?: number
          amount_sold?: number
          created_at?: string
          sales_count?: number
          service_count?: number
          updated_at?: string
        }
        Update: {
          activity_id?: string
          amount_card?: number
          amount_cash?: number
          amount_pix?: number
          amount_received?: number
          amount_sold?: number
          created_at?: string
          sales_count?: number
          service_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_finance_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: true
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_team: {
        Row: {
          activity_id: string
          check_in: string | null
          check_out: string | null
          created_at: string
          employee_id: string | null
          id: string
          job_role: string | null
          name: string | null
          notes: string | null
          user_id: string | null
        }
        Insert: {
          activity_id: string
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          employee_id?: string | null
          id?: string
          job_role?: string | null
          name?: string | null
          notes?: string | null
          user_id?: string | null
        }
        Update: {
          activity_id?: string
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          employee_id?: string | null
          id?: string
          job_role?: string | null
          name?: string | null
          notes?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_team_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_team_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          created_at: string
          field_name: string | null
          id: string
          ip: string | null
          new_value: string | null
          old_value: string | null
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          field_name?: string | null
          id?: string
          ip?: string | null
          new_value?: string | null
          old_value?: string | null
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          field_name?: string | null
          id?: string
          ip?: string | null
          new_value?: string | null
          old_value?: string | null
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      cities: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          state: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          state?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          state?: string
          updated_at?: string
        }
        Relationships: []
      }
      delivery_items: {
        Row: {
          activity_id: string
          amount_received: number
          amount_sold: number
          created_at: string
          id: string
          os_number: string | null
          payment_method_id: string | null
          responsible: string | null
          status: string
          student_name: string | null
          updated_at: string
        }
        Insert: {
          activity_id: string
          amount_received?: number
          amount_sold?: number
          created_at?: string
          id?: string
          os_number?: string | null
          payment_method_id?: string | null
          responsible?: string | null
          status?: string
          student_name?: string | null
          updated_at?: string
        }
        Update: {
          activity_id?: string
          amount_received?: number
          amount_sold?: number
          created_at?: string
          id?: string
          os_number?: string | null
          payment_method_id?: string | null
          responsible?: string | null
          status?: string
          student_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_items_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_items_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      dre_lines: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          position: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          position?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          position?: number
          updated_at?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          active: boolean
          created_at: string
          document: string | null
          email: string | null
          id: string
          job_role: string
          name: string
          phone: string | null
          team_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          job_role?: string
          name: string
          phone?: string | null
          team_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          job_role?: string
          name?: string
          phone?: string | null
          team_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_categories: {
        Row: {
          active: boolean
          created_at: string
          dre_line_id: string | null
          id: string
          kind: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          dre_line_id?: string | null
          id?: string
          kind?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          dre_line_id?: string | null
          id?: string
          kind?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_categories_dre_line_id_fkey"
            columns: ["dre_line_id"]
            isOneToOne: false
            referencedRelation: "dre_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_subcategories: {
        Row: {
          active: boolean
          category_id: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category_id?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category_id?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "finance_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      labs: {
        Row: {
          active: boolean
          contact: string | null
          created_at: string
          id: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          contact?: string | null
          created_at?: string
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          contact?: string | null
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      lens_types: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          price: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          price?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          price?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      list_options: {
        Row: {
          active: boolean
          created_at: string
          group_key: string
          id: string
          name: string
          position: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          group_key: string
          id?: string
          name: string
          position?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          group_key?: string
          id?: string
          name?: string
          position?: number
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          activity_id: string | null
          body: string | null
          created_at: string
          id: string
          kind: string
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          activity_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          activity_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          active: boolean
          contact: string | null
          created_at: string
          id: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          contact?: string | null
          created_at?: string
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          contact?: string | null
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active: boolean
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          job_title: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          job_title?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          job_title?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          allowed: boolean
          created_at: string
          id: string
          permission: string
          role: string
          updated_at: string
        }
        Insert: {
          allowed?: boolean
          created_at?: string
          id?: string
          permission: string
          role: string
          updated_at?: string
        }
        Update: {
          allowed?: boolean
          created_at?: string
          id?: string
          permission?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      schools: {
        Row: {
          active: boolean
          address: string | null
          city_id: string | null
          created_at: string
          id: string
          name: string
          phone: string | null
          principal: string | null
          students_count: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          city_id?: string | null
          created_at?: string
          id?: string
          name: string
          phone?: string | null
          principal?: string | null
          students_count?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string | null
          city_id?: string | null
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          principal?: string | null
          students_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schools_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          active: boolean
          created_at: string
          id: string
          model: string | null
          name: string
          plate: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          model?: string | null
          name: string
          plate?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          model?: string | null
          name?: string
          plate?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_see_activity: {
        Args: { _activity_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role_key: {
        Args: { _role: string; _user_id: string }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_manager: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      activity_priority: "baixa" | "media" | "alta" | "urgente"
      activity_status:
        | "agendada"
        | "em_andamento"
        | "concluida"
        | "atrasada"
        | "cancelada"
      activity_type:
        | "acuidade"
        | "atendimento"
        | "entrega"
        | "reuniao"
        | "viagem"
        | "treinamento"
        | "administrativo"
      app_role:
        | "administrador"
        | "coordenador"
        | "financeiro"
        | "vendedor"
        | "optometrista"
        | "entregador"
        | "motorista"
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
      activity_priority: ["baixa", "media", "alta", "urgente"],
      activity_status: [
        "agendada",
        "em_andamento",
        "concluida",
        "atrasada",
        "cancelada",
      ],
      activity_type: [
        "acuidade",
        "atendimento",
        "entrega",
        "reuniao",
        "viagem",
        "treinamento",
        "administrativo",
      ],
      app_role: [
        "administrador",
        "coordenador",
        "financeiro",
        "vendedor",
        "optometrista",
        "entregador",
        "motorista",
      ],
    },
  },
} as const
