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
      app_settings: {
        Row: {
          cnpj: string
          created_at: string
          endereco: string
          meta_vendas_mensal: number
          nome_fantasia: string
          razao_social: string
          updated_at: string
          user_id: string
          whatsapp: string
        }
        Insert: {
          cnpj?: string
          created_at?: string
          endereco?: string
          meta_vendas_mensal?: number
          nome_fantasia?: string
          razao_social?: string
          updated_at?: string
          user_id: string
          whatsapp?: string
        }
        Update: {
          cnpj?: string
          created_at?: string
          endereco?: string
          meta_vendas_mensal?: number
          nome_fantasia?: string
          razao_social?: string
          updated_at?: string
          user_id?: string
          whatsapp?: string
        }
        Relationships: []
      }
      cash_movements: {
        Row: {
          cash_register_id: string
          created_at: string
          id: string
          motivo: string
          tipo: Database["public"]["Enums"]["cash_movement_type"]
          user_id: string
          valor: number
        }
        Insert: {
          cash_register_id: string
          created_at?: string
          id?: string
          motivo?: string
          tipo: Database["public"]["Enums"]["cash_movement_type"]
          user_id: string
          valor?: number
        }
        Update: {
          cash_register_id?: string
          created_at?: string
          id?: string
          motivo?: string
          tipo?: Database["public"]["Enums"]["cash_movement_type"]
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "cash_movements_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_registers: {
        Row: {
          aberto_em: string
          contado: number | null
          contado_cartao: number | null
          contado_pix: number | null
          created_at: string
          dia: string
          diferenca: number | null
          diferenca_cartao: number | null
          diferenca_pix: number | null
          fechado_em: string | null
          id: string
          legacy_id: string | null
          troco_inicial: number
          updated_at: string
          user_id: string
        }
        Insert: {
          aberto_em?: string
          contado?: number | null
          contado_cartao?: number | null
          contado_pix?: number | null
          created_at?: string
          dia?: string
          diferenca?: number | null
          diferenca_cartao?: number | null
          diferenca_pix?: number | null
          fechado_em?: string | null
          id?: string
          legacy_id?: string | null
          troco_inicial?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          aberto_em?: string
          contado?: number | null
          contado_cartao?: number | null
          contado_pix?: number | null
          created_at?: string
          dia?: string
          diferenca?: number | null
          diferenca_cartao?: number | null
          diferenca_pix?: number | null
          fechado_em?: string | null
          id?: string
          legacy_id?: string | null
          troco_inicial?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      client_categories: {
        Row: {
          created_at: string
          id: string
          nome: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      client_purchases: {
        Row: {
          client_id: string
          created_at: string
          data: string
          descricao: string
          id: string
          user_id: string
          valor: number
        }
        Insert: {
          client_id: string
          created_at?: string
          data?: string
          descricao?: string
          id?: string
          user_id: string
          valor?: number
        }
        Update: {
          client_id?: string
          created_at?: string
          data?: string
          descricao?: string
          id?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "client_purchases_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          bairro: string | null
          cadastrado_em: string
          code: string | null
          consumo_medio_dias: number
          created_at: string
          divida: number
          documento: string | null
          endereco: string
          id: string
          legacy_id: string | null
          limite_fiado: number
          nome: string
          telefone: string
          ultima_compra: string | null
          updated_at: string
          user_id: string
          vales_saldo: number
          vasilhames_rua: number
        }
        Insert: {
          bairro?: string | null
          cadastrado_em?: string
          code?: string | null
          consumo_medio_dias?: number
          created_at?: string
          divida?: number
          documento?: string | null
          endereco?: string
          id?: string
          legacy_id?: string | null
          limite_fiado?: number
          nome: string
          telefone?: string
          ultima_compra?: string | null
          updated_at?: string
          user_id: string
          vales_saldo?: number
          vasilhames_rua?: number
        }
        Update: {
          bairro?: string | null
          cadastrado_em?: string
          code?: string | null
          consumo_medio_dias?: number
          created_at?: string
          divida?: number
          documento?: string | null
          endereco?: string
          id?: string
          legacy_id?: string | null
          limite_fiado?: number
          nome?: string
          telefone?: string
          ultima_compra?: string | null
          updated_at?: string
          user_id?: string
          vales_saldo?: number
          vasilhames_rua?: number
        }
        Relationships: []
      }
      commission_advances: {
        Row: {
          created_at: string
          entregador: string
          id: string
          motivo: string
          user_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          entregador: string
          id?: string
          motivo?: string
          user_id: string
          valor?: number
        }
        Update: {
          created_at?: string
          entregador?: string
          id?: string
          motivo?: string
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      commission_payments: {
        Row: {
          created_at: string
          entregador: string
          id: string
          user_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          entregador: string
          id?: string
          user_id: string
          valor?: number
        }
        Update: {
          created_at?: string
          entregador?: string
          id?: string
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      commission_rules: {
        Row: {
          created_at: string
          entregador: string
          id: string
          percentual: number
          por_unidade: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entregador: string
          id?: string
          percentual?: number
          por_unidade?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entregador?: string
          id?: string
          percentual?: number
          por_unidade?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      deliverers: {
        Row: {
          ativo: boolean
          created_at: string
          documento: string | null
          id: string
          nome: string
          observacoes: string | null
          telefone: string
          tipo: Database["public"]["Enums"]["deliverer_kind"]
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          documento?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          telefone?: string
          tipo?: Database["public"]["Enums"]["deliverer_kind"]
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          documento?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          telefone?: string
          tipo?: Database["public"]["Enums"]["deliverer_kind"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      expense_categories: {
        Row: {
          cor: string
          created_at: string
          id: string
          nome: string
          user_id: string
        }
        Insert: {
          cor?: string
          created_at?: string
          id?: string
          nome: string
          user_id: string
        }
        Update: {
          cor?: string
          created_at?: string
          id?: string
          nome?: string
          user_id?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          cash_register_id: string | null
          categoria: string
          category_id: string | null
          created_at: string
          data: string
          descricao: string
          forma: string
          id: string
          legacy_id: string | null
          observacoes: string | null
          status: Database["public"]["Enums"]["expense_status"]
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          cash_register_id?: string | null
          categoria?: string
          category_id?: string | null
          created_at?: string
          data?: string
          descricao?: string
          forma?: string
          id?: string
          legacy_id?: string | null
          observacoes?: string | null
          status?: Database["public"]["Enums"]["expense_status"]
          updated_at?: string
          user_id: string
          valor?: number
        }
        Update: {
          cash_register_id?: string | null
          categoria?: string
          category_id?: string | null
          created_at?: string
          data?: string
          descricao?: string
          forma?: string
          id?: string
          legacy_id?: string | null
          observacoes?: string | null
          status?: Database["public"]["Enums"]["expense_status"]
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "expenses_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          modo: string
          nome: string
          order_id: string
          preco_unit: number
          product_id: string | null
          qtd: number
          retornavel: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          modo?: string
          nome?: string
          order_id: string
          preco_unit?: number
          product_id?: string | null
          qtd?: number
          retornavel?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          modo?: string
          nome?: string
          order_id?: string
          preco_unit?: number
          product_id?: string | null
          qtd?: number
          retornavel?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_payments: {
        Row: {
          created_at: string
          forma: Database["public"]["Enums"]["payment_method"]
          id: string
          order_id: string
          user_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          forma: Database["public"]["Enums"]["payment_method"]
          id?: string
          order_id: string
          user_id: string
          valor?: number
        }
        Update: {
          created_at?: string
          forma?: Database["public"]["Enums"]["payment_method"]
          id?: string
          order_id?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          bairro: string
          cash_register_id: string | null
          client_id: string | null
          cliente_nome: string
          created_at: string
          desconto: number
          endereco: string
          entregador: string
          forma_baixa: Database["public"]["Enums"]["payment_method"] | null
          id: string
          legacy_id: string | null
          motivo_cancelamento: string | null
          numero: number
          obs_cancelamento: string | null
          observacao: string | null
          pagamento: Database["public"]["Enums"]["payment_method"]
          pago: boolean
          pago_em: string | null
          status: Database["public"]["Enums"]["order_status"]
          telefone: string
          total: number
          troco_para: number | null
          updated_at: string
          user_id: string
          vales_credito: number
          vales_resgatados: number
          valor_fiado: number
          vazios_recolhidos: number
        }
        Insert: {
          bairro?: string
          cash_register_id?: string | null
          client_id?: string | null
          cliente_nome?: string
          created_at?: string
          desconto?: number
          endereco?: string
          entregador?: string
          forma_baixa?: Database["public"]["Enums"]["payment_method"] | null
          id?: string
          legacy_id?: string | null
          motivo_cancelamento?: string | null
          numero: number
          obs_cancelamento?: string | null
          observacao?: string | null
          pagamento?: Database["public"]["Enums"]["payment_method"]
          pago?: boolean
          pago_em?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          telefone?: string
          total?: number
          troco_para?: number | null
          updated_at?: string
          user_id: string
          vales_credito?: number
          vales_resgatados?: number
          valor_fiado?: number
          vazios_recolhidos?: number
        }
        Update: {
          bairro?: string
          cash_register_id?: string | null
          client_id?: string | null
          cliente_nome?: string
          created_at?: string
          desconto?: number
          endereco?: string
          entregador?: string
          forma_baixa?: Database["public"]["Enums"]["payment_method"] | null
          id?: string
          legacy_id?: string | null
          motivo_cancelamento?: string | null
          numero?: number
          obs_cancelamento?: string | null
          observacao?: string | null
          pagamento?: Database["public"]["Enums"]["payment_method"]
          pago?: boolean
          pago_em?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          telefone?: string
          total?: number
          troco_para?: number | null
          updated_at?: string
          user_id?: string
          vales_credito?: number
          vales_resgatados?: number
          valor_fiado?: number
          vazios_recolhidos?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          taxa: number
          tipo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          taxa?: number
          tipo?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          taxa?: number
          tipo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      product_brands: {
        Row: {
          created_at: string
          id: string
          nome: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          created_at: string
          id: string
          nome: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      product_units: {
        Row: {
          created_at: string
          id: string
          nome: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          categoria: string
          created_at: string
          custo_casco: number
          custo_envase: number
          desconto_completa: number
          estoque_cheio: number
          estoque_minimo: number
          estoque_vazio: number
          id: string
          imagem_url: string | null
          legacy_id: string | null
          marca: string | null
          margem_desejada: number
          nome: string
          patrimonio_cascos: number
          preco_custo: number
          preco_custo_fardo: number
          preco_fardo: number
          preco_venda: number
          preco_venda_casco: number
          promo_preco: number
          promo_qtd: number
          retornavel: boolean
          unidade: string | null
          unidades_por_fardo: number
          updated_at: string
          user_id: string
        }
        Insert: {
          categoria: string
          created_at?: string
          custo_casco?: number
          custo_envase?: number
          desconto_completa?: number
          estoque_cheio?: number
          estoque_minimo?: number
          estoque_vazio?: number
          id?: string
          imagem_url?: string | null
          legacy_id?: string | null
          marca?: string | null
          margem_desejada?: number
          nome: string
          patrimonio_cascos?: number
          preco_custo?: number
          preco_custo_fardo?: number
          preco_fardo?: number
          preco_venda?: number
          preco_venda_casco?: number
          promo_preco?: number
          promo_qtd?: number
          retornavel?: boolean
          unidade?: string | null
          unidades_por_fardo?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          categoria?: string
          created_at?: string
          custo_casco?: number
          custo_envase?: number
          desconto_completa?: number
          estoque_cheio?: number
          estoque_minimo?: number
          estoque_vazio?: number
          id?: string
          imagem_url?: string | null
          legacy_id?: string | null
          marca?: string | null
          margem_desejada?: number
          nome?: string
          patrimonio_cascos?: number
          preco_custo?: number
          preco_custo_fardo?: number
          preco_fardo?: number
          preco_venda?: number
          preco_venda_casco?: number
          promo_preco?: number
          promo_qtd?: number
          retornavel?: boolean
          unidade?: string | null
          unidades_por_fardo?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          nome: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      returnable_movements: {
        Row: {
          client_id: string | null
          created_at: string
          delta_cheio: number
          delta_patrimonio: number
          delta_vazio: number
          id: string
          motivo: string | null
          observacao: string | null
          order_id: string | null
          product_id: string | null
          qtd: number
          tipo: Database["public"]["Enums"]["returnable_movement_type"]
          user_id: string
          usuario: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          delta_cheio?: number
          delta_patrimonio?: number
          delta_vazio?: number
          id?: string
          motivo?: string | null
          observacao?: string | null
          order_id?: string | null
          product_id?: string | null
          qtd?: number
          tipo: Database["public"]["Enums"]["returnable_movement_type"]
          user_id: string
          usuario?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          delta_cheio?: number
          delta_patrimonio?: number
          delta_vazio?: number
          id?: string
          motivo?: string | null
          observacao?: string | null
          order_id?: string | null
          product_id?: string | null
          qtd?: number
          tipo?: Database["public"]["Enums"]["returnable_movement_type"]
          user_id?: string
          usuario?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "returnable_movements_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returnable_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returnable_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "gerente" | "entregador"
      cash_movement_type: "sangria" | "suprimento" | "recebimento"
      deliverer_kind: "entregador" | "auxiliar"
      expense_status: "Pago" | "Pendente"
      order_status: "pendente" | "em-rota" | "concluido" | "cancelado"
      payment_method:
        | "PIX"
        | "Dinheiro"
        | "Débito"
        | "Crédito"
        | "Fiado"
        | "Vale"
      returnable_movement_type:
        | "recolhido"
        | "envasado"
        | "entrada"
        | "compra"
        | "avaria_cheio"
        | "avaria_vazio"
        | "retorno_sem_envase"
        | "venda_casco"
        | "venda_completa"
        | "devolucao_cliente"
        | "estorno"
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
      app_role: ["admin", "gerente", "entregador"],
      cash_movement_type: ["sangria", "suprimento", "recebimento"],
      deliverer_kind: ["entregador", "auxiliar"],
      expense_status: ["Pago", "Pendente"],
      order_status: ["pendente", "em-rota", "concluido", "cancelado"],
      payment_method: ["PIX", "Dinheiro", "Débito", "Crédito", "Fiado", "Vale"],
      returnable_movement_type: [
        "recolhido",
        "envasado",
        "entrada",
        "compra",
        "avaria_cheio",
        "avaria_vazio",
        "retorno_sem_envase",
        "venda_casco",
        "venda_completa",
        "devolucao_cliente",
        "estorno",
      ],
    },
  },
} as const
