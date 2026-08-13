CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  os_number text NOT NULL,
  student_name text,
  total_amount numeric NOT NULL DEFAULT 0,
  cash_amount numeric NOT NULL DEFAULT 0,
  pix_amount numeric NOT NULL DEFAULT 0,
  card_amount numeric NOT NULL DEFAULT 0,
  credit_amount numeric NOT NULL DEFAULT 0,
  installments_label text,
  is_courtesy boolean NOT NULL DEFAULT false,
  mother_os text,
  notes text,
  needs_review boolean NOT NULL DEFAULT false,
  review_reason text,
  imported_at timestamptz NOT NULL DEFAULT now(),
  imported_by uuid REFERENCES auth.users(id),
  CONSTRAINT sales_os_number_key UNIQUE (os_number)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales TO authenticated;
GRANT ALL ON public.sales TO service_role;

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can view sales" ON public.sales
  FOR SELECT TO authenticated USING (public.is_manager(auth.uid()));

CREATE POLICY "Managers can manage sales" ON public.sales
  FOR ALL TO authenticated USING (public.is_manager(auth.uid())) WITH CHECK (public.is_manager(auth.uid()));

CREATE INDEX idx_sales_activity_id ON public.sales(activity_id);
CREATE INDEX idx_sales_os_number ON public.sales(os_number);

ALTER TABLE public.activity_finance
  ADD COLUMN IF NOT EXISTS amount_credit numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS courtesy_count integer NOT NULL DEFAULT 0;