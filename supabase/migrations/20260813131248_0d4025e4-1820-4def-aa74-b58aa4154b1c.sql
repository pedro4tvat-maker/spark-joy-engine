CREATE TABLE public.activity_finance (
  activity_id uuid PRIMARY KEY REFERENCES public.activities(id) ON DELETE CASCADE,
  amount_sold numeric NOT NULL DEFAULT 0,
  amount_received numeric NOT NULL DEFAULT 0,
  amount_pix numeric NOT NULL DEFAULT 0,
  amount_cash numeric NOT NULL DEFAULT 0,
  amount_card numeric NOT NULL DEFAULT 0,
  service_count integer NOT NULL DEFAULT 0,
  sales_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_finance TO authenticated;
GRANT ALL ON public.activity_finance TO service_role;

ALTER TABLE public.activity_finance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_finance_select" ON public.activity_finance
  FOR SELECT TO authenticated USING (public.is_manager(auth.uid()));
CREATE POLICY "activity_finance_write" ON public.activity_finance
  FOR ALL TO authenticated USING (public.is_manager(auth.uid())) WITH CHECK (public.is_manager(auth.uid()));

CREATE TRIGGER trg_activity_finance_updated BEFORE UPDATE ON public.activity_finance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.activity_finance (activity_id, amount_sold, amount_received, amount_pix, amount_cash, amount_card, service_count, sales_count)
SELECT id,
  COALESCE(amount_sold,0), COALESCE(amount_received,0), COALESCE(amount_pix,0),
  COALESCE(amount_cash,0), COALESCE(amount_card,0), COALESCE(service_count,0), COALESCE(sales_count,0)
FROM public.activities;

ALTER TABLE public.activities
  DROP COLUMN amount_sold,
  DROP COLUMN amount_received,
  DROP COLUMN amount_pix,
  DROP COLUMN amount_cash,
  DROP COLUMN amount_card,
  DROP COLUMN service_count,
  DROP COLUMN sales_count;

DROP POLICY IF EXISTS "delivery_items_select" ON public.delivery_items;
DROP POLICY IF EXISTS "delivery_items_write" ON public.delivery_items;
CREATE POLICY "delivery_items_select" ON public.delivery_items
  FOR SELECT TO authenticated USING (public.is_manager(auth.uid()));
CREATE POLICY "delivery_items_write" ON public.delivery_items
  FOR ALL TO authenticated USING (public.is_manager(auth.uid())) WITH CHECK (public.is_manager(auth.uid()));

DROP POLICY IF EXISTS "cities_manage" ON public.cities;
CREATE POLICY "cities_manage" ON public.cities FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "schools_manage" ON public.schools;
CREATE POLICY "schools_manage" ON public.schools FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "employees_manage" ON public.employees;
CREATE POLICY "employees_manage" ON public.employees FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "vehicles_manage" ON public.vehicles;
CREATE POLICY "vehicles_manage" ON public.vehicles FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "labs_manage" ON public.labs;
CREATE POLICY "labs_manage" ON public.labs FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "partners_manage" ON public.partners;
CREATE POLICY "partners_manage" ON public.partners FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "lens_types_manage" ON public.lens_types;
CREATE POLICY "lens_types_manage" ON public.lens_types FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "user_roles_admin_write" ON public.user_roles
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
GRANT INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;