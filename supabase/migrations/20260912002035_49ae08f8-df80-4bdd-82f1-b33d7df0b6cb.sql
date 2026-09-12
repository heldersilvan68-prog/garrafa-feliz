CREATE INDEX IF NOT EXISTS idx_orders_user_created
  ON public.orders (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_user_status_created
  ON public.orders (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_clients_user_code
  ON public.clients (user_id, code);

CREATE INDEX IF NOT EXISTS idx_clients_user_created
  ON public.clients (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_expenses_user_date
  ON public.expenses (user_id, data DESC);

CREATE INDEX IF NOT EXISTS idx_cash_registers_user_opened
  ON public.cash_registers (user_id, aberto_em DESC);

CREATE INDEX IF NOT EXISTS idx_returnable_movements_user_created
  ON public.returnable_movements (user_id, created_at DESC);