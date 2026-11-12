// =====================================================================
// Forma exacta de la base (generado desde Supabase)
// ---------------------------------------------------------------------
// No se edita a mano: se vuelve a generar cada vez que cambia la base (Supabase →
// generate_typescript_types). remoteStore.ts lo usa para verificar, antes de publicar, que
// las columnas que lee y guarda la app existan y que ninguna columna nueva quede sin guardar.
// =====================================================================

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      account_versions: {
        Row: {
          updated_at: string;
          user_id: string;
          version: number;
        };
      };
      charges: {
        Row: {
          amount: number;
          auto_generated: boolean;
          concept: string;
          confirmed: boolean;
          contract_id: string;
          created_at: string;
          currency: string;
          due_date: string;
          id: string;
          notes: string | null;
          period: string;
          user_id: string;
          voided: boolean;
        };
      };
      contracts: {
        Row: {
          adjustment_index: string | null;
          adjustment_months: number | null;
          adjustment_percent: number | null;
          billing_start_period: string | null;
          created_at: string;
          currency: string;
          deposit_amount: number | null;
          end_date: string;
          id: string;
          last_adjusted_period: string | null;
          notes: string | null;
          payment_day: number;
          property_id: string;
          rent_amount: number;
          start_date: string;
          status: string;
          tenant_id: string;
          user_id: string;
        };
      };
      exchange_rates: {
        Row: {
          buy: number;
          date: string;
          fetched_at: string;
          sell: number;
          source: string;
        };
      };
      payment_allocations: {
        Row: {
          amount: number;
          charge_id: string;
          id: string;
          payment_id: string;
          user_id: string;
        };
      };
      payments: {
        Row: {
          amount: number;
          concept: string;
          contract_id: string;
          created_at: string;
          currency: string;
          date: string;
          exchange_rate: number | null;
          id: string;
          method: string | null;
          notes: string | null;
          paid_amount: number | null;
          paid_currency: string | null;
          rate_source: string | null;
          receipt_id: string | null;
          user_id: string;
        };
      };
      price_indices: {
        Row: {
          date: string;
          index: string;
          value: number;
        };
      };
      properties: {
        Row: {
          address: string;
          area: number | null;
          bathrooms: number | null;
          created_at: string;
          expensas_amount: number | null;
          id: string;
          neighborhood: string | null;
          notes: string | null;
          rent_amount: number | null;
          rent_currency: string;
          rooms: number | null;
          servicios_amount: number | null;
          status: string;
          title: string;
          type: string;
          user_id: string;
        };
      };
      settings: {
        Row: {
          manual_rate: number | null;
          rate_source: string;
          updated_at: string;
          user_id: string;
        };
      };
      tenants: {
        Row: {
          created_at: string;
          document: string | null;
          email: string | null;
          id: string;
          name: string;
          notes: string | null;
          phone: string | null;
          user_id: string;
        };
      };
    };
    Functions: {
      index_value_at: { Args: { at_date: string; idx: string }; Returns: number };
      keepalive: { Args: never; Returns: string };
      period_day: { Args: { day: number; period: string }; Returns: string };
      period_start: { Args: { period: string }; Returns: string };
      run_monthly_billing: { Args: never; Returns: undefined };
    };
  };
};
