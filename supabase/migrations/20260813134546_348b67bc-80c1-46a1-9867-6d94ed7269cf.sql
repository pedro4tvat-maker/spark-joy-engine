CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  permission text NOT NULL,
  allowed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role, permission)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados leem permissoes"
ON public.role_permissions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins gerenciam permissoes"
ON public.role_permissions FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_role_permissions_updated
BEFORE UPDATE ON public.role_permissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.role_permissions (role, permission, allowed)
SELECT r.role, p.permission,
  CASE
    WHEN r.role = 'administrador' THEN true
    WHEN r.role = 'coordenador' THEN p.permission <> 'gerenciar_usuarios'
    WHEN r.role = 'financeiro' THEN p.permission IN ('ver_financeiro','lancar_financeiro','ver_todas_atividades','ver_cadastros')
    ELSE p.permission IN ('ver_cadastros','editar_cadastros')
  END
FROM (SELECT unnest(enum_range(NULL::app_role)) AS role) r
CROSS JOIN (VALUES
  ('ver_todas_atividades'),
  ('criar_atividades'),
  ('editar_atividades'),
  ('ver_financeiro'),
  ('lancar_financeiro'),
  ('ver_cadastros'),
  ('editar_cadastros'),
  ('gerenciar_listas'),
  ('gerenciar_usuarios')
) AS p(permission);