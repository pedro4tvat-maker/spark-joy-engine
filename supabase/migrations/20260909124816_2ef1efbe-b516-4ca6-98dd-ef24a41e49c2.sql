CREATE TABLE public.activity_pendencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  description text NOT NULL,
  responsible text,
  due_date date,
  severity text NOT NULL DEFAULT 'media' CHECK (severity IN ('baixa','media','alta')),
  status text NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta','resolvida')),
  resolved_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_pendencies_activity ON public.activity_pendencies(activity_id);
CREATE INDEX idx_activity_pendencies_status ON public.activity_pendencies(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_pendencies TO authenticated;
GRANT ALL ON public.activity_pendencies TO service_role;

ALTER TABLE public.activity_pendencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pendencies visible with activity access"
ON public.activity_pendencies FOR SELECT TO authenticated
USING (public.can_see_activity(activity_id, auth.uid()));

CREATE POLICY "Authenticated can create pendencies"
ON public.activity_pendencies FOR INSERT TO authenticated
WITH CHECK (public.can_see_activity(activity_id, auth.uid()));

CREATE POLICY "Authenticated can update pendencies"
ON public.activity_pendencies FOR UPDATE TO authenticated
USING (public.can_see_activity(activity_id, auth.uid()))
WITH CHECK (public.can_see_activity(activity_id, auth.uid()));

CREATE POLICY "Managers can delete pendencies"
ON public.activity_pendencies FOR DELETE TO authenticated
USING (public.is_manager(auth.uid()) OR public.is_admin(auth.uid()));

CREATE TRIGGER update_activity_pendencies_updated_at
BEFORE UPDATE ON public.activity_pendencies
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();