export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: Database["public"]["Enums"]["acao_auditoria"]
          actor_id: string
          created_at: string
          id: number
          new_value: Json | null
          old_value: Json | null
          target_user_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["acao_auditoria"]
          actor_id: string
          created_at?: string
          id?: never
          new_value?: Json | null
          old_value?: Json | null
          target_user_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["acao_auditoria"]
          actor_id?: string
          created_at?: string
          id?: never
          new_value?: Json | null
          old_value?: Json | null
          target_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          attempted_at: string
          email_normalized: string
          id: number
          ip_hash: string
          succeeded: boolean
        }
        Insert: {
          attempted_at?: string
          email_normalized: string
          id?: never
          ip_hash: string
          succeeded: boolean
        }
        Update: {
          attempted_at?: string
          email_normalized?: string
          id?: never
          ip_hash?: string
          succeeded?: boolean
        }
        Relationships: []
      }
      password_reset_requests: {
        Row: {
          consumed_at: string | null
          expires_at: string
          id: string
          requested_at: string
          superseded_at: string | null
          user_id: string
        }
        Insert: {
          consumed_at?: string | null
          expires_at?: string
          id?: string
          requested_at?: string
          superseded_at?: string | null
          user_id: string
        }
        Update: {
          consumed_at?: string | null
          expires_at?: string
          id?: string
          requested_at?: string
          superseded_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "password_reset_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active_view: Database["public"]["Enums"]["perfil"] | null
          created_at: string
          created_by: string | null
          email: string
          first_access: boolean
          full_name: string
          id: string
          last_sign_in_at: string | null
          status: Database["public"]["Enums"]["situacao_usuario"]
          teacher_id: string | null
          updated_at: string
        }
        Insert: {
          active_view?: Database["public"]["Enums"]["perfil"] | null
          created_at?: string
          created_by?: string | null
          email: string
          first_access?: boolean
          full_name: string
          id: string
          last_sign_in_at?: string | null
          status?: Database["public"]["Enums"]["situacao_usuario"]
          teacher_id?: string | null
          updated_at?: string
        }
        Update: {
          active_view?: Database["public"]["Enums"]["perfil"] | null
          created_at?: string
          created_by?: string | null
          email?: string
          first_access?: boolean
          full_name?: string
          id?: string
          last_sign_in_at?: string | null
          status?: Database["public"]["Enums"]["situacao_usuario"]
          teacher_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: true
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          active: boolean
          full_name: string
          id: string
        }
        Insert: {
          active?: boolean
          full_name: string
          id?: string
        }
        Update: {
          active?: boolean
          full_name?: string
          id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          granted_at: string
          granted_by: string
          role: Database["public"]["Enums"]["perfil"]
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by: string
          role: Database["public"]["Enums"]["perfil"]
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string
          role?: Database["public"]["Enums"]["perfil"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
      admin_definir_perfis: {
        Args: {
          p_autor: string
          p_perfis: Database["public"]["Enums"]["perfil"][]
          p_usuario_id: string
        }
        Returns: Json
      }
      admin_mudar_situacao: {
        Args: {
          p_acao: Database["public"]["Enums"]["acao_auditoria"]
          p_autor: string
          p_situacao: Database["public"]["Enums"]["situacao_usuario"]
          p_usuario_id: string
        }
        Returns: Json
      }
      admin_registrar_senha_reemitida: {
        Args: { p_autor: string; p_usuario_id: string }
        Returns: Json
      }
      admin_registrar_usuario_criado: {
        Args: { p_autor: string; p_usuario_id: string }
        Returns: Json
      }
      admin_usuario_json: { Args: { p_usuario_id: string }; Returns: Json }
      admin_verificar_autor: { Args: { p_autor: string }; Returns: undefined }
      eh_administrador: { Args: never; Returns: boolean }
      expurgar_tentativas_antigas: { Args: never; Returns: undefined }
      perfis_de: {
        Args: { alvo: string }
        Returns: Database["public"]["Enums"]["perfil"][]
      }
      perfis_do_usuario: {
        Args: never
        Returns: Database["public"]["Enums"]["perfil"][]
      }
      pode_operar: { Args: never; Returns: boolean }
      sessao_valida: { Args: never; Returns: boolean }
      tem_perfil: {
        Args: { p: Database["public"]["Enums"]["perfil"] }
        Returns: boolean
      }
      turmas_do_professor: { Args: never; Returns: string[] }
      usuario_ativo: { Args: never; Returns: boolean }
      visao_padrao: {
        Args: { ps: Database["public"]["Enums"]["perfil"][] }
        Returns: Database["public"]["Enums"]["perfil"]
      }
    }
    Enums: {
      acao_auditoria:
        | "usuario_criado"
        | "perfil_atribuido"
        | "perfil_removido"
        | "usuario_bloqueado"
        | "usuario_desbloqueado"
        | "usuario_desativado"
        | "senha_redefinida_admin"
        | "visao_ativa_alterada"
      perfil: "administrador" | "secretaria" | "coordenacao" | "professor"
      situacao_usuario: "ativo" | "bloqueado" | "desativado"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      acao_auditoria: [
        "usuario_criado",
        "perfil_atribuido",
        "perfil_removido",
        "usuario_bloqueado",
        "usuario_desbloqueado",
        "usuario_desativado",
        "senha_redefinida_admin",
        "visao_ativa_alterada",
      ],
      perfil: ["administrador", "secretaria", "coordenacao", "professor"],
      situacao_usuario: ["ativo", "bloqueado", "desativado"],
    },
  },
} as const

